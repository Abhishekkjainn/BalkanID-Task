const formatBytes = (bytes, decimals = 2) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export default function StorageIndicator({ currentUsage, maxStorage }) {
  const usagePercentage = Math.min((currentUsage / maxStorage) * 100, 100);

  return (
    <div className="storage-indicator">
      <div className="storage-header">
        <h3 className="storage-title">Cloud Storage</h3>
        
        <span className="storage-usage-text">
          {formatBytes(currentUsage)} of {formatBytes(maxStorage)} used
        </span>
      </div>
      <div className="progress-bar-background">
        <div
          className="progress-bar-fill"
          style={{ width: `${usagePercentage}%` }}
        />
      </div>
    </div>
  );
}