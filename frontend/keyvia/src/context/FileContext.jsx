import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import * as api from '../services/api';
import { useToast } from './ToastContext';

const FileContext = createContext(null);


export function FileProvider({ children }) {
    const { token } = useAuth();
    const { showToast } = useToast();
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filters, setFilters] = useState({});

    

    const fetchFiles = useCallback(async (currentFilters) => {
        if (!token) return;

        setLoading(true);
        setError(null);
        try {
            // THIS IS THE CHANGE: Activate the API call
            const fetchedFiles = await api.searchFiles(token, currentFilters);
            setFiles(fetchedFiles);
        } catch (err) {
            setError(err.message);
            setFiles([]); // Clear old files on error
        } finally {
            setLoading(false);
        }
    }, [token]);


    useEffect(() => {
        fetchFiles(filters);
    }, [filters, fetchFiles]);
    
    const deleteFile = async (fileId) => {
        try {
            await api.deleteFile(token, fileId);
            // On success, update the state instantly for a great UX
            setFiles(prevFiles => prevFiles.filter(file => file.id !== fileId));
            showToast('File deleted successfully.', 'success');
        } catch (err) {
            showToast(err.message, 'error');
        }
    };
    
    // Provide a way to manually refresh the file list after an upload
    const refreshFiles = () => fetchFiles(filters);

    const value = {
        files,
        loading,
        error,
        filters,
        setFilters,
        deleteFile,
        refreshFiles, 
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