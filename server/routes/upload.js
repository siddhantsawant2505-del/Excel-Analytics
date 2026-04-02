import express from 'express';
import multer from 'multer';
import xlsx from 'xlsx';
import path from 'path';
import fs from 'fs';
import { authenticate } from '../middleware/auth.js';
import Upload from '../models/Upload.js';
import Analytics from '../models/Analytics.js';

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];
  
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only Excel files (.xls, .xlsx) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Parse Excel data
const parseExcelData = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert to JSON
    const jsonData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    if (jsonData.length === 0) {
      throw new Error('Empty spreadsheet');
    }

    // Extract headers and data
    const headers = jsonData[0];
    const rows = jsonData.slice(1);
    
    // Analyze columns
    const columns = headers.map((header, index) => {
      const columnData = rows.map(row => row[index]).filter(val => val !== undefined && val !== null);
      const sampleData = columnData.slice(0, 5);
      
      // Determine data type
      let type = 'text';
      if (columnData.length > 0) {
        const firstValue = columnData[0];
        if (typeof firstValue === 'number') {
          type = 'number';
        } else if (!isNaN(Date.parse(firstValue))) {
          type = 'date';
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
  } catch (error) {
    throw new Error(`Failed to parse Excel file: ${error.message}`);
  }
};

// Upload file endpoint
router.post('/', authenticate, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    // Parse the Excel file
    const sheetData = parseExcelData(req.file.path);
    
    // Create upload record
    const uploadRecord = new Upload({
      user: req.user._id,
      fileName: req.file.filename,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      sheetData,
      columns: sheetData.columns
    });

    await uploadRecord.save();

    // Log analytics
    const analytics = new Analytics({
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

    await analytics.save();

    res.json({
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
  } catch (error) {
    // Clean up file if upload failed
    if (req.file) {
      fs.unlink(req.file.path, (err) => {
        if (err) console.error('Error deleting file:', err);
      });
    }
    
    console.error('Upload error:', error);
    res.status(500).json({ message: error.message || 'Upload failed' });
  }
});

// Get user uploads
router.get('/history', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
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
        pages: Math.ceil(total / limit),
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
      return res.status(404).json({ message: 'Upload not found' });
    }

    res.json(upload);
  } catch (error) {
    console.error('Get upload error:', error);
    res.status(500).json({ message: 'Failed to fetch upload data' });
  }
});

// Delete upload
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const upload = await Upload.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    // Delete file from filesystem
    if (fs.existsSync(upload.filePath)) {
      fs.unlinkSync(upload.filePath);
    }

    // Delete from database
    await Upload.findByIdAndDelete(req.params.id);
    await Analytics.deleteMany({ upload: req.params.id });

    res.json({ message: 'Upload deleted successfully' });
  } catch (error) {
    console.error('Delete upload error:', error);
    res.status(500).json({ message: 'Failed to delete upload' });
  }
});

export default router;