import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import * as api from '../../services/api';
import Loader from '../loader';
import Placeholder from '../Placeholder';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

// Helper to format bytes into KB, MB, etc.
const formatBytes = (bytes, decimals = 2) => {
    if (!bytes || bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

// Custom Tooltip for Charts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="custom-tooltip">
                <p className="label">{`${label}`}</p>
                <p className="intro">{`${payload[0].name} : ${payload[0].value}`}</p>
            </div>
        );
    }
    return null;
};


export default function AnalyticsView() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { token } = useAuth();

    useEffect(() => {
        const fetchAnalytics = async () => {
            if (!token) return;
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

    // --- Prepare Data for Charts ---
    
    // Line chart data for uploads
    const uploadTimelineData = (stats.uploadsByDay || []).map(d => ({
        // Format date to be more readable e.g., "Sep 19"
        date: new Date(d.day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        Uploads: d.count,
    }));

    // Pie chart data for storage
    const storageChartData = [
        { name: 'Storage Used', value: stats.storageStatistics?.deduplicatedUsageBytes || 0 },
        { name: 'Storage Saved', value: stats.storageStatistics?.savingsBytes || 0 },
    ];
    const PIE_COLORS = ['#6366f1', '#34d399']; // Indigo, Green

    // Prepare data for lists, with fallbacks for safety
    const totalFiles = (stats.fileTypeBreakdown || []).reduce((acc, type) => acc + type.count, 0);
    const topCollaborator = stats.sharingAnalytics?.topCollaborators?.[0];
    const mostSharedFile = stats.sharingAnalytics?.mostSharedFiles?.[0];
    const largestFiles = stats.fileSizeAnalytics?.largestFiles || [];

    return (
        <div className="analytics-container">
            {/* <h1 className="analytics-header">Analytics Dashboard</h1> */}
            
            {/* --- Top Stat Cards --- */}
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-title">Storage Saved</span>
                    <p className="stat-value">{stats.storageStatistics?.savingsPercentage.toFixed(1) ?? '0'}%</p>
                    <span className="stat-subtitle">{formatBytes(stats.storageStatistics?.savingsBytes)} saved</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Total Files Uploaded</span>
                    <p className="stat-value">{totalFiles}</p>
                    <span className="stat-subtitle">Across all your content</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Top Collaborator</span>
                    <p className="stat-value">{topCollaborator?.recipientName || 'N/A'}</p>
                    <span className="stat-subtitle">{topCollaborator ? `${topCollaborator.files_shared_with_count} files shared` : 'Share files to see stats'}</span>
                </div>
                <div className="stat-card">
                    <span className="stat-title">Most Shared File</span>
                    <p className="stat-value">{mostSharedFile?.filename || 'N/A'}</p>
                    <span className="stat-subtitle">{mostSharedFile ? `Shared ${mostSharedFile.share_count} times` : 'No files shared yet'}</span>
                </div>
            </div>

            {/* --- Main Chart Area (2-column layout) --- */}
            <div className="main-content-grid">
                {/* Left Column: Main Line Chart */}
                <div className="main-chart-container">
                    <h3>Upload Activity</h3>
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={uploadTimelineData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <XAxis dataKey="date" stroke="#9ca3af" />
                            <YAxis stroke="#9ca3af" />
                            <Tooltip content={<CustomTooltip />} wrapperStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '0.5rem' }} />
                            <Legend />
                            <Line type="monotone" dataKey="Uploads" stroke="#8884d8" strokeWidth={2} activeDot={{ r: 8 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                {/* Right Column: Other stats and lists */}
                <div className="side-panel-grid">
                    <div className="chart-container">
                        <h3>Storage Analysis</h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie data={storageChartData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={5}>
                                    {storageChartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value) => formatBytes(value)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className="list-container">
                        <h3>Largest Files</h3>
                        <ul className="data-list">
                            {largestFiles.length > 0 ? largestFiles.map((file, index) => (
                                <li key={index} className="data-list-item">
                                    <span>{file.filename}</span>
                                    <span className="list-item-value">{formatBytes(file.size)}</span>
                                </li>
                            )) : <li>No files to display.</li>}
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}


