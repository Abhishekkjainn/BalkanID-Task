export default function Placeholder({ title, message }) {
    return (
        <div className="placeholder-container">
            <img src="./empty.png" alt="" className="pimg" />
            <h2 className="placeholder-title">{title}</h2>
            <p className="placeholder-message">{message}</p>
        </div>
    );
}