import { useEffect } from 'react';

export default function PreviewModal({ isOpen, onClose, file }) {
  // Add keyboard support to close the modal with the Escape key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.keyCode === 27) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen || !file) {
    return null;
  }

  const isImage = file.mimeType.startsWith('image/');
  const isPdf = file.mimeType === 'application/pdf';

  return (
    <div className="pm-backdrop" onClick={onClose}>
      <div className="pm-content" onClick={(e) => e.stopPropagation()}>
        <div className="pm-header">
          <p className="pm-filename" title={file.filename}>{file.filename}</p>
          <button onClick={onClose} className="pm-close-btn">&times;</button>
        </div>
        <div className="pm-body">
          {isImage && (
            <img src={file.url} alt={`Preview of ${file.filename}`} />
          )}
          {isPdf && (
            <object data={file.url} type="application/pdf">
              <p>Your browser does not support PDF previews. Please download the file to view it.</p>
            </object>
          )}
        </div>
      </div>
    </div>
  );
}