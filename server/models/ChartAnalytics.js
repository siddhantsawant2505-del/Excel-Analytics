import mongoose from 'mongoose';

const chartAnalyticsSchema = new mongoose.Schema({
  upload: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Upload',
    required: true,
  },
  chartType: {
    type: String, // e.g., 'bar', 'line', 'pie'
    required: true,
  },
  chartData: {
    type: Object,
    required: true,
  },
  insights: {
    type: String, // Optional AI-generated insight
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model('ChartAnalytics', chartAnalyticsSchema);
