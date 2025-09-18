export default function Placeholder({ title, message }) {
    return (
        <div className="placeholder-container">
            <h2 className="placeholder-title">{title}</h2>
            <p className="placeholder-message">{message}</p>
        </div>
    );
}