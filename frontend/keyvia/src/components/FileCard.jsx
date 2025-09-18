import { useState } from 'react';
import { useFiles } from '../context/FileContext';

export default function FileCard({ file,onShare }) {
    const { deleteFile } = useFiles();
    const [isDeleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        if (window.confirm(`Are you sure you want to delete "${file.filename}"?`)) {
            setIsDeleting(true);
            // The context handles success/error messages and state updates
            await deleteFile(file.id);
            // No need to setIsDeleting(false) on success because the component will unmount
        }
    };

    return (
        <div className="file-card">
            <div className="file-card-icon">
                <img src="/file-icon.png" alt="file icon" />
            </div>
            <div className="file-card-details">
                <p className="file-card-name" title={file.filename}>{file.filename}</p>
                <p className="file-card-meta">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            
            {/* NEW: Action buttons */}
            <div className="file-card-actions">
                {/* NEW: Share Button */}
                <button 
                    className="action-btn share-btn" 
                    onClick={onShare} 
                    title="Share File"
                >
                    🔗
                </button>
                <button 
                    className="action-btn delete-btn" 
                    onClick={handleDelete} 
                    disabled={isDeleting}
                    title="Delete File"
                >
                    {isDeleting ? '...' : '🗑️'}
                </button>
            </div>
        </div>
    );
}