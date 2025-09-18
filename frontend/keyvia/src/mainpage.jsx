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
            
            {/* UPDATED: Changed all 'class' attributes to 'className' */}
            <div className="footer">
                <nav className="footer-nav">
                    <a href="/about">About</a>
                    <a href="/projects">Projects</a>
                    <a href="/contact">Contact</a>
                    <a href="/privacy">Privacy Policy</a>
                </nav>
                <div className="social-links">
                    {/* Note: For these icons to appear, you need to have Font Awesome linked in your main index.html file */}
                    <a href="https://github.com/your-username" target="_blank" rel="noopener noreferrer" aria-label="GitHub"><i className="fab fa-github"></i></a>
                    <a href="https://linkedin.com/in/your-profile" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn"><i className="fab fa-linkedin"></i></a>
                    <a href="https://your-portfolio.com" target="_blank" rel="noopener noreferrer" aria-label="Personal Portfolio"><i className="fas fa-globe"></i></a>
                </div>
                <div className="bigtext">Keyvia.</div>
                <div className="copyright">
                    &copy; 2024 Keyvia. All rights reserved.
                </div>
            </div>
        </>
    )
}
