import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import { 
  Upload, 
  FileSpreadsheet, 
  X, 
  CheckCircle, 
  AlertCircle,
  Download,
  Eye
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';

const UploadPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  React.useEffect(() => {
    fetchUploadHistory();
  }, []);

  const fetchUploadHistory = async () => {
    try {
      const response = await axios.get('https://excel-analytics-1-4y0b.onrender.com/api/upload/history');
      setUploadHistory(response.data.uploads);
    } catch (error) {
      console.error('Error fetching upload history:', error);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload only Excel files (.xls, .xlsx)');
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axios.post('https://excel-analytics-1-4y0b.onrender.com/api/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadedFile(response.data.upload);
      toast.success('File uploaded successfully!');
      
      // Refresh upload history
      fetchUploadHistory();
    } catch (error) {
      const message = error.response?.data?.message || 'Upload failed';
      toast.error(message);
    } finally {
      setUploading(false);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    maxFiles: 1,
    disabled: uploading
  });

  const handleAnalyze = (uploadId) => {
    navigate(`/analytics/${uploadId}`);
  };

  const handleDelete = async (uploadId) => {
    if (!window.confirm('Are you sure you want to delete this upload?')) {
      return;
    }

    try {
      await axios.delete(`https://excel-analytics-1-4y0b.onrender.com/api/upload/${uploadId}`);
      toast.success('Upload deleted successfully');
      fetchUploadHistory();
      
      // Clear uploaded file if it's the one being deleted
      if (uploadedFile?.id === uploadId) {
        setUploadedFile(null);
      }
    } catch (error) {
      const message = error.response?.data?.message || 'Delete failed';
      toast.error(message);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* Upload Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="card p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Upload Excel File</h2>
          <p className="text-gray-600">
            Upload your Excel file (.xls, .xlsx) to start analyzing your data
          </p>
        </div>

        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`
            dropzone cursor-pointer transition-all duration-300
            ${isDragActive ? 'active' : ''}
            ${isDragReject ? 'reject' : ''}
            ${uploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center justify-center py-12">
            {uploading ? (
              <LoadingSpinner size="lg" text="Uploading and processing file..." />
            ) : (
              <>
                <Upload className="w-16 h-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {isDragActive ? 'Drop your file here' : 'Drag & drop your Excel file'}
                </h3>
                <p className="text-gray-500 mb-4">
                  or <span className="text-primary-600 font-medium">browse files</span>
                </p>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  <span>Supports: .xls, .xlsx</span>
                  <span>•</span>
                  <span>Max size: 10MB</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Upload Success */}
        {uploadedFile && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-900">{uploadedFile.fileName}</p>
                  <p className="text-sm text-green-700">
                    {uploadedFile.totalRows} rows, {uploadedFile.totalColumns} columns
                  </p>
                </div>
              </div>
              <button
                onClick={() => handleAnalyze(uploadedFile.id)}
                className="btn btn-primary btn-sm"
              >
                Analyze Data
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>

      {/* Upload History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="card p-6"
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-gray-900">Upload History</h3>
          <span className="text-sm text-gray-500">
            {uploadHistory.length} file{uploadHistory.length !== 1 ? 's' : ''}
          </span>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="md" text="Loading history..." />
          </div>
        ) : uploadHistory.length > 0 ? (
          <div className="space-y-4">
            {uploadHistory.map((upload, index) => (
              <motion.div
                key={upload._id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                    <FileSpreadsheet className="w-6 h-6 text-primary-600" />
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900 truncate max-w-xs">
                      {upload.originalName}
                    </h4>
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <span>{new Date(upload.createdAt).toLocaleDateString()}</span>
                      <span>•</span>
                      <span>{formatFileSize(upload.fileSize)}</span>
                      <span>•</span>
                      <span>{upload.columns?.length || 0} columns</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  
                  
                  <button
                    onClick={() => handleDelete(upload._id)}
                    className="btn btn-ghost btn-sm text-red-600 hover:bg-red-50"
                    title="Delete"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <FileSpreadsheet className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No uploads yet</h4>
            <p className="text-gray-500 mb-6">
              Upload your first Excel file to start analyzing your data
            </p>
          </div>
        )}
      </motion.div>

      {/* Tips Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="card p-6 bg-blue-50 border-blue-200"
      >
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-blue-900 mb-2">Tips for better results</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ensure your Excel file has clear column headers</li>
              <li>• Remove any merged cells or complex formatting</li>
              <li>• Keep data in a simple table format</li>
              <li>• File size should be under 10MB for optimal performance</li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default UploadPage;