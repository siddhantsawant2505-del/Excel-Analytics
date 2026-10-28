import { GoogleGenerativeAI } from '@google/generative-ai';

export const generateChartInsight = async (req, res) => {
  try {
    const { config } = req.body;

    if (!config || !Array.isArray(config.labels) || !Array.isArray(config.data)) {
      return res.status(400).json({ error: 'Invalid chart config: labels and data must be arrays' });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error('CRITICAL: GEMINI_API_KEY environment variable is missing.');
      return res.status(503).json({ error: 'AI Insight service is currently unavailable' });
    }

    // Limit input length to prevent oversized prompts or token exhaustion
    const sampleLabels = config.labels.slice(0, 50);
    const sampleData = config.data.slice(0, 50);

    const prompt = `
You are a senior business intelligence and data analyst. Analyze the following chart configuration and provide 3-4 concise, high-impact insights in bullet points:

- Chart Title / Metric: ${String(config.label || 'Dataset').replace(/[^a-zA-Z0-9 _-]/g, '')}
- X-Axis (${String(config.xLabel || 'X').replace(/[^a-zA-Z0-9 _-]/g, '')}): ${JSON.stringify(sampleLabels)}
- Y-Axis (${String(config.yLabel || 'Y').replace(/[^a-zA-Z0-9 _-]/g, '')}): ${JSON.stringify(sampleData)}

Provide direct observations, anomalies, growth patterns, and actionable recommendations based strictly on this data.
`;

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ insight: text });
  } catch (err) {
    console.error('Error generating AI insights:', err.message || err);
    return res.status(500).json({ error: 'Failed to generate insights. Please try again later.' });
  }
};
