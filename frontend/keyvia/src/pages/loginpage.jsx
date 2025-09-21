import { Link, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Loginpage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuth();
    const { showToast } = useToast();

    // If the user is already logged in, redirect them to the dashboard
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!username || !password) {
            showToast('Username and password are required', 'error');
            return;
        }
        setLoading(true);
        try {
            await login(username, password);
            navigate('/dashboard'); // On success, redirect
        } catch (err) {
            showToast(err.message, 'error'); // Show error toast on failure
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="loginpage">
            <div className="leftdiv"></div>
            <div className="rightdiv">
                <div className="form-container">
                    <h1 className="title">Welcome Back</h1>
                    <p className="subtitle">Login to your account to continue</p>
                    
                    <form onSubmit={handleSubmit}>
                        <div className="inputgroup">
                            <label className="formlabel">Enter Your Username</label>
                            <input 
                                type="text" 
                                placeholder="e.g., your_username" 
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
                            {loading ? 'Signing In...' : 'Sign In'}
                        </button>
                    </form>

                    <p className="formfooter">
                        Don’t have an account? <Link to={"/register"} className="formlink">Sign Up</Link> Instead
                    </p>
                </div>
            </div>
        </div>
    );
}