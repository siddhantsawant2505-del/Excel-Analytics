import ChartAnalytics from '../models/ChartAnalytics.js';

export const saveChartAnalytics = async (req, res) => {
  try {
    const { uploadId, chartType, chartData, insights } = req.body;

    if (!uploadId || !chartType || !chartData) {
      return res.status(400).json({ message: 'Missing required fields' });
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

    const chartAnalytics = await ChartAnalytics.find({ upload: uploadId });

    res.status(200).json(chartAnalytics);
  } catch (error) {
    console.error('Error fetching chart analytics:', error);
    res.status(500).json({ message: 'Failed to fetch chart analytics' });
  }
};
