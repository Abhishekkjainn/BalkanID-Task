import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { sniffMimeFromBytes } from '../utils/mimeSniff';

export default function UploadModal({ isOpen, onClose, onUpload }) {
    const [selectedItems, setSelectedItems] = useState([]);
    const [isDragging, setIsDragging] = useState(false);
    const inputRef = useRef(null);

    useEffect(() => {
        if (!isOpen) {
            setSelectedItems([]);
            setIsDragging(false);
        }
    }, [isOpen]);

    const handleFiles = useCallback(async (filesList) => {
        const files = Array.from(filesList || []);
        const enriched = await Promise.all(files.map(async (file) => {
            const arrayBuffer = await file.slice(0, 4100).arrayBuffer();
            const bytes = new Uint8Array(arrayBuffer);
            const sniff = sniffMimeFromBytes(bytes);
            const declaredType = file.type || '';
            const detectedType = sniff?.mime || '';
            const isMatch = detectedType ? declaredType.startsWith(detectedType.split(';')[0]) || detectedType.startsWith(declaredType.split(';')[0]) : true;
            return {
                id: `${file.name}-${file.size}-${file.lastModified}`,
                file,
                declaredType,
                detectedType,
                isMatch,
                issue: isMatch ? '' : `Declared ${declaredType || 'unknown'} != detected ${detectedType || 'unknown'}`,
            };
        }));
        setSelectedItems((prev) => [...prev, ...enriched]);
    }, []);

    const onInputChange = useCallback(async (e) => {
        await handleFiles(e.target.files);
        if (inputRef.current) inputRef.current.value = '';
    }, [handleFiles]);

    const onDrop = useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        const dt = e.dataTransfer;
        if (dt?.files?.length) {
            await handleFiles(dt.files);
        }
    }, [handleFiles]);

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const onDragLeave = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
    }, []);

    const hasIssues = useMemo(() => selectedItems.some((i) => !i.isMatch), [selectedItems]);

    const removeItem = useCallback((id) => {
        setSelectedItems((prev) => prev.filter((i) => i.id !== id));
    }, []);

    const startUpload = useCallback(async () => {
        if (!onUpload) {
            console.log('Uploading files', selectedItems.map(s => s.file));
            onClose?.();
            return;
        }
        await onUpload(selectedItems.map(s => s.file), { selectedItems });
        onClose?.();
    }, [onUpload, selectedItems, onClose]);

    if (!isOpen) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title">Upload files</div>
                    <button className="modal-close" onClick={onClose} aria-label="Close upload dialog">✕</button>
                </div>

                <div
                    className={`dropzone ${isDragging ? 'dragging' : ''}`}
                    onDrop={onDrop}
                    onDragOver={onDragOver}
                    onDragLeave={onDragLeave}
                    role="button"
                    tabIndex={0}
                >
                    <div className="dropzone-text">Drag & drop files here</div>
                    <div className="dropzone-subtext">or</div>
                    <button className="browse-button" onClick={() => inputRef.current?.click()}>Browse files</button>
                    <input
                        ref={inputRef}
                        type="file"
                        multiple
                        className="hidden-input"
                        onChange={onInputChange}
                    />
                </div>

                {selectedItems.length > 0 && (
                    <div className="file-list">
                        {selectedItems.map((item) => (
                            <div key={item.id} className="file-row">
                                <div className="file-info">
                                    <div className="file-name">{item.file.name}</div>
                                    <div className="file-meta">
                                        {(item.file.size / 1024).toFixed(1)} KB • declared: {item.declaredType || 'unknown'}{item.detectedType ? ` • detected: ${item.detectedType}` : ''}
                                    </div>
                                </div>
                                <div className={`file-status ${item.isMatch ? 'ok' : 'warn'}`}>
                                    {item.isMatch ? 'OK' : 'Mismatch'}
                                </div>
                                <button className="file-remove" onClick={() => removeItem(item.id)}>Remove</button>
                            </div>
                        ))}
                        {hasIssues && (
                            <div className="file-warning">Some files have mismatched MIME types. Continue only if you trust them.</div>
                        )}
                    </div>
                )}

                <div className="modal-footer">
                    <button className="cancel-button" onClick={onClose}>Cancel</button>
                    <button className="confirm-button" onClick={startUpload} disabled={selectedItems.length === 0}>Upload</button>
                </div>
            </div>
        </div>
    );
}


