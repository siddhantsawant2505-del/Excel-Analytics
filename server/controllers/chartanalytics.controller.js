import ChartAnalytics from '../models/ChartAnalytics.js';
import Upload from '../models/Upload.js';

export const saveChartAnalytics = async (req, res) => {
  try {
    const { uploadId, chartType, chartData, insights } = req.body;

    if (!uploadId || !chartType || !chartData) {
      return res.status(400).json({ message: 'Missing required fields: uploadId, chartType, or chartData' });
    }

    // Verify upload exists and is owned by authenticated user
    const upload = await Upload.findOne({
      _id: uploadId,
      ...(req.user.role === 'admin' ? {} : { user: req.user._id })
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found or access denied' });
    }

    const newAnalytics = new ChartAnalytics({
      upload: uploadId,
      chartType,
      chartData,
      insights,
    });

    await newAnalytics.save();
    res.status(201).json({ message: 'Chart analytics saved', data: newAnalytics });
  } catch (error) {
    console.error('Error saving chart analytics:', error);
    res.status(500).json({ message: 'Failed to save chart analytics' });
  }
};

export const getChartAnalyticsByUploadId = async (req, res) => {
  try {
    const { uploadId } = req.params;

    // Verify ownership of the upload before disclosing chart data
    const upload = await Upload.findOne({
      _id: uploadId,
      ...(req.user.role === 'admin' ? {} : { user: req.user._id })
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found or access denied' });
    }

    const chartAnalytics = await ChartAnalytics.find({ upload: uploadId }).sort({ createdAt: -1 });

    res.status(200).json(chartAnalytics);
  } catch (error) {
    console.error('Error fetching chart analytics:', error);
    res.status(500).json({ message: 'Failed to fetch chart analytics' });
  }
};
