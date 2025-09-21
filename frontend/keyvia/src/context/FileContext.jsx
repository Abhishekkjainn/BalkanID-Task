import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/api';
import { useToast } from './ToastContext';

const FileContext = createContext(null);

export function FileProvider({ children }) {
    const { token } = useAuth();
    const { showToast } = useToast();
    
    // State for main search/filter view
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({});

    // --- State for "Shared By Me" view ---
    const [sharedFiles, setSharedFiles] = useState([]);
    const [sharedFilesLoading, setSharedFilesLoading] = useState(true);

      const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    const fetchFiles = useCallback(async (currentFilters) => {
        if (!token) return;
        setLoading(true);
        setError(null);
        try {
            const fetchedFiles = await api.searchFiles(token, currentFilters);
            setFiles(fetchedFiles || []);
        } catch (err) {
            setError(err.message);
            setFiles([]);
        } finally {
            setLoading(false);
        }
    }, [token]);

    // --- Function to fetch files shared by the user ---
    const fetchSharedFiles = useCallback(async () => {
        if (!token) return;
        setSharedFilesLoading(true);
        try {
            const fetchedSharedFiles = await api.getSharedByMeFiles(token);
            setSharedFiles(fetchedSharedFiles || []);
        } catch (err) {
            // We can show a toast on error for this view as well
            showToast(`Could not fetch shared files: ${err.message}`, 'error');
            setSharedFiles([]);
        } finally {
            setSharedFilesLoading(false);
        }
    }, [token, showToast]);

    const fetchHistory = useCallback(async () => {
        if (!token) return;
        setHistoryLoading(true);
        try {
            const fetchedHistory = await api.getAuditLogs(token);
            setHistory(fetchedHistory || []);
        } catch (err) {
            showToast(`Could not fetch activity history: ${err.message}`, 'error');
            setHistory([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [token, showToast]);

    useEffect(() => {
        // This fetches for the main "All Files" and "Received" views
        fetchFiles(filters); 
        // This fetches for the "Shared By Me" view
        fetchHistory();
        fetchSharedFiles(); 
    }, [filters, fetchFiles, fetchSharedFiles]); // Add fetchSharedFiles to dependencies
    
    const deleteFile = async (fileId) => {
        try {
            await api.deleteFile(token, fileId);
            // UPDATE BOTH LISTS for a seamless UX
            setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
            setSharedFiles(prevShared => prevShared.filter(file => file.id !== fileId));
            showToast('File deleted successfully.', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };
    
    // Provide a way to manually refresh both lists
    const refreshFiles = () => fetchFiles(filters);
    const refreshSharedFiles = () => fetchSharedFiles(); // refresh function
    const refreshHistory = () => fetchHistory(); 


    const value = {
        files,
        loading,
        error,
        filters,
        setFilters,
        deleteFile,
        refreshFiles, 
        
        // --- Expose shared files state and functions ---
        sharedFiles,
        sharedFilesLoading,
        refreshSharedFiles,
        history,
        historyLoading,
        refreshHistory,
    };

    return (
        <FileContext.Provider value={value}>
            {children}
        </FileContext.Provider>
    );
}

export const useFiles = () => {
    return useContext(FileContext);
};