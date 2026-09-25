import path from 'path';
import Upload from '../models/Upload.js';

export const processNLPQuery = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ message: 'Query string is required' });
    }

    const upload = await Upload.findOne({
      _id: uploadId,
      user: req.user._id
    });

    if (!upload) {
      return res.status(404).json({ message: 'Upload not found' });
    }

    // Resolve absolute path to the uploaded file
    const absolutePath = path.resolve(upload.filePath);

    // Call Python service
    const pythonServiceUrl = 'http://127.0.0.1:8000/nlp-query';
    
    console.log(`Forwarding NLP Query to Python service at ${pythonServiceUrl} for file ${absolutePath}`);
    
    const response = await fetch(pythonServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file_path: absolutePath,
        query: query
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Python service error:', errorText);
      return res.status(500).json({ message: 'Failed to process NLP query through Python service' });
    }

    const data = await response.json();
    return res.status(200).json(data);
  } catch (error) {
    console.error('NLP Query error:', error);
    return res.status(500).json({ message: error.message || 'Internal server error during NLP query' });
  }
};
