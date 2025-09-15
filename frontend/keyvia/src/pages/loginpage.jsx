import { Link } from 'react-router-dom';
export default function Loginpage() {
    return (
        <div className="loginpage">
            <div className="leftdiv"></div>

            <div className="rightdiv">
                <div className="form-container">
                    <h1 className="title">Welcome Back</h1>
                    <p className="subtitle">Login to your account to continue</p>

                    <div className="inputgroup">
                        <label className="formlabel">Enter Your Email</label>
                        <input type="email" placeholder="you@example.com" className="forminput" />
                    </div>

                    <div className="inputgroup">
                        <label className="formlabel">Enter Your Password</label>
                        <input type="password" placeholder="••••••••" className="forminput" />
                    </div>

                    <div className="formbutton">Sign In</div>

                    <p className="formfooter">
                        Don’t have an account? <Link to={"/register"} className="formlink">Sign Up</Link> Instead
                    </p>
                </div>
            </div>
        </div>
    )
}
