import { useState } from 'react';
import { useFiles } from '../context/FileContext';
import PDFPreview from './PDFPreview'; // Import the new component
import { useAuth } from '../context/AuthContext';

const formatBytes = (bytes, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * Generates a Cloudinary thumbnail URL with performance optimizations.
 * @param {string} originalUrl The original Cloudinary image URL.
 * @returns {string} The transformed URL for a small, optimized thumbnail.
 */
const generateThumbnailUrl = (originalUrl) => {
  if (!originalUrl.includes('/upload/')) {
    return originalUrl; // Not a Cloudinary upload URL, return as is
  }
  
  // These are Cloudinary's transformation parameters:
  // w_400, h_400: width and height of 400px (a good thumbnail size)
  // c_fill: crop the image to fill the space without distortion
  // q_auto: automatically adjust quality to balance file size and visuals
  // f_auto: automatically select the best image format for the browser (like WebP)
  const transformations = 'w_400,h_400,c_fill,q_auto,f_auto';

  // Inject the transformations into the URL right after '/upload/'
  return originalUrl.replace('/upload/', `/upload/${transformations}/`);
};



// --- Helper component for SVG icons ---
const FileTypeIcon = ({ mimeType }) => {
    const getIcon = () => {
        if (mimeType.startsWith('application/pdf')) {
            return (
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="12" y1="18" x2="12" y2="12"></line><line x1="9" y1="15" x2="15" y2="15"></line></svg>
            );
        }
        // Add more specific icons here if needed
        return (
             <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><polyline points="13 2 13 9 20 9"></polyline></svg>
        );
    };

    return <div className="file-icon-center">{getIcon()}</div>;
};


export default function FileCard({ file, onShare, onPreview }) {
    const { token } = useAuth();
    const { deleteFile } = useFiles();
    // const { deleteFile } = useFiles(); // This would be your actual context hook
    
    const [isDeleting, setIsDeleting] = useState(false);
    const [actionsVisible, setActionsVisible] = useState(false);

    const handleDelete = async () => {
        // NOTE: window.confirm is bad for UX. A confirmation modal is a better approach.
        setIsDeleting(true);
        try {
            await deleteFile(file.id);
            // On success, the parent component's state update should remove this card.
        } catch (error) {
            console.error("Failed to delete file:", error);
            setIsDeleting(false); // Only set back to false if deletion fails
        }
    };

    const isImage = file.mimeType.startsWith('image/');
    const isPdf = file.mimeType === 'application/pdf';
    const isDeduplicated = file.refCount > 1;

     const isPreviewable = isImage || isPdf;

    // const cardStyle = isImage ? { backgroundImage: `url(${file.url})` } : {};
     const cardStyle = isImage ? { backgroundImage: `url(${generateThumbnailUrl(file.url)})` } : {};
    console.log(file);

     const formatDate = (dateString) => {
    // 1. Create a new Date object from the API string
    const date = new Date(dateString);

    // 2. Define an array of short month names
    const monthNames = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sept", "Oct", "Nov", "Dec"
    ];

    // 3. Get the day, month index, and year from the date object
    const day = date.getDate();
    const monthIndex = date.getMonth(); // getMonth() is zero-based (0 for Jan)
    const year = date.getFullYear();

    // 4. Assemble and return the formatted string
    return `${day} ${monthNames[monthIndex]} ${year}`;
  };

    return (
        <>
            <div 
                className="file-card" 
                style={cardStyle} 
                onClick={() => setActionsVisible(!actionsVisible)}
            >
                {/* --- Conditional Preview Rendering --- */}
            {/* {isPdf && <PDFPreview fileUrl={file.url} />} */}
                 {!isImage && <FileTypeIcon mimeType={file.mimeType} />}
                
                <div className="card-pills">
                    <div className="pill mime-pill">
                        <span>{file.filename.split('.').pop()?.toUpperCase() || 'FILE'}</span>
                        <span>{formatBytes(file.size)}</span>
                    </div>
                    <div className={`pill status-pill ${file.isPublic ? 'public' : 'private'}`}>
                        {file.isPublic ? 'Public' : 'Private'}
                    </div>
                </div>

                <div className="card-overlay">
                    <div className="file-info">
                        <h3 className="filename" title={file.filename}>{file.filename}</h3>
                        {/* <div className="date">{formatDate(file.uploadedAt)}</div> */}
                        <div className="file-meta">
                            <span>by {file.ownerName}</span>
                            <span className="meta-divider">|</span>
                            <span >{formatDate(file.uploadedAt)}</span>
                            <span className="meta-divider">|</span>
                            <span className={`dedup-status ${isDeduplicated ? 'deduped' : ''}`}>
                                {isDeduplicated ? 'Dedup' : 'Unique'}
                            </span>
                        </div>
                        {file.isPublic && (
                                <>
                                    <span className="download-count">{file.downloadCount} Downloads</span>
                                </>
                            )}
                    </div>

                    <div className={`file-card-actions ${actionsVisible ? 'visible' : ''}`}>
                        <button className="action-btn" onClick={(e) => { e.stopPropagation(); onShare(); }} title="Share File">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                        </button>
                        <button className="action-btn" title="Preview File (coming soon)" disabled={!isPreviewable} onClick={(e) => { e.stopPropagation(); onPreview(); }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        </button>
                         <button className="action-btn" title="Download File" onClick={(e) => { 
                            e.stopPropagation();
                            // 3. THE FIX: Build the URL to YOUR backend endpoint
                            const downloadUrl = `http://localhost:8080/api/files/${file.id}/download?token=${token}`;
                            window.open(downloadUrl, '_blank'); 
                        }}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                        </button>
                        <button className="action-btn delete-btn" onClick={(e) => { e.stopPropagation(); handleDelete(); }} disabled={isDeleting} title="Delete File">
                             {isDeleting ? 
                                <div className="spinner"></div> : 
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                             }
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

