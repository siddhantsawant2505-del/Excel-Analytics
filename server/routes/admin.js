import express from 'express';
import path from 'path';
import fs from 'fs';
import { authenticate, authorize } from '../middleware/auth.js';
import User from '../models/User.js';
import Upload from '../models/Upload.js';
import Analytics from '../models/Analytics.js';
import ChartAnalytics from '../models/ChartAnalytics.js';

const router = express.Router();
const UPLOAD_DIR = path.resolve('uploads');

// Get platform statistics
router.get('/stats', authenticate, authorize('admin'), async (req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      adminUsers,
      totalUploads,
      totalSizeResult,
      recentUploadsRaw,
      chartTypeAggregation,
      userActivity
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isBlocked: false }),
      User.countDocuments({ role: 'admin' }),
      Upload.countDocuments(),
      Upload.aggregate([
        { $group: { _id: null, totalSize: { $sum: '$fileSize' } } }
      ]),
      Upload.find()
        .populate('user', 'name email')
        .sort({ createdAt: -1 })
        .limit(10),
      ChartAnalytics.aggregate([
        { $group: { _id: '$chartType', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
      ]),
      Analytics.aggregate([
        {
          $match: {
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
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
      ])
    ]);

    const totalSize = totalSizeResult[0]?.totalSize || 0;

    // Enrich recent uploads with their charts
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

    const totalCharts = chartTypeAggregation.reduce((sum, item) => sum + item.count, 0);

    const chartTypes = chartTypeAggregation.map(({ _id, count }) => ({
      _id,
      count,
      percentage: totalCharts > 0 ? Math.round((count / totalCharts) * 100) : 0,
    }));

    res.json({
      users: {
        total: totalUsers,
        active: activeUsers,
        admins: adminUsers,
        blocked: totalUsers - activeUsers
      },
      uploads: {
        total: totalUploads,
        totalSize
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

// Get all users with pagination
router.get('/users', authenticate, authorize('admin'), async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find()
        .select('-password')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      User.countDocuments()
    ]);

    // Attach upload counts for each user
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
        pages: Math.ceil(total / limit) || 1,
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
      return res.status(400).json({ message: 'Cannot block administrator accounts' });
    }

    user.isBlocked = Boolean(isBlocked);
    await user.save();

    res.json({
      message: `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully`,
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

// Delete user and cascade delete files, uploads, analytics, and chart analytics
router.delete('/users/:id', authenticate, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete administrator accounts' });
    }

    // Find all uploads by this user to clean up disk storage
    const userUploads = await Upload.find({ user: id }).select('_id filePath');
    const uploadIds = userUploads.map(u => u._id);

    // Delete physical files
    for (const u of userUploads) {
      if (u.filePath) {
        const safePath = path.resolve(u.filePath);
        if (safePath.startsWith(UPLOAD_DIR) && fs.existsSync(safePath)) {
          try {
            fs.unlinkSync(safePath);
          } catch (unlinkErr) {
            console.error('Failed to unlink user upload:', unlinkErr);
          }
        }
      }
    }

    // Cascade DB deletion
    await Promise.all([
      Upload.deleteMany({ user: id }),
      Analytics.deleteMany({ user: id }),
      ChartAnalytics.deleteMany({ upload: { $in: uploadIds } }),
      User.findByIdAndDelete(id)
    ]);

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

export default router;
