import { useFiles } from '../../context/FileContext';
import Loader from '../loader';
import Placeholder from '../Placeholder';
import FileCard from '../FileCard';

export default function AllFilesView({ openShareModal }) {
    const { files, loading, error } = useFiles();

    if (loading) {
        return <Loader />;
    }
    
    if (error) {
        return <Placeholder 
            title="An Error Occurred"
            message={`Failed to fetch files: ${error}`}
        />;
    }
    
    if (!files || files.length === 0) {
        return <Placeholder 
            title="No Files Found"
            message="Your file space is empty. Try uploading something!"
        />;
    }

    return (
        <div className="file-grid">
            {files.map(file => (
                <FileCard key={file.id} file={file} onShare={() => openShareModal(file)} />
            ))}
        </div>
    );
}