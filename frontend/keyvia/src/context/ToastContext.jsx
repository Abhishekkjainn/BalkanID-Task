import { createContext, useContext, useState, useCallback } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
    const [toast, setToast] = useState(null);

    // useCallback ensures this function doesn't get recreated on every render
    const showToast = useCallback((message, type = 'success') => {
        setToast({ message, type, id: Date.now() }); // Use an ID to re-trigger animation
        setTimeout(() => {
            setToast(null);
        }, 3000); // Hide after 3 seconds
    }, []);

    const value = { showToast };

    return (
        <ToastContext.Provider value={value}>
            {children}
            {toast && <Toast key={toast.id} message={toast.message} type={toast.type} />}
        </ToastContext.Provider>
    );
}

export const useToast = () => useContext(ToastContext);

// The actual Toast component UI
function Toast({ message, type }) {
    return (
        <div className={`toast toast-${type}`}>
            {message}
        </div>
    );
}