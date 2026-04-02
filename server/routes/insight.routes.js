// routes/insight.routes.js
import express from 'express';
import { generateChartInsight } from '../controllers/insight.controller.js';

const router = express.Router();

// POST route to generate chart insight
router.post('/generate', generateChartInsight);

export default router;
