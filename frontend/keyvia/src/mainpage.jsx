import HeroSection from "./pages/herosection";
import Preview from "./pages/preview";
import Features from "./pages/features";
import Banner from "./components/banner";

export default function MainPage() {
    return (
        <>
            <HeroSection />
            <Preview />
            <Features />
            <Banner />
            
            
            <div className="footer">
                <nav className="footer-nav">
                    <a href="/">About</a>
                    <a href="https://documenter.getpostman.com/view/39857190/2sB3HtFwWi">Documentation</a>
                    <a href="mailto:jainabhishek1904@gmail.com">Contact</a>
                    <a href="https://documenter.getpostman.com/view/39857190/2sB3HtFwWi">Privacy Policy</a>
                </nav>
                <div className="social-links">
                    <a href="https://github.com/Abhishekkjainn" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i className="fab fa-github"></i></a>
                    <a href="https://www.linkedin.com/in/abhishekk-jainn/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
                    <a href="https://abhishekjain.vercel.app" target="_blank" rel="noopener noreferrer" aria-label="Personal Portfolio"><i className="fas fa-globe"></i></a>
                </div>
                <div className="bigtext">Keyvia.</div>
                <div className="copyright">
                    &copy; 2025 Keyvia. All rights reserved.
                </div>
            </div>
        </>
    )
}
