// src/components/ProfileModal.js
import React, { useEffect } from 'react';
import StorageIndicator from './StorageIndicator'; // We'll create this next

export default function ProfileModal({ user, stats, isOpen, onClose }) {
  // Effect to handle closing the modal with the 'Escape' key
  useEffect(() => {
    const handleEsc = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('keydown', handleEsc);
    };
  }, [onClose]);

  if (!isOpen) return null;

  return (
    // The overlay closes the modal when clicked
    <div className="profile-modal-overlay" onClick={onClose}>
      {/* stopPropagation prevents clicks inside the modal from closing it */}
      <div className="profile-modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose} aria-label="Close modal">
          &times;
        </button>

        <div className="profile-header">
          <img
            src={user?.avatarUrl || `https://i.pravatar.cc/150?u=${user?.username}`}
            alt={`${user?.name}'s avatar`}
            className="profile-avatar"
          />
          <div className="profile-info">
            <h2 className="profile-name">{user?.name || 'User Name'}</h2>
            <p className="profile-username">@{user?.username || 'username'}</p>
          </div>
        </div>

        {/* --- Storage Indicator Integration --- */}
        {stats && (
          <StorageIndicator
            currentUsage={stats.deduplicatedUsageBytes}
            maxStorage={10 * 1024 * 1024} // 10 MB example
          />
        )}
      </div>
    </div>
  );
}