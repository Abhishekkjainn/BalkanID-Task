// import { useState } from 'react';
// import { useAuth } from '../context/AuthContext';
// import { useToast } from '../context/ToastContext';
// import * as api from '../services/api';

// export default function ShareModal({ isOpen, onClose, file }) {
//   const [shareUsername, setShareUsername] = useState('');
//   const [isLoading, setIsLoading] = useState(false);
//   const { token } = useAuth();
//   const { showToast } = useToast();

//   const handleSharePublic = async () => {
//     setIsLoading(true);
//     try {
//       const result = await api.shareFilePublicly(token, file.id);
//       navigator.clipboard.writeText(result.publicLink);
//       showToast('Public link copied to clipboard!', 'success');
//       onClose();
//     } catch (err) {
//       showToast(err.message, 'error');
//     } finally {
//       setIsLoading(false);
//     }
//   };

//   const handleShareWithUser = async (e) => {
//     e.preventDefault();
//     if (!shareUsername) return;
//     setIsLoading(true);
//     try {
//       const result = await api.shareFileWithUser(token, file.id, shareUsername);
//       showToast(result.message, 'success');
//       onClose();
//     } catch (err) {
//       showToast(err.message, 'error');
//     } finally {
//       setIsLoading(false);
//     }
//   };
  
//   if (!isOpen) return null;

//   return (
//     <div className="modal-overlay" onClick={onClose}>
//       <div className="modal" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <div className="modal-title">Share "{file.filename}"</div>
//           <button className="modal-close" onClick={onClose}>✕</button>
//         </div>
        
//         <div className="modal-content">
//           {/* Share with specific user section */}
//           <form onSubmit={handleShareWithUser}>
//             <label className="formlabel">Share with a specific user</label>
//             <div className="share-input-group">
//               <input 
//                 type="text" 
//                 placeholder="Enter username..." 
//                 className="forminput"
//                 value={shareUsername}
//                 onChange={(e) => setShareUsername(e.target.value)}
//               />
//               <button type="submit" className="confirm-button" disabled={isLoading || !shareUsername}>Share</button>
//             </div>
//           </form>

//           <div className="divider">OR</div>

//           {/* Public link section */}
//           <div className="public-share-section">
//             <label className="formlabel">Get a public link</label>
//             <p>Anyone with the link will be able to view and download this file.</p>
//             <button className="cancel-button" onClick={handleSharePublic} disabled={isLoading}>
//               {isLoading ? 'Generating...' : 'Copy Public Link'}
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


// import { useState, useEffect } from 'react';
// import * as api from '../services/api';
// import { useAuth } from '../context/AuthContext';
// import { useToast } from '../context/ToastContext';
// import { useFiles } from '../context/FileContext'; // To refresh the file list

// // A small spinner for loading states within buttons
// const ButtonSpinner = () => <div className="button-spinner"></div>;

// export default function ShareModal({ isOpen, onClose, file }) {
//   const { token } = useAuth();
//   const { showToast } = useToast();
//   const { refreshFiles, refreshSharedFiles } = useFiles(); // Get refresh functions from context

//   // Internal state to manage the UI instantly without closing the modal
//   const [isCurrentlyPublic, setIsCurrentlyPublic] = useState(false);
//   const [publicLink, setPublicLink] = useState('');
//   const [isToggling, setIsToggling] = useState(false);
//   const [copyButtonText, setCopyButtonText] = useState('Copy');

//   // State for sharing with a specific user
//   const [shareUsername, setShareUsername] = useState('');
//   const [isSharingUser, setIsSharingUser] = useState(false);

//   // Effect to reset the modal's state whenever a new file is opened
//   useEffect(() => {
//     if (isOpen && file) {
//       setIsCurrentlyPublic(file.isPublic);
//       setPublicLink(file.isPublic ? `http://localhost:8080/files/public/${file.id}` : '');
//       setCopyButtonText('Copy');
//       setShareUsername('');
//     }
//   }, [isOpen, file]);

