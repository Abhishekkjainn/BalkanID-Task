import { Link } from 'react-router-dom';
export default function Registerpage() {
    return (
         <div className="loginpage">
            <div className="leftdiv"></div>

            <div className="rightdiv">
                <div className="form-container">
                    <h1 className="title">Join the Cult</h1>
                    <p className="subtitle">Create an account to continue</p>
                    <div className="inputgroup">
                        <label className="formlabel">Enter Your Name</label>
                        <input type="email" placeholder="Abhishek Jain" className="forminput" />
                    </div>

                    <div className="inputgroup">
                        <label className="formlabel">Enter Your Email</label>
                        <input type="email" placeholder="you@example.com" className="forminput" />
                    </div>

                    <div className="inputgroup">
                        <label className="formlabel">Enter Your Password</label>
                        <input type="password" placeholder="••••••••" className="forminput" />
                    </div>

                    <div className="formbutton">Sign Up</div>

                    <p className="formfooter">
                        Already have an account? <Link to={"/login"} className="formlink">Sign In</Link> Instead
                    </p>
                </div>
            </div>
        </div>
    )
}