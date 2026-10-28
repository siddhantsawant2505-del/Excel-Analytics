import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import Upload from '../models/Upload.js';
import Analytics from '../models/Analytics.js';
import ChartAnalytics from '../models/ChartAnalytics.js';

const router = express.Router();
const UPLOAD_DIR = path.resolve('uploads');

// Ensure upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const sanitizedExt = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, `excel-${uniqueSuffix}${sanitizedExt || '.xlsx'}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/octet-stream' // sometimes sent by some browsers for xlsx
  ];
  const allowedExts = ['.xls', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedExts.includes(ext) || allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type: Only Excel spreadsheets (.xls, .xlsx) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helper: Safely parse Excel file
const parseExcelData = (filePath) => {
  const workbook = xlsx.readFile(filePath);
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('Spreadsheet contains no sheets');
  }

  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  if (!jsonData || jsonData.length === 0) {
    throw new Error('Spreadsheet is empty');
  }

  // Extract headers and data
  const headers = (jsonData[0] || []).map((h, i) => String(h || `Column_${i + 1}`).trim());
  const rows = jsonData.slice(1);

  // Analyze columns
  const columns = headers.map((header, index) => {
    const columnData = rows
      .map(row => row[index])
      .filter(val => val !== undefined && val !== null && val !== '');
    const sampleData = columnData.slice(0, 5);

    let type = 'text';
    if (columnData.length > 0) {
      const numericCount = columnData.filter(v => typeof v === 'number' || (!isNaN(v) && !isNaN(parseFloat(v)))).length;
      if (numericCount / columnData.length > 0.8) {
        type = 'number';
      } else {
        const dateCount = columnData.filter(v => !isNaN(Date.parse(v))).length;
        if (dateCount / columnData.length > 0.8) {
          type = 'date';
        }
      }
    }

    return {
      name: header,
      type,
      sampleData
    };
  });

  return {
    headers,
    rows,
    columns,
    totalRows: rows.length,
    totalColumns: headers.length
  };
};

// Upload file endpoint
router.post('/', authenticate, (req, res) => {
  upload.single('file')(req, res, async (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ message: 'File is too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ message: err.message });
    } else if (err) {
      return res.status(400).json({ message: err.message });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const filePath = req.file.path;

    try {
      const sheetData = parseExcelData(filePath);

      const uploadRecord = new Upload({
        user: req.user._id,
        fileName: req.file.filename,
        originalName: req.file.originalname,
        filePath,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        sheetData,
        columns: sheetData.columns
      });

      await uploadRecord.save();

      // Log analytics
      await Analytics.create({
        user: req.user._id,
        upload: uploadRecord._id,
        action: 'upload',
        details: {
          fileName: req.file.originalname,
          fileSize: req.file.size,
          rowCount: sheetData.totalRows,
          columnCount: sheetData.totalColumns
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      res.status(201).json({
        message: 'File uploaded successfully',
        upload: {
          id: uploadRecord._id,
          fileName: uploadRecord.originalName,
          columns: uploadRecord.columns,
          totalRows: sheetData.totalRows,
          totalColumns: sheetData.totalColumns,
          createdAt: uploadRecord.createdAt
        }
      });
    } catch (parseError) {
      // Clean up file if parsing or saving failed
      if (fs.existsSync(filePath)) {
        try {
          fs.unlinkSync(filePath);
        } catch (unlinkErr) {
          console.error('Failed to unlink failed upload:', unlinkErr);
        }
      }
      console.error('Excel processing error:', parseError);
      res.status(400).json({ message: parseError.message || 'Failed to parse Excel file' });
    }
  });
});

// Get user upload history
router.get('/history', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 10));
    const skip = (page - 1) * limit;

    const uploads = await Upload.find({ user: req.user._id })
      .select('-sheetData')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Upload.countDocuments({ user: req.user._id });

    res.json({
      uploads,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit) || 1,
        total
      }
    });
  } catch (error) {
    console.error('Get uploads error:', error);
    res.status(500).json({ message: 'Failed to fetch uploads' });
  }
});

// Get specific upload data
router.get('/:id', authenticate, async (req, res) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found or access denied' });
    }

    res.json(upload);
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({ message: 'Failed to fetch upload data' });
  }
});

// Secure download endpoint (replaces insecure public /uploads static directory)
router.get('/:id/download', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };

    const upload = await Upload.findOne(query);
    if (!upload) {
      return res.status(404).json({ message: 'Upload not found or access denied' });
    }

    // Path verification to prevent traversal
    const safePath = path.resolve(upload.filePath);
    if (!safePath.startsWith(UPLOAD_DIR) || !fs.existsSync(safePath)) {
      return res.status(404).json({ message: 'Stored file not found on disk' });
    }

    // Increment downloads count and log analytics
    await Upload.updateOne({ _id: upload._id }, { $inc: { downloads: 1 } });
    await Analytics.create({
      user: req.user._id,
      upload: upload._id,
      action: 'download',
      details: { fileName: upload.originalName },
      ipAddress: req.ip,
      userAgent: req.get('User-Agent')
    });

    res.download(safePath, upload.originalName);
  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ message: 'Failed to download file' });
  }
});

// Delete upload and all cascades (file, analytics, chart-analytics)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const query = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, user: req.user._id };

    const upload = await Upload.findOne(query);
    if (!upload) {
      return res.status(404).json({ message: 'Upload not found or access denied' });
    }

    // Safely remove file from filesystem if it exists
    if (upload.filePath) {
      const safePath = path.resolve(upload.filePath);
      if (safePath.startsWith(UPLOAD_DIR) && fs.existsSync(safePath)) {
        try {
          fs.unlinkSync(safePath);
        } catch (unlinkErr) {
          console.error('Error deleting file from disk:', unlinkErr);
        }
      }
    }

    // Cascade delete DB records
    await Upload.findByIdAndDelete(upload._id);
    await Analytics.deleteMany({ upload: upload._id });
    await ChartAnalytics.deleteMany({ upload: upload._id });

    res.json({ message: 'Upload and associated analytics deleted successfully' });
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({ message: 'Failed to delete upload' });
  }
});

export default router;
