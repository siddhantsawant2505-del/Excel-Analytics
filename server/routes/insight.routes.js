import express from 'express';
import { generateChartInsight } from '../controllers/insight.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// POST route to generate chart insight (protected by authentication)
router.post('/generate', authenticate, generateChartInsight);

export default router;
