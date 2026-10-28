import express from 'express';
import { saveChartAnalytics, getChartAnalyticsByUploadId } from '../controllers/chartanalytics.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

router.post('/', authenticate, saveChartAnalytics);
router.get('/:uploadId', authenticate, getChartAnalyticsByUploadId);

export default router;
