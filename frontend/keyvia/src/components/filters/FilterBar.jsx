import { useState } from 'react';

const FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

export default function FilterBar({ onFilterChange }) {
    const [openFilter, setOpenFilter] = useState(null);

    // State for the inputs inside the dropdowns
    const [sizeRange, setSizeRange] = useState({ min: '', max: '' });
    const [dateRange, setDateRange] = useState({ start: '', end: '' });

    const handleApplyType = (mimeType) => {
        onFilterChange({ mimeType });
        setOpenFilter(null);
    };

    const handleApplySize = () => {
        onFilterChange({
            minSize: sizeRange.min ? parseInt(sizeRange.min) * 1024 : null, // Convert KB to Bytes
            maxSize: sizeRange.max ? parseInt(sizeRange.max) * 1024 : null,
        });
        setOpenFilter(null);
    };

    const handleApplyDate = () => {
        onFilterChange({
            startDate: dateRange.start || null,
            endDate: dateRange.end || null,
        });
        setOpenFilter(null);
    };

    return (
        <div className="filter-bar">
            {/* File Type Filter (Unchanged) */}
            <div className="filter-pill-container">
                <button className="filter-pill" onClick={() => setOpenFilter(openFilter === 'type' ? null : 'type')}>
                    File Type <span>▼</span>
                </button>
                {openFilter === 'type' && (
                    <div className="filter-dropdown">
                        {FILE_TYPES.map(type => (
                            <button key={type} className="dropdown-item" onClick={() => handleApplyType(type)}>
                                {type}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* NEW: Size Filter */}
            <div className="filter-pill-container">
                <button className="filter-pill" onClick={() => setOpenFilter(openFilter === 'size' ? null : 'size')}>
                    Size <span>▼</span>
                </button>
                {openFilter === 'size' && (
                    <div className="filter-dropdown">
                        <label>Min Size (KB)</label>
                        <input type="number" value={sizeRange.min} onChange={(e) => setSizeRange(p => ({ ...p, min: e.target.value }))} />
                        <label>Max Size (KB)</label>
                        <input type="number" value={sizeRange.max} onChange={(e) => setSizeRange(p => ({ ...p, max: e.target.value }))} />
                        <div className="filter-actions">
                            <button className="btn-primary" onClick={handleApplySize}>Apply</button>
                        </div>
                    </div>
                )}
            </div>
            
            {/* NEW: Date Filter */}
            <div className="filter-pill-container">
                <button className="filter-pill" onClick={() => setOpenFilter(openFilter === 'date' ? null : 'date')}>
                    Date <span>▼</span>
                </button>
                {openFilter === 'date' && (
                    <div className="filter-dropdown">
                        <label>Start Date</label>
                        <input type="date" value={dateRange.start} onChange={(e) => setDateRange(p => ({ ...p, start: e.target.value }))} />
                        <label>End Date</label>
                        <input type="date" value={dateRange.end} onChange={(e) => setDateRange(p => ({ ...p, end: e.target.value }))} />
                        <div className="filter-actions">
                             <button className="btn-primary" onClick={handleApplyDate}>Apply</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}