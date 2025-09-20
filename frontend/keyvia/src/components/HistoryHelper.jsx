import React from 'react';

// --- ICONS (Self-contained SVGs, no library needed) ---
const UploadIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const DeleteIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>;
const ShareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 4.186m0-4.186c.114-.092.237-.18.364-.263a2.25 2.25 0 114.186 4.186l-4.186-4.186zM12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25z" /></svg>;
const UnshareIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 10.5V6.75a4.5 4.5 0 119 0v3.75M3.75 21.75h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H3.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg>;
const DefaultIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" /></svg>;


/**
 * Returns an object with icon, color, and title for a given action.
 * @param {string} action - The action string (e.g., 'FILE_UPLOAD').
 * @returns {{icon: JSX.Element, color: string, title: string}}
 */
export const getActionInfo = (action) => {
  switch (action) {
    case 'FILE_UPLOAD':
      return { icon: <UploadIcon />, color: '#22c55e', title: 'File Uploaded' };
    case 'FILE_DELETE':
      return { icon: <DeleteIcon />, color: '#ef4444', title: 'File Deleted' };
    case 'FILE_SHARE_USER':
    case 'FILE_SHARE_PUBLIC':
      return { icon: <ShareIcon />, color: '#3b82f6', title: 'File Shared' };
    case 'FILE_UNSHARE_SELF':
      return { icon: <UnshareIcon />, color: '#f97316', title: 'File Unshared' };
    default:
      return { icon: <DefaultIcon />, color: '#6b7280', title: 'System Event' };
  }
};

const formatBytes = (bytes, decimals = 2) => {
    // Unchanged from previous version...
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

export const formatLogDetails = (log) => {
    // Unchanged from previous version...
    const { details } = log;
    if (!details) {
        return <div className="detail-item"><span className="detail-value">You removed this file from your shared list.</span></div>;
    }
    return (
        <>
            <div className="detail-item">
                <span className="detail-label">File:</span>
                <span className="detail-value filename">{details.filename}</span>
            </div>
            {details.size !== undefined && (
                <div className="detail-item">
                    <span className="detail-label">Size:</span>
                    <span className="detail-value">{formatBytes(details.size)}</span>
                </div>
            )}
            {details.deduplicated !== undefined && (
                <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`detail-value ${details.deduplicated ? 'deduplicated' : ''}`}>
                        {details.deduplicated ? 'Deduplicated (Saved Space)' : 'New Upload'}
                    </span>
                </div>
            )}
            {details.recipientUsername && (
                <div className="detail-item">
                    <span className="detail-label">Shared With:</span>
                    <span className="detail-value">{details.recipientUsername}</span>
                </div>
            )}
        </>
    );
};

export const formatTimestamp = (timestamp) => {
    // Unchanged from previous version...
    const date = new Date(timestamp);
    return date.toLocaleString('en-IN', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};