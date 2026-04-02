import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Upload from '../models/Upload.js';
import Analytics from '../models/Analytics.js';

const router = express.Router();

// Get platform statistics
import ChartAnalytics from '../models/ChartAnalytics.js'; // Import at top of your router file

router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    // User statistics
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ isBlocked: false });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    // Upload statistics
    const totalUploads = await Upload.countDocuments();
    const totalSizeResult = await Upload.aggregate([
      { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
    ]);
    const totalSize = totalSizeResult[0]?.totalSize || 0;

    // Recent uploads with user populated
    const recentUploadsRaw = await Upload.find()
      .populate('user', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    // Optional: enrich recent uploads with their chart analytics data
    const recentUploads = await Promise.all(
      recentUploadsRaw.map(async (upload) => {
        try {
          const chartAnalytics = await ChartAnalytics.find({ upload: upload._id });
          return {
            ...upload.toObject(),
            chartConfigs: chartAnalytics,
          };
        } catch {
          return { ...upload.toObject(), chartConfigs: [] };
        }
      })
    );

    // Aggregate chart types and total charts from ChartAnalytics collection (all uploads)
    const chartTypeAggregation = await ChartAnalytics.aggregate([
      { $group: { _id: "$chartType", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const totalCharts = chartTypeAggregation.reduce((sum, item) => sum + item.count, 0);

    // Add usage percentage to each chart type
    const chartTypes = chartTypeAggregation.map(({ _id, count }) => ({
      _id,
      count,
      percentage: totalCharts > 0 ? Math.round((count / totalCharts) * 100) : 0,
    }));

    // User activity (last 30 days)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const userActivity = await Analytics.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      {
        $group: {
          _id: {
            date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
          },
          uploads: {
            $sum: { $cond: [{ $eq: ['$action', 'upload'] }, 1, 0] }
          },
          charts: {
            $sum: { $cond: [{ $eq: ['$action', 'chart_create'] }, 1, 0] }
          }
        }
      },
      { $sort: { '_id.date': 1 } }
    ]);

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        blocked: totalUsers - activeUsers
      },
      uploads: {
        total: totalUploads,
        totalSize: totalSize
      },
      recentUploads,
      totalCharts,
      chartTypes,
      userActivity
    });

  } catch (error) {
    console.error('Get admin stats error:', error);
    res.status(500).json({ message: 'Failed to fetch admin statistics' });
  }
});


// Get all users
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await User.countDocuments();

    // Get upload counts for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const uploadCount = await Upload.countDocuments({ user: user._id });
        return {
          ...user.toObject(),
          uploadCount
        };
      })
    );

    res.json({
      users: usersWithStats,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Block/unblock user
router.patch('/users/:id/block', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { isBlocked } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot block admin users' });
    }

    user.isBlocked = isBlocked;
    await user.save();

    res.json({
      message: `User ${isBlocked ? 'blocked' : 'unblocked'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isBlocked: user.isBlocked
      }
    });
  } catch (error) {
    console.error('Block user error:', error);
    res.status(500).json({ message: 'Failed to update user status' });
  }
});

// Delete user
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin users' });
    }

    // Delete user's uploads and analytics
    await Upload.deleteMany({ user: id });
    await Analytics.deleteMany({ user: id });
    await User.findByIdAndDelete(id);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});



export default router;