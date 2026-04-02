import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar, Pie, Doughnut, Radar } from 'react-chartjs-2';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
  zoomPlugin
);

const chartComponents = {
  line: Line,
  bar: Bar,
  pie: Pie,
  doughnut: Doughnut,
  radar: Radar
};

const ReportChart = ({ config }) => {
  if (!config || !config.chartType || !config.chartData) return null;

  const { chartType, chartData, xLabel, yLabel } = config;

  const ChartComponent = chartComponents[chartType.toLowerCase()];
  if (!ChartComponent) return <div>Unsupported chart type: {chartType}</div>;

    const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: { enabled: true },
      legend: { display: true },
      title: { display: true, text: 'Chart' },
      zoom: {
        pan: {
          enabled: true,
          mode: 'xy'
        },
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'xy'
        }
      }
    },
    scales: chartType === 'pie' || chartType === 'doughnut'
      ? {}
      : {
          x: {
            title: {
              display: !!xLabel,
              text: xLabel || 'X-Axis'
            }
          },
          y: {
            title: {
              display: !!yLabel,
              text: yLabel || 'Y-Axis'
            }
          }
        }
  };

    return (
    <div className="h-[400px] w-full bg-white rounded-xl shadow p-4">
      <ChartComponent data={chartData} options={chartOptions} />
    </div>
  );
};


export default ReportChart;
