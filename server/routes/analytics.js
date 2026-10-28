import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Upload from '../models/Upload.js';
import Analytics from '../models/Analytics.js';
import ChartAnalytics from '../models/ChartAnalytics.js';

const router = express.Router();

// Save chart configuration to upload
router.post('/chart/:uploadId', authenticate, async (req, res) => {
  try {
    const { chartType, xAxis, yAxis, title } = req.body;
    const { uploadId } = req.params;

    if (!chartType || !xAxis || !yAxis) {
      return res.status(400).json({ message: 'Missing required chart configuration fields' });
    }

    const upload = await Upload.findOne({
      _id: uploadId,
      user: req.user._id
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found or access denied' });
    }

    upload.chartConfigs.push({
      chartType,
      xAxis,
      yAxis,
      title: title || `${chartType} Chart`,
      createdAt: new Date()
    });

    await upload.save();

    // Log analytics
    await Analytics.create({
      user: req.user._id,
      upload: uploadId,
      action: 'chart_create',
      details: {
        chartType,
        xAxis,
        yAxis,
        title
      },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.json({ message: 'Chart configuration saved successfully' });
  } catch (error) {
    console.error('Save chart error:', error);
    res.status(500).json({ message: 'Failed to save chart configuration' });
  }
});

// Get chart data
router.get('/chart-data/:uploadId', authenticate, async (req, res) => {
  try {
    const { xAxis, yAxis } = req.query;
    const { uploadId } = req.params;

    if (!xAxis || !yAxis) {
      return res.status(400).json({ message: 'Both xAxis and yAxis parameters are required' });
    }

    const upload = await Upload.findOne({
      _id: uploadId,
      user: req.user._id
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found or access denied' });
    }

    const { headers, rows } = upload.sheetData || {};
    if (!headers || !rows) {
      return res.status(400).json({ message: 'Spreadsheet data is missing or corrupted' });
    }

    const xIndex = headers.indexOf(xAxis);
    const yIndex = headers.indexOf(yAxis);

    if (xIndex === -1 || yIndex === -1) {
      return res.status(400).json({ message: 'Selected axis columns do not exist in the spreadsheet' });
    }

    // Extract and process numeric data points
    const chartData = rows
      .filter(row => row && row[xIndex] !== undefined && row[yIndex] !== undefined)
      .map(row => ({
        x: String(row[xIndex]),
        y: parseFloat(row[yIndex]) || 0
      }))
      .filter(point => !isNaN(point.y));

    res.json({
      labels: chartData.map(point => point.x),
      data: chartData.map(point => point.y),
      xAxisLabel: xAxis,
      yAxisLabel: yAxis
    });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ message: 'Failed to fetch chart data' });
  }
});

// Get user dashboard stats
router.get('/dashboard/stats', authenticate, async (req, res) => {
  try {
    const userId = req.user._id;

    // Run statistical queries in parallel for high performance
    const [totalUploads, recentUploadsRaw, totalDownloads, activityData] = await Promise.all([
      Upload.countDocuments({ user: userId }),
      Upload.find({ user: userId })
        .select('originalName createdAt')
        .sort({ createdAt: -1 })
        .limit(5),
      Analytics.countDocuments({
        user: userId,
        action: { $in: ['download', 'chart_download'] }
      }),
      Analytics.aggregate([
        {
          $match: {
            user: userId,
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
          }
        },
        {
          $group: {
            _id: { date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id.date': 1 } }
      ])
    ]);

    const recentUploadIds = recentUploadsRaw.map(u => u._id);

    // Enrich recent uploads with their charts
    const [recentUploads, chartTypeAggregation] = await Promise.all([
      Promise.all(
        recentUploadsRaw.map(async (upload) => {
          const chartAnalytics = await ChartAnalytics.find({ upload: upload._id });
          return {
            ...upload.toObject(),
            chartConfigs: chartAnalytics
          };
        })
      ),
      ChartAnalytics.aggregate([
        { $match: { upload: { $in: recentUploadIds } } },
        { $group: { _id: '$chartType', count: { $sum: 1 } } }
      ])
    ]);

    const totalCharts = chartTypeAggregation.reduce((sum, item) => sum + item.count, 0);

    const chartTypes = chartTypeAggregation.map(({ _id, count }) => ({
      _id,
      count,
      percentage: totalCharts > 0 ? Math.round((count / totalCharts) * 100) : 0
    }));

    res.json({
      totalUploads,
      totalCharts,
      totalDownloads,
      recentUploads,
      chartTypes,
      activityData
    });
  } catch (error) {
    console.error('Get dashboard stats error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard stats' });
  }
});

// Get user reports with chart configs
router.get('/reports', authenticate, async (req, res) => {
  try {
    const uploads = await Upload.find({ user: req.user._id }).sort({ createdAt: -1 });

    const enrichedReports = uploads.map((upload) => {
      const { headers = [], rows = [] } = upload.sheetData || {};

      const enrichedChartConfigs = (upload.chartConfigs || []).map((chart) => {
        const xIndex = headers.indexOf(chart.xAxis);
        const yIndex = headers.indexOf(chart.yAxis);

        if (xIndex === -1 || yIndex === -1) {
          return {
            ...chart.toObject(),
            labels: [],
            data: [],
            xLabel: chart.xAxis,
            yLabel: chart.yAxis
          };
        }

        const chartData = rows
          .filter(row => row && row[xIndex] !== undefined && row[yIndex] !== undefined)
          .map(row => ({
            x: String(row[xIndex]),
            y: parseFloat(row[yIndex]) || 0
          }))
          .filter(point => !isNaN(point.y));

        return {
          ...chart.toObject(),
          labels: chartData.map(p => p.x),
          data: chartData.map(p => p.y),
          xLabel: chart.xAxis,
          yLabel: chart.yAxis
        };
      });

      return {
        ...upload.toObject(),
        chartConfigs: enrichedChartConfigs
      };
    });

    res.json(enrichedReports);
  } catch (error) {
    console.error('Failed to fetch reports:', error);
    res.status(500).json({ message: 'Failed to fetch reports' });
  }
});

// Securely log user analytics (Requires authentication; never trust client userId)
router.post('/log', authenticate, async (req, res) => {
  try {
    const { uploadId, action, details } = req.body;

    if (!action) {
      return res.status(400).json({ error: 'Action parameter is required' });
    }

    const analytics = new Analytics({
      user: req.user._id, // Enforce authenticated user ID
      upload: uploadId || null,
      action,
      details: details || {},
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    await analytics.save();
    res.status(201).json({ message: 'Analytics logged successfully' });
  } catch (err) {
    console.error('Error logging analytics:', err);
    res.status(500).json({ error: 'Failed to log analytics' });
  }
});

export default router;
