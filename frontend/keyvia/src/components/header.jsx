import { Link } from 'react-router-dom';
export default function Header(){
    return <div className="header">
        <Link to={'/'} className="company">
            <img src="/bolt.png" alt="" className="companyicon" />
            <div className="companytag">Keyvia</div>
        </Link>
        <div className="linkdiv">
            <Link to={'/'} className="link">Home</Link>
            <Link to={'/dashboard'} className="link">Dashboard</Link>
            <div className="link">Documentation</div>
            <div className="link">Developer</div>
        </div>
    </div>
}