import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function HeroSection(){
    const { user } = useAuth();
    return <div className="herosection">
        <div className="tagpill">
            <img src="/store.png" alt="" className="tagicon" />
            <div className="tagtext">Smarter File Vault</div>
        </div>
        <div className="tagline">
            Store, secure, and share files without waste, limits, or worry.
        </div>
        <div className="subtagline">Designed for efficiency and trust, this next-gen vault helps you upload, search, and share with confidence, while saving space through intelligent deduplication and ensuring every file remains secure and accessible</div>
        <div className="buttonsection">
            {user ? (<><Link to={'/login'} className="primbutton1">Go to Dashboard</Link> <Link to={'/documentation'} className="button2">Documentation</Link></>) : (<>
            <Link to={'/login'} className="button1">Sign In</Link>
            <Link to={'/register'} className="button2">Register Now</Link></>) }
            
        </div>
    </div>
}