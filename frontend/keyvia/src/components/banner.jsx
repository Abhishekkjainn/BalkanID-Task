import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
export default function Banner(){
    const { user } = useAuth();
    return <div className="bannerdiv">
    <div className="banner">
                <div className="banner-content">
                    <h1 className="banner-title">Secure Your Digital World</h1>
                    <p className="banner-desc">A next-gen vault for your files with intelligent deduplication, blazing-fast search, and sharing that feels effortless.</p>
                    <div className="banner-actions">
                        {user ? (<><Link to={'/login'} className="primbutton1">Go to Dashboard</Link> <Link to={'/documentation'} className="button2">Documentation</Link></>) : (<>
            <Link to={'/login'} className="button1">Sign In</Link>
            <Link to={'/register'} className="button2">Register Now</Link></>) }
                    </div>
                </div>
            </div>
            </div>
}