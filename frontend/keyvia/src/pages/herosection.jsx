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

// import { Link } from 'react-router-dom';
// // NEW: Import the useAuth hook to access the logged-in user's state
// import { useAuth } from '../context/AuthContext';

// export default function HeroSection() {
//     // NEW: Get the user object from the AuthContext.
//     // `user` will be an object if logged in, or null if logged out.
//     const { user } = useAuth();

//     return (
//         <div className="herosection">
//             <div className="tagpill">
//                 <img src="/store.png" alt="" className="tagicon" />
//                 <div className="tagtext">Smarter File Vault</div>
//             </div>
//             <div className="tagline">
//                 Store, secure, and share files without waste, limits, or worry.
//             </div>
//             <div className="subtagline">
//                 Designed for efficiency and trust, this next-gen vault helps you upload, search, and share with confidence, while saving space through intelligent deduplication and ensuring every file remains secure and accessible
//             </div>

//             {/* UPDATED: Conditional rendering for the buttons */}
//             <div className="buttonsection">
//                 {user ? (
//                     // If user is logged in, show this button
//                     <Link to={'/dashboard'} className="primbutton1">
//                         Go to Your Dashboard
//                     </Link>
//                 ) : (
//                     // If user is logged out, show these buttons
//                     <>
//                         <Link to={'/login'} className="button1">Sign In</Link>
//                         <Link to={'/register'} className="button2">Register Now</Link>
//                     </>
//                 )}
//             </div>
//         </div>
//     );
// }
