// import { Link } from 'react-router-dom';
// export default function Header(){
//     return <div className="header">
//         <Link to={'/'} className="company">
//             <img src="/bolt.png" alt="" className="companyicon" />
//             <div className="companytag">Keyvia</div>
//         </Link>
//         <div className="linkdiv">
//             <Link to={'/'} className="link">Home</Link>
//             <Link to={'/dashboard'} className="link">Dashboard</Link>
//             <div className="link">Documentation</div>
//             <a href='https://abhishekjain.vercel.app' target='_blank' className="link">Developer</a>
//         </div>
//     </div>
// }


import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
    // State to manage the visibility of the side menu
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Effect to handle body scroll lock when the menu is open
    useEffect(() => {
        if (isMenuOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }

        // Cleanup function to reset the style when the component unmounts
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isMenuOpen]);

    const closeMenu = () => setIsMenuOpen(false);

    return (
        <>
            <div className="header">
                <Link to={'/'} className="company" onClick={closeMenu}>
                    <img src="/bolt.png" alt="Keyvia Logo" className="companyicon" />
                    <div className="companytag">Keyvia</div>
                </Link>

                {/* Desktop Navigation Links */}
                <div className="linkdiv-desktop">
                    <Link to={'/'} className="link">Home</Link>
                    <Link to={'/dashboard'} className="link">Dashboard</Link>
                    <div className="link">Documentation</div>
                    <a href='https://abhishekjain.vercel.app' target='_blank' rel="noopener noreferrer" className="link">Developer</a>
                </div>

                {/* Mobile Menu Button (Hamburger) */}
                <div className="menubtndiv">
                <button className="menu-button" onClick={() => setIsMenuOpen(true)} aria-label="Open menu">
                    <img src="/menu.png" alt="" className='menuiconresp' />
                </button>
                </div>
            </div>

            {/* Overlay for dimming the background */}
            <div 
                className={`overlay ${isMenuOpen ? 'show' : ''}`}
                onClick={closeMenu}
            ></div>

            {/* Side Panel for Mobile Navigation */}
            <div className={`side-panel ${isMenuOpen ? 'open' : ''}`}>
                <div className="side-panel-header">
                    <div className="companytag">Menu</div>
                    <button className="close-button" onClick={closeMenu} aria-label="Close menu">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div className="linkdiv-mobile">
                    <Link to={'/'} className="link" onClick={closeMenu}>Home</Link>
                    <Link to={'/dashboard'} className="link" onClick={closeMenu}>Dashboard</Link>
                    <div className="link" onClick={closeMenu}>Documentation</div>
                    <a href='https://abhishekjain.vercel.app' target='_blank' rel="noopener noreferrer" className="link" onClick={closeMenu}>Developer</a>
                </div>
            </div>
        </>
    );
}