//   if (!isOpen || !file) {
//     return null;
//   }

//   const handleMakePublic = async () => {
//     setIsToggling(true);
//     try {
//       const result = await api.shareFilePublicly(token, file.id);
//       setPublicLink(result.publicLink);
//       setIsCurrentlyPublic(true);
//       showToast('File is now public!', 'success');
//       await refreshFiles(); // Refresh parent lists
//       await refreshSharedFiles();
//     } catch (err) {
//       showToast(err.message, 'error');
//     } finally {
//       setIsToggling(false);
//     }
//   };

//   const handleMakePrivate = async () => {
//     setIsToggling(true);
//     try {
//       await api.makeFilePrivate(token, file.id);
//       setIsCurrentlyPublic(false);
//       setPublicLink('');
//       showToast('File is now private.', 'success');
//       await refreshFiles(); // Refresh parent lists
//       await refreshSharedFiles();
//     } catch (err) {
//       showToast(err.message, 'error');
//     } finally {
//       setIsToggling(false);
//     }
//   };

//   const handleCopyLink = () => {
//     navigator.clipboard.writeText(publicLink);
//     setCopyButtonText('Copied!');
//     setTimeout(() => setCopyButtonText('Copy'), 2000);
//   };
  
//   const handleShareWithUser = async (e) => {
//     e.preventDefault();
//     if (!shareUsername.trim()) {
//         showToast('Please enter a username.', 'error');
//         return;
//     }
//     setIsSharingUser(true);
//     try {
//         const result = await api.shareFileWithUser(token, file.id, shareUsername);
//         showToast(result.message, 'success');
//         setShareUsername(''); // Clear input on success
//         await refreshSharedFiles();
//     } catch (err) {
//         showToast(err.message, 'error');
//     } finally {
//         setIsSharingUser(false);
//     }
//   };


//   return (
//     <div className="modal-backdrop" onClick={onClose}>
//       <div className="modal-content" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <h2>Share File</h2>
//           <button onClick={onClose} className="close-btn">&times;</button>
//         </div>
//         <p className="share-filename" title={file.filename}>{file.filename}</p>

//         {/* --- Public Sharing Section --- */}
//         <div className="share-section">
//           <h3>Public Link</h3>
//           {isCurrentlyPublic ? (
//             // VIEW WHEN FILE IS PUBLIC
//             <div className="public-view">
//               <p>Anyone with this link can view and download this file.</p>
//               <div className="link-container">
//                 <input type="text" readOnly value={publicLink} />
//                 <button onClick={handleCopyLink} className="copy-btn">{copyButtonText}</button>
//               </div>
//               <button onClick={handleMakePrivate} className="toggle-private-btn" disabled={isToggling}>
//                 {isToggling ? <ButtonSpinner /> : 'Make Private'}
//               </button>
//             </div>
//           ) : (
//             // VIEW WHEN FILE IS PRIVATE
//             <div className="private-view">
//               <p>This file is currently private. Generate a public link to share it with anyone.</p>
//               <button onClick={handleMakePublic} className="toggle-public-btn" disabled={isToggling}>
//                 {isToggling ? <ButtonSpinner /> : 'Generate Public Link'}
//               </button>
//             </div>
//           )}
//         </div>
        
//         {/* --- User Sharing Section --- */}
//         <div className="share-section">
//             <h3>Share with a Specific User</h3>
//             <p>Share this file directly with another user on the platform.</p>
//             <form className="share-user-form" onSubmit={handleShareWithUser}>
//                 <input 
//                     type="text" 
//                     placeholder="Enter username" 
//                     value={shareUsername}
//                     onChange={(e) => setShareUsername(e.target.value)}
//                 />
//                 <button type="submit" disabled={isSharingUser}>
//                     {isSharingUser ? <ButtonSpinner /> : 'Share'}
//                 </button>
//             </form>
//         </div>

//       </div>
//     </div>
//   );
// }



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