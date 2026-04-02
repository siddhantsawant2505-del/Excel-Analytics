// controllers/insight.controller.js
import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

dotenv.config();
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export const generateChartInsight = async (req, res) => {
  try {
    const { config } = req.body;

    console.log('Received config:', config);

    if (!config || !config.labels || !config.data) {
      return res.status(400).json({ error: 'Invalid chart config' });
    }

    const prompt = `
      You are a data analyst. Analyze the following chart data and provide clear insights in bullet points.
      Labels: ${JSON.stringify(config.labels)}
      Data: ${JSON.stringify(config.data)}
      X-Axis: ${config.xLabel || 'X'}
      Y-Axis: ${config.yLabel || 'Y'}
      Dataset Label: ${config.label || 'Data'}
    `;
    console.log("Gemini API Key:",process.env.GEMINI_API_KEY ); // Should NOT be undefined or old key


    console.log('Generated prompt:', prompt);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    console.log('Generated insights:', text);

    return res.status(200).json({ insight: text });
  } catch (err) {
    console.error('Error generating insights:', err.message || err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
};

