import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import * as api from '../services/api';

export default function ShareModal({ isOpen, onClose, file }) {
  const [shareUsername, setShareUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { token } = useAuth();
  const { showToast } = useToast();

  const handleSharePublic = async () => {
    setIsLoading(true);
    try {
      const result = await api.shareFilePublicly(token, file.id);
      navigator.clipboard.writeText(result.publicLink);
      showToast('Public link copied to clipboard!', 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShareWithUser = async (e) => {
    e.preventDefault();
    if (!shareUsername) return;
    setIsLoading(true);
    try {
      const result = await api.shareFileWithUser(token, file.id, shareUsername);
      showToast(result.message, 'success');
      onClose();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setIsLoading(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">Share "{file.filename}"</div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        
        <div className="modal-content">
          {/* Share with specific user section */}
          <form onSubmit={handleShareWithUser}>
            <label className="formlabel">Share with a specific user</label>
            <div className="share-input-group">
              <input 
                type="text" 
                placeholder="Enter username..." 
                className="forminput"
                value={shareUsername}
                onChange={(e) => setShareUsername(e.target.value)}
              />
              <button type="submit" className="confirm-button" disabled={isLoading || !shareUsername}>Share</button>
            </div>
          </form>

          <div className="divider">OR</div>

          {/* Public link section */}
          <div className="public-share-section">
            <label className="formlabel">Get a public link</label>
            <p>Anyone with the link will be able to view and download this file.</p>
            <button className="cancel-button" onClick={handleSharePublic} disabled={isLoading}>
              {isLoading ? 'Generating...' : 'Copy Public Link'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}