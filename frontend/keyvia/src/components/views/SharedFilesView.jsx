import { useFiles } from '../../context/FileContext';
import Loader from '../loader';
import Placeholder from '../Placeholder';
import FileCard from '../FileCard';

// You will likely pass this function from the parent component (e.g., Dashboard.js)
export default function SharedFilesView({ openShareModal, openPreviewModal }) {
    // Destructure the NEW state properties from the useFiles hook
    const { sharedFiles, sharedFilesLoading } = useFiles();

    if (sharedFilesLoading) {
        return <Loader />;
    }
    
    if (sharedFiles&&sharedFiles.length === 0) {
        return <Placeholder 
            title="No Files Shared"
            message="You haven't shared any files with other users yet."
        />;
    }

    return (
        <div className="filesdiv">
            {!sharedFiles &&
                <Placeholder 
            title="No Files Shared"
            message="You haven't shared any files with other users yet."
        />
            }
            {sharedFiles&&sharedFiles.map(file => (
                // The FileCard now receives the file object which includes the `sharedWith` array!
                <FileCard key={file.id} file={file} onShare={() => openShareModal(file)} onPreview={() => openPreviewModal(file)} />
            ))}
        </div>
    );
}