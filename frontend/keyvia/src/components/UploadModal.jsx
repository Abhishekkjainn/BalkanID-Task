import { useState, useRef, useCallback } from 'react';

export default function UploadModal({ isOpen, onClose, onUpload }) {
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    const handleFiles = useCallback((filesList) => {
        const files = Array.from(filesList || []);
        const enrichedFiles = files.map(file => ({
            id: `${file.name}-${file.size}-${file.lastModified}`,
            file,
        }));
        setSelectedFiles(prev => [...prev, ...enrichedFiles]);
    }, []);

    const onInputChange = useCallback((e) => {
        handleFiles(e.target.files);
        if (inputRef.current) inputRef.current.value = ''; // Reset input
    }, [handleFiles]);
    
    const onDrop = useCallback((e) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files?.length) {
            handleFiles(e.dataTransfer.files);
        }
    }, [handleFiles]);
    
    const removeItem = (id) => {
        setSelectedFiles(prev => prev.filter(item => item.id !== id));
    };

    const handleUpload = () => {
        const filesToUpload = selectedFiles.map(item => item.file);
        onUpload(filesToUpload);
        onClose();
        setSelectedFiles([]);
    };

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Upload Files</div>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>
                
                <div 
                    className={`dropzone ${isDragging ? 'dragging' : ''}`}
                    onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={onDrop}
                >
                    <p>Drag & drop files here</p>
                    <p>or</p>
                    <button className="browse-button" onClick={() => inputRef.current?.click()}>Browse Files</button>
                    <input type="file" multiple ref={inputRef} className="hidden-input" onChange={onInputChange} />
                </div>

                {selectedFiles.length > 0 && (
                    <div className="file-list">
                        {selectedFiles.map(item => (
                            <div key={item.id} className="file-row">
                                <span className="file-name">{item.file.name}</span>
                                <button className="file-remove" onClick={() => removeItem(item.id)}>Remove</button>
                            </div>
                        ))}
                    </div>
                )}
                
                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose}>Cancel</button>
                    <button className="confirm-button" onClick={handleUpload} disabled={selectedFiles.length === 0}>
                        Upload {selectedFiles.length} file(s)
                    </button>
                </div>
            </div>
        </div>
    );
}