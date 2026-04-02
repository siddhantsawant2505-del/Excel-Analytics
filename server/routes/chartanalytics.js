import express from 'express';
import { saveChartAnalytics, getChartAnalyticsByUploadId } from '../controllers/chartanalytics.controller.js';

const router = express.Router();

router.post('/', saveChartAnalytics); // Save chart + insights
router.get('/:uploadId', getChartAnalyticsByUploadId); // Get charts for report

export default router;
