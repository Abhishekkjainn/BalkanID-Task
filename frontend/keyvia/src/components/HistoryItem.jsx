import { getActionInfo, formatLogDetails, formatTimestamp } from './HistoryHelper';

export default function HistoryItem({ log }) {
  // Get the specific icon, color, and title for the action
  const { icon, color, title } = getActionInfo(log.action);

  return (
    <div className="history-item">
      {/* Icon and Timeline Connector */}
      <div className="history-icon-container">
        <span className="timeline-connector"></span>
        <div className="icon-wrapper" style={{ backgroundColor: color }}>
          {icon}
        </div>
      </div>

      {/* Main Content */}
      <div className="history-content">
        <p className="action-title">{title}</p>
        <div className="details-container">
          {formatLogDetails(log)}
        </div>
      </div>

      {/* Timestamp */}
      <div className="history-timestamp">
        {formatTimestamp(log.createdAt)}
      </div>
    </div>
  );
}