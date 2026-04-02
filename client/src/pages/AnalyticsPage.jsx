import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  BarChart3,
  LineChart,
  PieChart,
  Download,
  Settings,
  ArrowLeft,
  Loader2
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Box, Text } from '@react-three/drei';
import LoadingSpinner from '../components/LoadingSpinner';
import axios from 'axios';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

const AnalyticsPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const logAnalytics = async (action, details = {}) => {
    try {
      await axios.post('https://excel-analytics-1-4y0b.onrender.com/api/analytics/log', {
        userId: upload?.user,    // Assuming upload contains `user` field
        uploadId: id,            // File/report ID
        action,
        details
      });
    } catch (err) {
      console.error(`Analytics logging failed for action ${action}`, err);
    }
  };

  const [upload, setUpload] = useState(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState(null);
  const [chartConfig, setChartConfig] = useState({
    type: 'bar',
    xAxis: '',
    yAxis: '',
    title: ''
  });
  const [generatingChart, setGeneratingChart] = useState(false);
  const [insight, setInsight] = useState('');
  const [loadingInsight, setLoadingInsight] = useState(false);

  useEffect(() => {
    fetchUploadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const chartRef = useRef(null);

  const fetchUploadData = async () => {
    try {
      const response = await axios.get(`https://excel-analytics-1-4y0b.onrender.com/api/upload/${id}`);
      setUpload(response.data);

      // Set default axes if columns are available
      if (response.data.columns && response.data.columns.length >= 2) {
        setChartConfig(prev => ({
          ...prev,
          xAxis: response.data.columns[0].name,
          yAxis: response.data.columns[1].name
        }));
      }
    } catch (error) {
      console.error('Error fetching upload data:', error);
      toast.error('Failed to load upload data');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const generateChart = async () => {
    if (!chartConfig.xAxis || !chartConfig.yAxis) {
      toast.error('Please select both X and Y axes');
      return;
    }

    setGeneratingChart(true);

    try {
      // Fetch chart data for the given upload and selected axes
      const response = await axios.get(`https://excel-analytics-1-4y0b.onrender.com/api/analytics/chart-data/${id}`, {
        params: {
          xAxis: chartConfig.xAxis,
          yAxis: chartConfig.yAxis,
        },
      });

      setChartData(response.data);

      // Save the chart analytics data to the backend
      await axios.post('https://excel-analytics-1-4y0b.onrender.com/api/chart-analytics', {
        uploadId: id,
        chartType: chartConfig.type,
        chartData: {
          labels: response.data.labels,
          datasets: [
            {
              label: chartConfig.yAxis,
              data: response.data.data,
            },
          ],
        },
      });

      toast.success('Chart generated successfully!');
    } catch (error) {
      console.error('Error generating chart:', error);
      toast.error('Failed to generate chart');
    } finally {
      setGeneratingChart(false);
    }
  };

  const generateInsights = async () => {
    if (!chartData || !chartData.labels || !chartData.data) {
      toast.error('Please generate the chart before requesting insights.');
      return;
    }

    setLoadingInsight(true);
    try {
      const response = await axios.post('https://excel-analytics-1-4y0b.onrender.com/api/insights/generate', {
        config: {
          labels: chartData.labels,
          data: chartData.data,
          xLabel: chartConfig?.xAxis || 'X',
          yLabel: chartConfig?.yAxis || 'Y',
          label: chartConfig?.yAxis || 'Y',
        }
      });

      const rawInsight = response.data?.insight;

      console.log("✅ Raw Insight From Backend:", rawInsight);

      if (!rawInsight || typeof rawInsight !== 'string') {
        toast.error('No insights were generated.');
        return;
      }

      setInsight(rawInsight);
      toast.success('AI Insight generated successfully!');
    } catch (err) {
      toast.error('Failed to generate insights.');
      console.error('Insight generation failed:', err.response?.data || err.message || err);
      setInsight(null);
    } finally {
      setLoadingInsight(false);
    }
  };

  const downloadChart = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `${chartConfig.title || 'chart'}.png`;
      link.href = url;
      link.click();
      logAnalytics('chart_download', {
        format: 'png',
        chartType: chartConfig.type
      });
    }
  };

  const downloadChartPDF = async () => {
    const input = chartRef.current;
    if (!input) return;

    const canvas = await html2canvas(input, { scale: 2 });
    const imgData = canvas.toDataURL('image/png');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'px',
      format: [canvas.width, canvas.height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
    pdf.save(`${chartConfig.title || 'chart'}.pdf`);
    logAnalytics('chart_download', {
      format: 'pdf',
      chartType: chartConfig.type
    });
  };

  const getChartOptions = () => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: chartConfig.title || `${chartConfig.type} Chart`,
      },
    },
    scales: chartConfig.type !== 'pie' ? {
      x: {
        title: {
          display: true,
          text: chartData?.xAxisLabel || chartConfig.xAxis
        }
      },
      y: {
        title: {
          display: true,
          text: chartData?.yAxisLabel || chartConfig.yAxis
        }
      }
    } : undefined
  });

  const getChartDataConfig = () => {
    if (!chartData) return null;

    const colors = [
      'rgba(59, 130, 246, 0.8)',
      'rgba(16, 185, 129, 0.8)',
      'rgba(245, 101, 101, 0.8)',
      'rgba(251, 146, 60, 0.8)',
      'rgba(139, 92, 246, 0.8)'
    ];

    return {
      labels: chartData.labels,
      datasets: [
        {
          label: chartData.yAxisLabel || chartConfig.yAxis,
          data: chartData.data,
          backgroundColor: chartConfig.type === 'pie'
            ? colors.slice(0, chartData.data.length)
            : colors[0],
          borderColor: chartConfig.type === 'pie'
            ? colors.slice(0, chartData.data.length).map(color => color.replace('0.8', '1'))
            : colors[0].replace('0.8', '1'),
          borderWidth: 1,
        },
      ],
    };
  };

  const renderChart = () => {
    const data = getChartDataConfig();
    const options = getChartOptions();

    if (!data) return null;

    switch (chartConfig.type) {
      case 'bar':
        return <Bar data={data} options={options} />;
      case 'line':
        return <Line data={data} options={options} />;
      case 'pie':
        return <Pie data={data} options={options} />;
      default:
        return <Bar data={data} options={options} />;
    }
  };

  // Improved render3DChart with proportional scaling and centered bars
  const render3DChart = () => {
    if (!chartData || chartConfig.type === 'pie') return null;

    const maxBarHeight = 7; // Maximum height for bars in 3D units
    const maxValue = Math.max(...chartData.data);
    const spacing = 2; // Distance between bars on x axis

    return (
      <Canvas camera={{ position: [10, 10, 15], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <pointLight position={[10, 10, 10]} />
        <OrbitControls />
        <gridHelper args={[10, 10]} />
        <axesHelper args={[5]} />
        {chartData.data.map((value, index) => {
          const scaledHeight = maxValue > 0 ? (value / maxValue) * maxBarHeight : 1;
          return (
            <Box
              key={index}
              position={[
                (index - chartData.data.length / 2) * spacing, // center bars at x=0
                scaledHeight / 2, // lift box so base sits exactly at y=0
                0
              ]}
              args={[1, scaledHeight, 1]} // width, height, depth
            >
              <meshStandardMaterial color={`hsl(${index * 60}, 70%, 50%)`} />
            </Box>
          );
        })}
        <Text
          position={[0, -1, 0]}
          fontSize={0.5}
          color="black"
          anchorX="center"
          anchorY="middle"
        >
          {chartConfig.title || '3D Chart'}
        </Text>
      </Canvas>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingSpinner size="lg" text="Loading analytics..." />
      </div>
    );
  }

  if (!upload) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Upload not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="flex items-center justify-between"
      >
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="btn btn-ghost btn-sm"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{upload.originalName}</h1>
            <p className="text-gray-600">
              {upload.sheetData?.totalRows} rows, {upload.sheetData?.totalColumns} columns
            </p>
          </div>
        </div>
      </motion.div>

      {/* Chart Configuration */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="card p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Settings className="w-5 h-5 text-gray-600" />
          <h3 className="text-lg font-semibold text-gray-900">Chart Configuration</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="label block mb-2">Chart Type</label>
            <select
              value={chartConfig.type}
              onChange={(e) => setChartConfig(prev => ({ ...prev, type: e.target.value }))}
              className="input"
            >
              <option value="bar">Bar Chart</option>
              <option value="line">Line Chart</option>
              <option value="pie">Pie Chart</option>
            </select>
          </div>

          <div>
            <label className="label block mb-2">X-Axis</label>
            <select
              value={chartConfig.xAxis}
              onChange={(e) => setChartConfig(prev => ({ ...prev, xAxis: e.target.value }))}
              className="input"
            >
              <option value="">Select column</option>
              {upload.columns?.map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label block mb-2">Y-Axis</label>
            <select
              value={chartConfig.yAxis}
              onChange={(e) => setChartConfig(prev => ({ ...prev, yAxis: e.target.value }))}
              className="input"
            >
              <option value="">Select column</option>
              {upload.columns?.filter(col => col.type === 'number').map((column) => (
                <option key={column.name} value={column.name}>
                  {column.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label block mb-2">Chart Title</label>
            <input
              type="text"
              value={chartConfig.title}
              onChange={(e) => setChartConfig(prev => ({ ...prev, title: e.target.value }))}
              placeholder="Enter chart title"
              className="input"
            />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-6">
          <button
            onClick={generateChart}
            disabled={generatingChart || !chartConfig.xAxis || !chartConfig.yAxis}
            className="btn btn-primary btn-md"
          >
            {generatingChart ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <BarChart3 className="w-4 h-4 mr-2" />
            )}
            Generate Chart
          </button>

          {chartData && (
            <>
              <button
                onClick={downloadChart}
                className="btn btn-outline btn-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </button>

              <button
                onClick={downloadChartPDF}
                className="btn btn-outline btn-md"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </button>
              <button
                onClick={generateInsights}
                disabled={loadingInsight}
                className="btn btn-outline btn-md"
              >
                {loadingInsight ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                Generate Insight
              </button>
            </>
          )}
        </div>
      </motion.div>

      {/* Charts Display */}
      {chartData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 2D Chart */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">2D Visualization</h3>
            <div ref={chartRef} className="chart-container">
              {renderChart()}
            </div>
          </motion.div>

          {/* 3D Chart */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="card p-6"
          >
            <h3 className="text-lg font-semibold text-gray-900 mb-4">3D Visualization</h3>
            {/* Fixed size div for canvas */}
            <div className="three-container" style={{ width: '100%', height: 400 }}>
              {render3DChart()}
            </div>
          </motion.div>
        </div>
      )}

      {/* Data Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.4 }}
        className="card p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Preview</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {upload.sheetData?.headers?.slice(0, 10).map((header, index) => (
                  <th
                    key={index}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                  >
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {upload.sheetData?.rows?.slice(0, 5).map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.slice(0, 10).map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {upload.sheetData?.rows?.length > 5 && (
          <p className="text-sm text-gray-500 mt-4">
            Showing first 5 rows of {upload.sheetData.rows.length} total rows
          </p>
        )}
      </motion.div>

      {insight && typeof insight === 'string' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="card p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 mb-2">AI Insight</h3>
          <div className="prose prose-sm max-w-none text-gray-800">
            <ReactMarkdown>
              {insight}
            </ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default AnalyticsPage;
