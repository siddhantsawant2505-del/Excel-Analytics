import mongoose from 'mongoose';

const columnSchema = new mongoose.Schema({
  name: { type: String, required: true },
  type: { type: String, required: true }, // e.g. 'text', 'number', 'date'
  sampleData: [mongoose.Schema.Types.Mixed]
}, { _id: false });

const chartConfigSchema = new mongoose.Schema({
  chartType: { type: String, required: true },
  xAxis: { type: String, required: true },
  yAxis: { type: String, required: true },
  title: { type: String, required: true },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const uploadSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  sheetData: {
    type: mongoose.Schema.Types.Mixed, // or define this strictly later
    required: true
  },
  columns: [columnSchema], // ✅ Structured columns
  chartConfigs: [chartConfigSchema],
  downloads: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

export default mongoose.model('Upload', uploadSchema);
