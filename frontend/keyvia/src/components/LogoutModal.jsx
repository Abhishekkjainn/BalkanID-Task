import React, { useEffect } from 'react';

export default function LogoutModal({ logout, isOpen, onClose }) {
  // Return null if the modal is not supposed to be open
  if (!isOpen) {
    return null;
  }

  // Effect to handle closing the modal with the 'Escape' key for accessibility
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    // Add event listener when the component mounts
    window.addEventListener('keydown', handleKeyDown);

    // Clean up the event listener when the component unmounts
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]); // Dependency array ensures this effect only re-runs if onClose changes

  return (
    <>
      {/* Styles are embedded directly to resolve the CSS import error */}
      <style>{`
        /* --- CSS Variables for easy theming --- */
        :root {
          --modal-bg: #161b22;
          --modal-border: #30363d;
          --text-primary: #e6edf3;
          --text-secondary: #7d8590;
          --button-secondary-bg: #21262d;
          --danger-color: #da3633;
          --danger-color-hover: #f85149;
        }

        /* --- Base Modal Overlay (Shared by all modals) --- */
        .modal-overlay {
          position: fixed;
          inset: 0;
          background-color: rgba(13, 17, 23, 0.85);
          backdrop-filter: blur(4px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.2s ease-out;
        }

        /* --- Modal Card --- */
        .modal-card {
          background-color: var(--modal-bg);
          border: 1px solid var(--modal-border);
          border-radius: 12px;
          width: max-content;
          max-width: 400px;
          padding: 24px;
          display: flex;
          flex-direction: column;
          align-items: center; /* Center content */
          text-align: center;
          gap: 12px;
          animation: scaleIn 0.2s ease-out;
        }

        .modal-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background-color: var(--button-secondary-bg);
          border: 1px solid var(--modal-border);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-secondary); /* SVG will inherit this color */
          margin-bottom: 8px;
        }

        .modal-title {
          font-size: 20px;
          font-weight: 600;
          color: var(--text-primary);
          margin: 0;
        }

        .modal-text {
          color: var(--text-secondary);
          font-size: 14px;
          line-height: 1.5;
          margin: 0;
          max-width: 300px; /* Keep line length readable */
        }

        .modal-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          width: 100%;
          margin-top: 16px;
        }

        /* --- Generic Modal Buttons --- */
        .modal-button {
          padding: 10px 16px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }

        .modal-button.secondary {
          background-color: var(--button-secondary-bg);
          color: var(--text-primary);
          border: 1px solid var(--modal-border);
        }

        .modal-button.secondary:hover {
          border-color: var(--text-secondary);
        }

        .modal-button.danger {
          background-color: var(--danger-color);
          color: #fff;
        }

        .modal-button.danger:hover {
          background-color: var(--danger-color-hover);
        }

        /* --- Animations (Shared) --- */
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes scaleIn {
          from {
            opacity: 0;
            transform: translateY(10px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
      
      {/* The overlay covers the screen and closes the modal when clicked */}
      <div className="modal-overlay" onClick={onClose}>
        {/* The modal card itself. Clicks inside are stopped from closing the modal */}
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <div className="modal-icon-wrapper">
            {/* A simple SVG icon to represent logging out */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
          </div>

          <h2 className="modal-title">Confirm Log Out</h2>
          <p className="modal-text">Are you sure you want to log out of your account?</p>

          <div className="modal-actions">
            <button className="modal-button secondary" onClick={onClose}>
              Cancel
            </button>
            <button className="modal-button danger" onClick={logout}>
              Log Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

