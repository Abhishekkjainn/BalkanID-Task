// import { Link } from 'react-router-dom';
// export default function Registerpage() {
//     return (
//          <div className="loginpage">
//             <div className="leftdiv"></div>

//             <div className="rightdiv">
//                 <div className="form-container">
//                     <h1 className="title">Join the Cult</h1>
//                     <p className="subtitle">Create an account to continue</p>
//                     <div className="inputgroup">
//                         <label className="formlabel">Enter Your Name</label>
//                         <input type="email" placeholder="Abhishek Jain" className="forminput" />
//                     </div>

//                     <div className="inputgroup">
//                         <label className="formlabel">Enter Your Email</label>
//                         <input type="email" placeholder="you@example.com" className="forminput" />
//                     </div>

//                     <div className="inputgroup">
//                         <label className="formlabel">Enter Your Password</label>
//                         <input type="password" placeholder="••••••••" className="forminput" />
//                     </div>

//                     <div className="formbutton">Sign Up</div>

//                     <p className="formfooter">
//                         Already have an account? <Link to={"/login"} className="formlink">Sign In</Link> Instead
//                     </p>
//                 </div>
//             </div>
//         </div>
//     )
// }


import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { signup } from '../services/api'; // Direct API call
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Registerpage() {
    const [name, setName] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate();
    const { isAuthenticated } = useAuth();
    const { showToast } = useToast();

    // If the user is already logged in, redirect them away
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        // Simple validation
        if (password.length < 6) {
            showToast("Password must be at least 6 characters long.", "error");
            return;
        }
        setLoading(true);
        try {
            await signup(name, username, password);
            showToast('Signup successful! Please log in.', 'success');
            setTimeout(() => {
                navigate('/login'); // Redirect to login after a short delay
            }, 1500);
        } catch (err) {
            showToast(err.message, 'error');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="loginpage">
            <div className="leftdiv"></div>
            <div className="rightdiv">
                <div className="form-container">
                    <h1 className="title">Create an Account</h1>
                    <p className="subtitle">Join us to start managing your files</p>

                    <form onSubmit={handleSubmit}>
                        <div className="inputgroup">
                            <label className="formlabel">Enter Your Name</label>
                            <input 
                                type="text" 
                                placeholder="e.g., Abhishek Jain" 
                                className="forminput"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="inputgroup">
                            <label className="formlabel">Enter Your Username</label>
                            <input 
                                type="text" 
                                placeholder="e.g., abhishek123" 
                                className="forminput"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                required
                            />
                        </div>

                        <div className="inputgroup">
                            <label className="formlabel">Enter Your Password</label>
                            <input 
                                type="password" 
                                placeholder="••••••••" 
                                className="forminput"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="formbutton" disabled={loading}>
                            {loading ? 'Creating Account...' : 'Sign Up'}
                        </button>
                    </form>

                    <p className="formfooter">
                        Already have an account? <Link to={"/login"} className="formlink">Sign In</Link> Instead
                    </p>
                </div>
            </div>
        </div>
    );
}