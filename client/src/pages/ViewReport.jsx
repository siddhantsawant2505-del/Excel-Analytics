import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, BarChart3, FileSpreadsheet, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Chart as ChartJS, registerables } from 'chart.js';
import zoomPlugin from 'chartjs-plugin-zoom';
import { Bar, Line, Pie } from 'react-chartjs-2';
import ReactMarkdown from 'react-markdown';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

ChartJS.register(...registerables, zoomPlugin);

const ViewReports = () => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expandedReports, setExpandedReports] = useState({});
    const [insightsMap, setInsightsMap] = useState({});
    const [expandedCharts, setExpandedCharts] = useState({});
    const [modalChart, setModalChart] = useState(null);
    const [loadingInsightMap, setLoadingInsightMap] = useState({});

    useEffect(() => {
        fetchReports();
    }, []);

    const fetchReports = async () => {
        try {
            const reportsResponse = await axios.get('https://excel-analytics-1-4y0b.onrender.com/api/analytics/reports');
            const reports = reportsResponse.data;

            const reportsWithCharts = await Promise.all(
                reports.map(async (report) => {
                    try {
                        const chartResp = await axios.get(`https://excel-analytics-1-4y0b.onrender.com/api/chart-analytics/${report._id}`);
                        return {
                            ...report,
                            chartConfigs: chartResp.data,
                        };
                    } catch (err) {
                        console.error(`Failed to fetch charts for report ${report._id}`, err);
                        return {
                            ...report,
                            chartConfigs: [],
                        };
                    }
                })
            );

            const initialInsights = {};
            reportsWithCharts.forEach(report => {
                report.chartConfigs.forEach(chart => {
                    if (chart.insights) {
                        initialInsights[chart._id] = chart.insights;
                    }
                });
            });

            setReports(reportsWithCharts);
            setInsightsMap(initialInsights);
        } catch (error) {
            toast.error('Failed to fetch reports');
        } finally {
            setLoading(false);
        }
    };

    const generateInsight = async (chartId, chartData, chartType) => {
        const toastId = `insight-${chartId}`;
        try {
            setLoadingInsightMap(prev => ({ ...prev, [chartId]: true }));
            toast.loading('Generating insight...', { id: toastId });

            const dataArray = chartData.datasets && chartData.datasets[0]?.data ? chartData.datasets[0].data : [];
            const dataLabel = chartData.datasets && chartData.datasets[0]?.label ? chartData.datasets[0].label : '';

            const payload = {
                config: {
                    labels: chartData.labels,
                    data: dataArray,
                    xLabel: 'Month',    // replace with dynamic value if available
                    yLabel: 'Revenue',  // replace with dynamic value if available
                    label: dataLabel || 'Dataset'
                },
                chartType
            };

            const response = await axios.post('https://excel-analytics-1-4y0b.onrender.com/api/insights/generate', payload);

            setInsightsMap(prev => ({
                ...prev,
                [chartId]: response.data.insight || 'No insight generated.',
            }));

            toast.success('Insight generated!', { id: toastId });
        } catch (error) {
            toast.error('Failed to generate insight', { id: toastId });
            if (error.response) {
                console.error('Insight generation error:', error.response.data);
            } else {
                console.error('Insight generation error:', error.message);
            }
        } finally {
            setLoadingInsightMap(prev => ({ ...prev, [chartId]: false }));
        }
    };

    const toggleChart = (chartId) => {
        setExpandedCharts(prev => ({ ...prev, [chartId]: !prev[chartId] }));
    };

    const toggleReport = (reportId) => {
        setExpandedReports(prev => ({
            ...prev,
            [reportId]: !prev[reportId]
        }));
    };

    const zoomOptions = {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'xy',
                },
                zoom: {
                    wheel: {
                        enabled: true,
                    },
                    pinch: {
                        enabled: true,
                    },
                    mode: 'xy',
                },
                limits: {
                    x: { min: 'original', max: 'original' },
                    y: { min: 'original', max: 'original' },
                },
            },
        },
    };

    const downloadChartAsPNG = (chartData, chartType, chartKey) => {
        const toastId = `png-${chartKey}`;
        toast.loading('Generating PNG...', { id: toastId });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 800;
        canvas.height = 600;

        import('chart.js').then(({ Chart }) => {
            const chart = new Chart(ctx, {
                type: chartType,
                data: chartData,
                options: {
                    responsive: false,
                    animation: false,
                    maintainAspectRatio: false,
                },
            });

            setTimeout(() => {
                canvas.toBlob((blob) => {
                    if (blob) {
                        saveAs(blob, `chart-${chartKey}.png`);
                        toast.success('PNG downloaded successfully!', { id: toastId, duration: 4000 });
                    } else {
                        toast.error('Failed to generate PNG', { id: toastId });
                    }
                    chart.destroy();
                });
            }, 500);
        }).catch(err => {
            toast.error('Failed to generate PNG', { id: toastId });
            console.error('Error generating PNG:', err);
        });
    };

    const downloadChartAsPDF = async (chartData, chartType, chartKey, insightText = '') => {
        toast.loading('Generating PDF...', { id: `pdf-${chartKey}` });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        canvas.width = 800;
        canvas.height = 600;

        try {
            const { Chart } = await import('chart.js');

            const chart = new Chart(ctx, {
                type: chartType,
                data: chartData,
                options: {
                    responsive: false,
                    animation: false,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: true },
                        title: { display: true, text: chartData.title || '' }
                    }
                },
            });

            setTimeout(() => {
                try {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jsPDF({
                        orientation: 'landscape',
                        unit: 'px',
                        format: 'a4',
                    });

                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const pdfHeight = pdf.internal.pageSize.getHeight();

                    const imgProps = pdf.getImageProperties(imgData);
                    const imgAspect = imgProps.height / imgProps.width;

                    const margin = 40;
                    const maxImgWidth = pdfWidth - margin * 2;
                    const scaledImgWidth = maxImgWidth;
                    const scaledImgHeight = scaledImgWidth * imgAspect;

                    const x = (pdfWidth - scaledImgWidth) / 2;
                    const y = margin;
                    pdf.addImage(imgData, 'PNG', x, y, scaledImgWidth, scaledImgHeight);

                    let textBaseY = y + scaledImgHeight + 30;

                    if (insightText && insightText.trim().length > 0) {
                        pdf.setFontSize(18);
                        pdf.setFont('helvetica', 'bold');
                        pdf.setTextColor('#2e2e2e');
                        pdf.text('Insights:', margin, textBaseY);

                        pdf.setDrawColor('#888');
                        pdf.setLineWidth(0.5);
                        pdf.line(margin, textBaseY + 6, pdfWidth - margin, textBaseY + 6);

                        pdf.setFontSize(12);
                        pdf.setFont('helvetica', 'normal');
                        pdf.setTextColor('#444');

                        const maxTextWidth = pdfWidth - margin * 2;
                        const lines = pdf.splitTextToSize(insightText, maxTextWidth);

                        pdf.text(lines, margin, textBaseY + 25);
                    }

                    pdf.save(`chart-${chartKey}.pdf`);
                    chart.destroy();
                    toast.success('PDF generated successfully!', { id: `pdf-${chartKey}`, duration: 4000 });
                } catch (error) {
                    chart.destroy();
                    toast.error('Failed to generate PDF', { id: `pdf-${chartKey}` });
                    console.error('Error generating PDF:', error);
                }
            }, 500);
        } catch (error) {
            toast.error('Failed to generate PDF', { id: `pdf-${chartKey}` });
            console.error('Error loading Chart.js or generating PDF:', error);
        }
    };

    return (
        <div className="w-full px-4 sm:px-6 lg:px-8 space-y-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="bg-gradient-to-r from-primary-600 to-secondary-600 rounded-2xl p-8 text-white"
            >
                <h1 className="text-3xl font-bold">📑 Your Reports</h1>
                <p className="text-primary-100 text-lg">All your previous Excel chart reports at one place.</p>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 lg:grid-cols-2 gap-6"
            >
                {reports.length > 0 ? (
                    reports.map((report) => {
                        const isExpanded = expandedReports[report._id];
                        return (
                            <section
                                key={report._id}
                                className="card p-6 flex flex-col gap-6 hover:shadow-md transition"
                                aria-labelledby={`report-title-${report._id}`}
                            >
                                <header className="flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                                            <FileSpreadsheet className="w-5 h-5 text-primary-600" />
                                        </div>
                                        <div>
                                            <h2 id={`report-title-${report._id}`} className="font-medium text-gray-900 truncate max-w-sm">
                                                {report.originalName}
                                            </h2>
                                            <p className="text-sm text-gray-500">
                                                {new Date(report.createdAt).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-700 font-semibold">
                                        Charts: <span>{report.chartConfigs.length}</span>
                                    </div>
                                    <button
                                        className="btn btn-sm btn-outline flex items-center gap-2"
                                        onClick={() => toggleReport(report._id)}
                                        aria-expanded={isExpanded}
                                        aria-controls={`charts-list-${report._id}`}
                                    >
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                        {isExpanded ? 'Hide Charts' : 'Show Charts'}
                                    </button>
                                </header>

                                {isExpanded && (
                                    <div
                                        id={`charts-list-${report._id}`}
                                        className="flex flex-col gap-6 mt-4"
                                        aria-live="polite"
                                    >
                                        {report.chartConfigs.map((chart, index) => {
                                            const chartKey = chart._id || index;
                                            return (
                                                <article key={chartKey} className="bg-white rounded-lg border p-4 shadow-sm">
                                                    <div className="h-[300px] w-full mb-4">
                                                        {chart.chartData && chart.chartData.labels && chart.chartData.datasets ? (
                                                            (() => {
                                                                switch (chart.chartType) {
                                                                    case 'bar':
                                                                        return <Bar data={chart.chartData} options={zoomOptions} />;
                                                                    case 'line':
                                                                        return <Line data={chart.chartData} options={zoomOptions} />;
                                                                    case 'pie':
                                                                        return <Pie data={chart.chartData} options={{ maintainAspectRatio: false, responsive: true }} />;
                                                                    default:
                                                                        return <Bar data={chart.chartData} options={zoomOptions} />;
                                                                }
                                                            })()
                                                        ) : (
                                                            <p className="text-red-500 text-center py-20">Chart data is missing or invalid.</p>
                                                        )}
                                                    </div>

                                                    <div className="flex flex-wrap items-center gap-3">
                                                        <button
                                                            onClick={() => setModalChart(chart)}
                                                            className="btn btn-sm btn-primary"
                                                            aria-label={`View fullscreen chart for ${chartKey}`}
                                                        >
                                                            View Fullscreen
                                                        </button>

                                                        <button
                                                            onClick={() => downloadChartAsPNG(chart.chartData, chart.chartType, chartKey)}
                                                            className="btn btn-sm btn-outline"
                                                            aria-label={`Download PNG for chart ${chartKey}`}
                                                        >
                                                            Download PNG
                                                        </button>

                                                        <button
                                                            onClick={() =>
                                                                downloadChartAsPDF(
                                                                    chart.chartData,
                                                                    chart.chartType,
                                                                    chartKey,
                                                                    insightsMap[chartKey] || chart.insights || ''
                                                                )
                                                            }
                                                            className="btn btn-sm btn-outline"
                                                            aria-label={`Download PDF for chart ${chartKey}`}
                                                        >
                                                            Download PDF
                                                        </button>

                                                        {!(insightsMap[chartKey] || chart.insights) && (
                                                            <button
                                                                onClick={() => generateInsight(chartKey, chart.chartData, chart.chartType)}
                                                                className="btn btn-sm btn-outline flex items-center gap-2"
                                                                disabled={loadingInsightMap[chartKey]}
                                                                aria-label={`Generate insight for chart ${chartKey}`}
                                                            >
                                                                {loadingInsightMap[chartKey] ? (
                                                                    <>
                                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                                        Generating...
                                                                    </>
                                                                ) : (
                                                                    'Generate Insight'
                                                                )}
                                                            </button>
                                                        )}
                                                    </div>

                                                    {/* Insight block below buttons */}
                                                    {
                                                        (insightsMap[chartKey] || chart.insights) && (
                                                            <div className="text-sm text-gray-700 bg-gray-100 p-3 rounded-lg whitespace-pre-wrap max-w-full min-w-[200px]">
                                                                <strong>📊 Insight:</strong>
                                                                <ReactMarkdown>{insightsMap[chartKey] || chart.insights}</ReactMarkdown>
                                                            </div>
                                                        )
                                                    }
                                                </article>
                                            );
                                        })}
                                    </div>
                                )
                                }
                            </section>
                        );
                    })
                ) : (
                    <div className="col-span-full text-center py-16">
                        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-lg">No reports found yet.</p>
                    </div>
                )}
            </motion.div>

            {
                modalChart && (
                    <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex justify-center items-center">
                        <div className="bg-white p-6 rounded-xl max-w-5xl w-full h-full max-h-[90vh] overflow-auto shadow-lg relative">
                            <button
                                onClick={() => setModalChart(null)}
                                className="absolute top-3 right-3 text-gray-600 text-lg font-bold"
                                aria-label="Close fullscreen modal"
                            >
                                ✖
                            </button>
                            {(modalChart.chartData && modalChart.chartData.labels && modalChart.chartData.datasets) ? (
                                (() => {
                                    switch (modalChart.chartType) {
                                        case 'bar': return <Bar data={modalChart.chartData} options={zoomOptions} />;
                                        case 'line': return <Line data={modalChart.chartData} options={zoomOptions} />;
                                        case 'pie': return <Pie data={modalChart.chartData} options={{ maintainAspectRatio: false, responsive: true }} />;
                                        default: return <Bar data={modalChart.chartData} options={{ maintainAspectRatio: false, responsive: true }} />;
                                    }
                                })()
                            ) : (
                                <div className="text-red-500">Chart data is missing or invalid.</div>
                            )}
                        </div>
                    </div>
                )
            }

        </div >
    );
};

export default ViewReports;
