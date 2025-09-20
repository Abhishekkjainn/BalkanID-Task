// import { useFiles } from '../../context/FileContext';
// import Loader from '../loader';
// import { getActionStyle, formatLogDetails, formatTimestamp } from '../HistoryHelper';

// export default function History() {
//   const { history, historyLoading } = useFiles();

//   if (historyLoading) {
//     return <Loader />;
//   }

//   if (!history || history.length === 0) {
//     return <div className="history-empty">No activity history found.</div>;
//   }

//   return (
//     <div className="history-container">
//       <div className="history-table">
//         <div className="history-header">
//           <div className="h-cell action">Action</div>
//           <div className="h-cell details">Details</div>
//           <div className="h-cell date">Date & Time</div>
//         </div>
//         <div className="history-body">
//           {history.map((log) => (
//             <div className="history-row" key={log.id}>
//               <div className="h-cell action">
//                 <span className="action-tag" style={getActionStyle(log.action)}>
//                   {log.action.replace('FILE_', '')}
//                 </span>
//               </div>
//               <div className="h-cell details">
//                 {formatLogDetails(log)}
//               </div>
//               <div className="h-cell date">
//                 {formatTimestamp(log.createdAt)}
//               </div>
//             </div>
//           ))}
//         </div>
//       </div>
//     </div>
//   );
// }


import { useFiles } from '../../context/FileContext';
import Loader from '../loader';
import HistoryItem from '../HistoryItem'; // Import the new item component

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