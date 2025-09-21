import { useState, useEffect } from 'react';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useFiles } from '../context/FileContext';

const ButtonSpinner = () => <div className="sm-spinner"></div>;

export default function ShareModal({ isOpen, onClose, file }) {
  const { token } = useAuth();
  const { showToast } = useToast();
  const { refreshFiles, refreshSharedFiles } = useFiles();

  const [isCurrentlyPublic, setIsCurrentlyPublic] = useState(false);
  const [publicLink, setPublicLink] = useState('');
  const [isToggling, setIsToggling] = useState(false);
  const [copyButtonText, setCopyButtonText] = useState('Copy');
  const [shareUsername, setShareUsername] = useState('');
  const [isSharingUser, setIsSharingUser] = useState(false);

  useEffect(() => {
    if (isOpen && file) {
      setIsCurrentlyPublic(file.isPublic);
      setPublicLink(file.isPublic ? `http://localhost:8080/files/public/${file.id}` : '');
      setCopyButtonText('Copy');
      setShareUsername('');
    }
  }, [isOpen, file]);

  if (!isOpen || !file) {
    return null;
  }

  const handleMakePublic = async () => {
    setIsToggling(true);
    try {
      const result = await api.shareFilePublicly(token, file.id);
      setPublicLink(result.publicLink);
      setIsCurrentlyPublic(true);
      showToast('File is now public!', 'success');
      await refreshFiles();
      await refreshSharedFiles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleMakePrivate = async () => {
    setIsToggling(true);
    try {
      await api.makeFilePrivate(token, file.id);
      setIsCurrentlyPublic(false);
      setPublicLink('');
      showToast('File is now private.', 'success');
      await refreshFiles();
      await refreshSharedFiles();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsToggling(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopyButtonText('Copied!');
    setTimeout(() => setCopyButtonText('Copy'), 2000);
  };
  
  const handleShareWithUser = async (e) => {
    e.preventDefault();
    if (!shareUsername.trim()) {
        showToast('Please enter a username.', 'error');
        return;
    }
    setIsSharingUser(true);
    try {
        const result = await api.shareFileWithUser(token, file.id, shareUsername);
        showToast(result.message, 'success');
        setShareUsername('');
        await refreshSharedFiles();
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        setIsSharingUser(false);
    }
  };

  return (
    <div className="sm-backdrop" onClick={onClose}>
      <div className="sm-content" onClick={(e) => e.stopPropagation()}>
        <div className="sm-header">
          <h2 className="sm-title">Share File</h2>
          <button onClick={onClose} className="sm-close-btn">&times;</button>
        </div>
        <div className="sm-filename-display" title={file.filename}>
          {file.filename}
        </div>

        {/* --- Public Sharing Section --- */}
        <div className="sm-section">
          <h3 className="sm-section-title">Public Link</h3>
          {isCurrentlyPublic ? (
            <div className="sm-public-view">
              <p className="sm-section-p">Anyone with this link can view and download.</p>
              <div className="sm-input-group">
                <input type="text" readOnly value={publicLink} />
                <button onClick={handleCopyLink} className="sm-btn sm-btn-secondary">{copyButtonText}</button>
              </div>
              <button onClick={handleMakePrivate} className="sm-btn sm-btn-danger" disabled={isToggling}>
                {isToggling ? <ButtonSpinner /> : 'Make Private'}
              </button>
            </div>
          ) : (
            <div className="sm-private-view">
              <p className="sm-section-p">This file is private. Generate a public link to share it.</p>
              <button onClick={handleMakePublic} className="sm-btn sm-btn-primary" disabled={isToggling}>
                {isToggling ? <ButtonSpinner /> : 'Generate Public Link'}
              </button>
            </div>
          )}
        </div>
        
        {/* --- User Sharing Section --- */}
        <div className="sm-section">
          <h3 className="sm-section-title">Share with a Specific User</h3>
          <p className="sm-section-p">Share directly with another user on the platform.</p>
          <form className="sm-input-group" onSubmit={handleShareWithUser}>
            <input 
              type="text" 
              placeholder="Enter username" 
              value={shareUsername}
              onChange={(e) => setShareUsername(e.target.value)}
            />
            <button type="submit" className="sm-btn sm-btn-primary" disabled={isSharingUser}>
              {isSharingUser ? <ButtonSpinner /> : 'Share'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}