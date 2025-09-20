export default function ProgressBar({progress}){
    return (
        <div className="progressbarback">
        <div className="progress-bar-container">
            
            <div 
                className="progress-bar-filler" 
                style={{ width: `${progress}%` }} 
            />
            <span className="progress-bar-label">{`${progress}%`}</span>
        </div>
        </div>
    );
};