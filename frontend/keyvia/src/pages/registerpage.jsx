// import { Link, useNavigate } from 'react-router-dom';
// import { useState, useEffect } from 'react';
// import { signup } from '../services/api';
// import { useAuth } from '../context/AuthContext';
// import { useToast } from '../context/ToastContext';

// export default function Registerpage() {
//     const [name, setName] = useState('');
//     const [username, setUsername] = useState('');
//     const [password, setPassword] = useState('');
//     const [loading, setLoading] = useState(false);
    
//     const navigate = useNavigate();
//     const { isAuthenticated } = useAuth();
//     const { showToast } = useToast();

//     // If the user is already logged in, redirect them away
//     useEffect(() => {
//         if (isAuthenticated) {
//             navigate('/dashboard');
//         }
//     }, [isAuthenticated, navigate]);

//     const handleSubmit = async (e) => {
//         e.preventDefault();
//         // Simple validation
//         if (password.length < 6) {
//             showToast("Password must be at least 6 characters long.", "error");
//             return;
//         }
//         setLoading(true);
//         try {
//             await signup(name, username, password);
//             showToast('Signup successful! Please log in.', 'success');
//             setTimeout(() => {
//                 navigate('/login'); // Redirect to login after a short delay
//             }, 1500);
//         } catch (err) {
//             showToast(err.message, 'error');
//         } finally {
//             setLoading(false);
//         }
//     };

//     return (
//         <div className="loginpage">
//             <div className="leftdiv"></div>
//             <div className="rightdiv">
//                 <div className="form-container">
//                     <h1 className="title">Create an Account</h1>
//                     <p className="subtitle">Join us to start managing your files</p>

//                     <form onSubmit={handleSubmit}>
//                         <div className="inputgroup">
//                             <label className="formlabel">Enter Your Name</label>
//                             <input 
//                                 type="text" 
//                                 placeholder="e.g., Abhishek Jain" 
//                                 className="forminput"
//                                 value={name}
//                                 onChange={(e) => setName(e.target.value)}
//                                 required
//                             />
//                         </div>

//                         <div className="inputgroup">
//                             <label className="formlabel">Enter Your Username</label>
//                             <input 
//                                 type="text" 
//                                 placeholder="e.g., abhishek123" 
//                                 className="forminput"
//                                 value={username}
//                                 onChange={(e) => setUsername(e.target.value)}
//                                 required
//                             />
//                         </div>

//                         <div className="inputgroup">
//                             <label className="formlabel">Enter Your Password</label>
//                             <input 
//                                 type="password" 
//                                 placeholder="••••••••" 
//                                 className="forminput"
//                                 value={password}
//                                 onChange={(e) => setPassword(e.target.value)}
//                                 required
//                             />
//                         </div>

//                         <button type="submit" className="formbutton" disabled={loading}>
//                             {loading ? 'Creating Account...' : 'Sign Up'}
//                         </button>
//                     </form>

//                     <p className="formfooter">
//                         Already have an account? <Link to={"/login"} className="formlink">Sign In</Link> Instead
//                     </p>
//                 </div>
//             </div>
//         </div>
//     );
// }

import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { signup } from '../services/api';
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

    // Added state for validation errors
    const [nameError, setNameError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validateForm = () => {
        let isValid = true;

        // Reset all errors
        setNameError('');
        setUsernameError('');
        setPasswordError('');

        // Name validation
        if (!name.trim()) {
            setNameError('Name cannot be empty.');
            isValid = false;
        } else if (name.length < 3) {
            setNameError('Name must be at least 3 characters long.');
            isValid = false;
        }

        // Username validation
        if (!username.trim()) {
            setUsernameError('Username cannot be empty.');
            isValid = false;
        } else if (username.length < 5) {
            setUsernameError('Username must be at least 5 characters long.');
            isValid = false;
        } else if (!/^[a-zA-Z0-9_.]+$/.test(username)) {
            setUsernameError('Username can only contain letters, numbers, underscores, or periods.');
            isValid = false;
        }

        // Password validation
        if (password.length < 8) {
            setPasswordError('Password must be at least 8 characters long.');
            isValid = false;
        } else if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}/.test(password)) {
            setPasswordError('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.');
            isValid = false;
        }

        return isValid;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!validateForm()) {
            showToast('Please correct the errors in the form.', 'error');
            return;
        }

        setLoading(true);
        try {
            await signup(name, username, password);
            showToast('Signup successful! Please log in.', 'success');
            setTimeout(() => {
                navigate('/login');
            }, 1500);
        } catch (err) {
            // Handle specific backend errors
            const errorMessage = err.response?.data?.message || err.message;
            showToast(errorMessage, 'error');
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
                            {nameError && <p className="error-message">{nameError}</p>}
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
                            {usernameError && <p className="error-message">{usernameError}</p>}
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
                            {passwordError && <p className="error-message">{passwordError}</p>}
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
