// Helper to format bytes, which we can reuse
const formatBytes = (bytes, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
};

export default function StorageIndicator({ currentUsage, maxStorage }) {
    const usagePercent = maxStorage > 0 ? (currentUsage / maxStorage) * 100 : 0;

    return (
        <div className="storage-indicator">
            <div className="storage-info">
                <span>Storage</span>
                <span>{formatBytes(currentUsage)} / {formatBytes(maxStorage)}</span>
            </div>
            <div className="progress-bar-background">
                <div 
                    className="progress-bar-fill" 
                    style={{ width: `${usagePercent}%` }}
                ></div>
            </div>
        </div>
    );
}