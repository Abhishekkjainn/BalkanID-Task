// src/pages/dashboard.jsx

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileProvider,useFiles } from '../context/FileContext';

import { useToast } from '../context/ToastContext'; // Import useToast
import * as api from '../services/api'; // Import api service

// Import the view components we will create next
import AllFilesView from '../components/views/AllFilesView';
import ReceivedFilesView from '../components/views/ReceivedFilesView';
import SharedFilesView from '../components/views/SharedFilesView';
import AnalyticsView from '../components/views/AnalyticsView';
import UploadModal from '../components/UploadModal';
import ShareModal from '../components/ShareModal';
import FilterBar from '../components/filters/FilterBar'; // New import
import ActiveFilters from '../components/filters/ActiveFilters'; // New import
import StorageIndicator from '../components/StorageIndicator'; 


function DashboardContent() {
    const { user, logout } = useAuth();
    const [activeView, setActiveView] = useState('all');
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const { refreshFiles } = useFiles();
    const { showToast } = useToast();
    const { token } = useAuth();
    const { filters, setFilters } = useFiles();

    const [selectedFile, setSelectedFile] = useState(null);
    const [stats, setStats] = useState(null);

    const openShareModal = (file) => {
        setSelectedFile(file);
    };

    const closeShareModal = () => {
        setSelectedFile(null);
    };

    useEffect(() => {
        const fetchStats = async () => {
            if (token) {
                try {
                    const data = await api.getAnalytics(token);
                    setStats(data.storageStatistics);
                } catch (err) {
                    console.error("Failed to fetch storage stats:", err);
                }
            }
        };
        fetchStats();
    }, [token]);

    const handleUpload = async (filesToUpload) => {
        if (filesToUpload.length === 0) return;
        try {
            const result = await api.uploadFiles(token, filesToUpload, (progress) => {
                console.log(`Upload Progress: ${progress}%`); // You can use this for a progress bar later
            });
            await refreshFiles(); // Refresh the file list
            showToast(`${result.uploadedCount} file(s) uploaded successfully!`, 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };

      const handleFilterChange = (newFilters) => {
        // Debounce search input to avoid excessive API calls
        if (newFilters.filename !== undefined) {
            if (window.searchTimeout) clearTimeout(window.searchTimeout);
            window.searchTimeout = setTimeout(() => {
                setFilters(prev => ({ ...prev, ...newFilters }));
            }, 300); // 300ms delay
        } else {
            setFilters(prev => ({ ...prev, ...newFilters }));
        }
    };

    const clearFilter = (filterName) => {
        const newFilters = { ...filters };
        if (filterName === 'size') {
            delete newFilters.minSize;
            delete newFilters.maxSize;
        } else if (filterName === 'date') {
            delete newFilters.startDate;
            delete newFilters.endDate;
        } else {
            delete newFilters[filterName];
        }
        setFilters(newFilters);
    };

    const renderActiveView = () => {
        switch (activeView) {
            case 'all': return <AllFilesView openShareModal={openShareModal} />;
            case 'received': return <ReceivedFilesView openShareModal={openShareModal} />;
            case 'shared': return <SharedFilesView openShareModal={openShareModal} />;
            case 'analytics': return <AnalyticsView />;
            default: return <AllFilesView openShareModal={openShareModal} />;
        }
    };
    
    const viewTitles = {
        all: 'All Files',
        received: 'Received Files',
        shared: 'Shared Files',
        analytics: 'Analytics',
    };

    

    return (
        <div className="dashboard">
            <div className="sidebar">
                <div className="dcompany">
                    <img src="/bolt.png" alt="Company Logo" className="dcomplogo" />
                    <div className="dcomptag">Keyvia</div>
                </div>
                <div className="dmenu">
                    <div className="dmenulinks">
                        <div className={`dlink ${activeView === 'all' ? 'active' : ''}`} onClick={() => setActiveView('all')}>
                            <img src="/allfiles.png" alt="" className="dlinkicon" />
                            <div className="dlinktag">All Files</div>
                        </div>
                        <div className={`dlink ${activeView === 'analytics' ? 'active' : ''}`} onClick={() => setActiveView('analytics')}>
                        <img src="/analytics.png" alt="" className="dlinkicon" />
                        <div className="dlinktag">Analytics</div>
                    </div>
                        {/* Add other links here later */}
                    </div>

                    {stats && (
                        <StorageIndicator 
                            currentUsage={stats.deduplicatedUsageBytes}
                            maxStorage={10 * 1024 * 1024} // NOTE: This should ideally come from the backend in the future
                        />
                    )}
                    <div className="profile">
                        <img src="/avatar.png" alt="Avatar" className="avatar" />
                        <div className="pinfo">
                            <div className="username">{user?.name || '...'}</div>
                            <div className="useremail">{user?.username || '...'}</div>
                        </div>
                        <button onClick={logout} className="logout-button" title="Logout">
                            <img src="/logout.png" alt="Logout" className='logout-button-img'/>
                        </button>
                    </div>
                </div>
            </div>
            <div className="mainbar">
                <div className="topmainbar">
                    <div className="mainbar-title">{viewTitles[activeView]}</div>
                    
                    {/* NEW: Upload button in the header */}
                    <button className="main-upload-btn" onClick={() => setIsUploadModalOpen(true)}>
                        Upload Files
                    </button>
                    

                    {/* Search bar placeholder */}
                    <div className="search-bar">
                        <img src="/search.png" alt="Search" className="search-icon" />
                        {/* WIRE UP THE SEARCH BAR */}
                        <input 
                            type="text" 
                            className="search-input" 
                            placeholder="Search by filename..."
                            onChange={(e) => handleFilterChange({ filename: e.target.value })}
                        />
                    </div>
                </div>

                {/* ADD THE FILTERING UI */}
                {activeView !== 'analytics' && (
                    <div className="filters-section">
                        <FilterBar onFilterChange={handleFilterChange} />
                        <ActiveFilters activeFilters={filters} onClearFilter={clearFilter} />
                    </div>
                )}

                <div className="main-content">
                    {renderActiveView()}
                    {/* <AllFilesView openShareModal={openShareModal} /> */}
                </div>
            </div>

            {/* Render the modal, controlled by state */}
            <UploadModal 
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                onUpload={handleUpload}
            />
            <ShareModal 
                isOpen={!!selectedFile}
                onClose={closeShareModal}
                file={selectedFile}
            />
        </div>
    );
}

// The exported component wraps the content with the FileProvider
export default function Dashboard() {
    return (
        <FileProvider>
            <DashboardContent />
        </FileProvider>
    );
}