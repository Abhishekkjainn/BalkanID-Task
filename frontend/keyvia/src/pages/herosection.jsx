import { Link } from 'react-router-dom';
export default function HeroSection(){
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
            <Link to={'/login'} className="button1">Sign In</Link>
            <Link to={'/register'} className="button2">Register Now</Link>
        </div>
    </div>
}