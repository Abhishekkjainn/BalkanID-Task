import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import Loader from '../loader';
import Placeholder from '../Placeholder';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Helper to format bytes into KB, MB, etc.
const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function AnalyticsView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                const data = await api.getAnalytics(token);
                setStats(data);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };
        fetchAnalytics();
    }, [token]);

    if (loading) return <Loader />;
    if (error) return <Placeholder title="An Error Occurred" message={`Failed to load analytics: ${error}`} />;
    if (!stats) return <Placeholder title="No Data" message="No analytics data is available yet." />;

    const storageChartData = [
        { name: 'Actual Storage Used', value: stats.storageStatistics.deduplicatedUsageBytes },
        { name: 'Storage Saved', value: stats.storageStatistics.savingsBytes },
    ];
    const COLORS = ['#0088FE', '#00C49F'];
    const fileTypes = stats.fileTypeBreakdown ?? [];
    const topFiles = stats.topDownloadedFiles ?? [];

    return (
       <div className="analytics-view">
            <div className="stats-grid">
                <div className="stat-card">
                    <h3>Storage Savings</h3>
                    <p>{stats.storageStatistics.savingsPercentage.toFixed(1)}%</p>
                    <span>{formatBytes(stats.storageStatistics.savingsBytes)} saved by deduplication</span>
                </div>
                <div className="stat-card">
                    <h3>Total Files</h3>
                    {/* Use the safe 'fileTypes' variable */}
                    <p>{fileTypes.reduce((acc, type) => acc + type.count, 0)}</p>
                    <span>Across all your uploads</span>
                </div>
                 <div className="stat-card">
                    <h3>Most Popular File</h3>
                    {/* Use the safe 'topFiles' variable */}
                    <p>{topFiles[0]?.filename || 'N/A'}</p>
                    <span>{topFiles[0]?.downloadCount || 0} downloads</span>
                </div>
            </div>

            <div className="charts-grid">
                <div className="chart-container">
                    <h3>Storage Analysis</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                            <Pie data={storageChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                {storageChartData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip formatter={(value) => formatBytes(value)} />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                 <div className="chart-container">
                    <h3>File Types</h3>
                     <ResponsiveContainer width="100%" height={300}>
                        {/* Use the safe 'fileTypes' variable for the chart data */}
                        <BarChart data={fileTypes}>
                            <XAxis dataKey="mimeType" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar dataKey="count" fill="#8884d8" />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}