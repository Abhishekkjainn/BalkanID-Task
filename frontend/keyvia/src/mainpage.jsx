import Header from "./components/header";
import HeroSection from "./pages/herosection";
import { Link } from 'react-router-dom';
import Preview from "./pages/preview";
import Features from "./pages/features";
import Banner from "./components/banner";

export default function MainPage() {
    return (
        <>
            <HeroSection/>
            <Preview/>
            <Features/>
            <Banner/>
            {/* <div className="footer">
                <div className="bigtext">Keyvia.</div>
                <div className="copyright">
                    &copy; 2024 Keyvia. All rights reserved.
                </div>
            </div> */}
            <div class="footer">
    <nav class="footer-nav">
        <a href="/about">About</a>
        <a href="/projects">Projects</a>
        <a href="/contact">Contact</a>
        <a href="/privacy">Privacy Policy</a>
    </nav>
    <div class="social-links">
        <a href="https://github.com/your-username" target="_blank" aria-label="GitHub"><i class="fab fa-github"></i></a>
        <a href="https://linkedin.com/in/your-profile" target="_blank" aria-label="LinkedIn"><i class="fab fa-linkedin"></i></a>
        <a href="https://your-portfolio.com" target="_blank" aria-label="Personal Portfolio"><i class="fas fa-globe"></i></a>
    </div>
    <div class="bigtext">Keyvia.</div>
    <div class="copyright">
        &copy; 2024 Keyvia. All rights reserved.
    </div>
</div>
        </>
    )
}