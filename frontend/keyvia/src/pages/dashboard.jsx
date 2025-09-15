import { useState } from 'react';
import UploadModal from '../components/UploadModal';

export default function Dashboard() {
    const [isUploadOpen, setIsUploadOpen] = useState(false);

    const handleUpload = async (files) => {
        // TODO: integrate with backend; for now, just log
        console.log('Selected files to upload:', files);
    };

    return (
        <div className="dashboard">
            <div className="left">
                <div className="topleft">
                    <img src="/bolt.png" alt="xompany icon" className="compicon" />
                    <div className="comptag">Keyvia</div>
                </div>
            </div>
            <div className="right">
                <div className="topright">
                    <div className="toprightleft">
                        Hello Abhishek!
                    </div>
                    <div className="toprightright">
                        <div className="uploadbutton" onClick={() => setIsUploadOpen(true)}>Upload</div>
                        <div className="logoutbutton">Sign Out</div>
                    </div>
                </div>
                <div className="bottomright">
                    <div className="filtertab">
                        <div className="filter">All Files (16)</div>
                        <div className="filter">Shared (6)</div>
                        <div className="filter">Recieved (2)</div>
                        <div className="filter">Analytics</div>
                    </div>
                </div>
            </div>
            <UploadModal
                isOpen={isUploadOpen}
                onClose={() => setIsUploadOpen(false)}
                onUpload={handleUpload}
            />
        </div>
    )
}