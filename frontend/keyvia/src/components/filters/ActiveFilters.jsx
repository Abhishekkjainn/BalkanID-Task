export default function ActiveFilters({ activeFilters, onClearFilter }) {
    if (Object.keys(activeFilters).every(k => !activeFilters[k])) {
        return null;
    }

    // Helper to format dates for display
    const formatDate = (dateString) => new Date(dateString).toLocaleDateString();

    return (
        <div className="active-filters-bar">
            {activeFilters.filename && (
                <div className="active-filter-pill">
                    <strong>Search:</strong> {activeFilters.filename}
                    <button className="clear-filter-btn" onClick={() => onClearFilter('filename')}>×</button>
                </div>
            )}
            {activeFilters.mimeType && (
                <div className="active-filter-pill">
                    <strong>Type:</strong> {activeFilters.mimeType}
                    <button className="clear-filter-btn" onClick={() => onClearFilter('mimeType')}>×</button>
                </div>
            )}
            
            {/* NEW: Display for Size Filter */}
            {(activeFilters.minSize || activeFilters.maxSize) && (
                 <div className="active-filter-pill">
                    <strong>Size:</strong> 
                    {activeFilters.minSize ? `> ${(activeFilters.minSize / 1024).toFixed(0)}KB` : ''}
                    {activeFilters.minSize && activeFilters.maxSize ? ' & ' : ''}
                    {activeFilters.maxSize ? `< ${(activeFilters.maxSize / 1024).toFixed(0)}KB` : ''}
                    <button className="clear-filter-btn" onClick={() => onClearFilter('size')}>×</button>
                </div>
            )}

            {/* NEW: Display for Date Filter */}
            {(activeFilters.startDate || activeFilters.endDate) && (
                 <div className="active-filter-pill">
                    <strong>Date:</strong> 
                    {activeFilters.startDate ? `After ${formatDate(activeFilters.startDate)}` : ''}
                    {activeFilters.startDate && activeFilters.endDate ? ' & ' : ''}
                    {activeFilters.endDate ? `Before ${formatDate(activeFilters.endDate)}` : ''}
                    <button className="clear-filter-btn" onClick={() => onClearFilter('date')}>×</button>
                </div>
            )}
            {activeFilters.visibility && (
                <div className="active-filter-pill">
                    <strong>Visibility:</strong> {activeFilters.visibility}
                    <button className="clear-filter-btn" onClick={() => onClearFilter('visibility')}>×</button>
                </div>
            )}
        </div>
    );
}