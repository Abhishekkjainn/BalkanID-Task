import { useFiles } from '../../context/FileContext';
import Loader from '../loader';
import HistoryItem from '../HistoryItem'; 

export default function History() {
  const { history, historyLoading } = useFiles();

  if (historyLoading) {
    return <Loader />;
  }

  if (!history || history.length === 0) {
    return (
      <div className="history-container">
        <div className="history-empty">
          <img src="/no-activity.svg" alt="No Activity" className="empty-icon" />
          <h2>No Activity Yet</h2>
          <p>Your recent actions will appear here.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="history-container">
      <div className="history-timeline">
        {history.map((log) => (
          <HistoryItem key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}