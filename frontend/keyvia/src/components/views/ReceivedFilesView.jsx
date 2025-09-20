import { useFiles } from '../../context/FileContext';
import { useAuth } from '../../context/AuthContext';
import Loader from '../loader';
import Placeholder from '../Placeholder';
import FileCard from '../FileCard';

export default function ReceivedFilesView({ openShareModal, openPreviewModal }) {
    const { files, loading, error } = useFiles();
    const { user } = useAuth(); // Not strictly needed for filtering anymore, but maybe for other UI elements

    if (loading) {
        return <Loader />;
    }
    
    if (error) {
        return <Placeholder 
            title="An Error Occurred"
            message={`Failed to fetch files: ${error}`}
        />;
    }
    
    // Filter files to only include ones that have the 'sharedBy' property.
    
    const receivedFiles = (files)? files.filter(file => file.sharedBy) : "";

    if (receivedFiles && receivedFiles.length === 0) {
        return <Placeholder 
            title="No Received Files"
            message="No files have been shared with you yet."
        />;
    }

    return (
        <div className="filesdiv">
            {!receivedFiles && <Placeholder 
            title="No Received Files"
            message="No files have been shared with you yet."
        />}
            {receivedFiles && receivedFiles.map(file => (
                <FileCard key={file.id} file={file} onShare={() => openShareModal(file)} onPreview={() => openPreviewModal(file)} />
            ))}
        </div>
    );
}