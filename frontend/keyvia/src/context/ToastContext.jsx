// import { createContext, useContext, useState, useCallback } from 'react';

// const ToastContext = createContext(null);

// export function ToastProvider({ children }) {
//     const [toast, setToast] = useState(null);

//     // useCallback ensures this function doesn't get recreated on every render
//     const showToast = useCallback((message, type = 'success') => {
//         setToast({ message, type, id: Date.now() }); // Use an ID to re-trigger animation
//         setTimeout(() => {
//             setToast(null);
//         }, 3000000); // Hide after 3 seconds
//     }, []);

//     const value = { showToast };

//     return (
//         <ToastContext.Provider value={value}>
//             {children}
//             {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
//         </ToastContext.Provider>
//     );
// }

// export const useToast = () => useContext(ToastContext);

// // The actual Toast component UI
// function Toast({ message, type }) {
//     return (
//         <div className={`toast toast-${type}`}>
//             {message}
//         </div>
//     );
// }


import { createContext, useContext, useState, useCallback, useEffect } from 'react';

const ToastContext = createContext(null);

// --- Icons for different toast types ---
const ICONS = {
  success: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  ),
};

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  // Corrected timeout: 3000ms = 3 seconds
  const showToast = useCallback((message, type = 'success') => {
    setToast({ message, type, id: Date.now() });
  }, []);

  const hideToast = useCallback(() => {
    setToast(null);
  }, []);

  const value = { showToast };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast && (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={hideToast}
        />
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);

// The actual Toast component UI
function Toast({ message, type, onClose }) {
  // Automatically hide the toast after a delay
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000); // Hide after 3 seconds

    // Cleanup the timer if the component is unmounted or closed manually
    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-icon">{ICONS[type]}</div>
      <p className="toast-message">{message}</p>
      <button className="toast-close-btn" onClick={onClose}>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}