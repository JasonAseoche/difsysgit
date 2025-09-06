import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useScrollToElement } from './ScrolltoElement';
import difsyslogo from '../../assets/difsyslogo.png'

const Header = () => {
  useScrollToElement();
  const [menuActive, setMenuActive] = useState(false);
  const [currentSection, setCurrentSection] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  
  const toggleMenu = () => {
    setMenuActive(!menuActive);
  };
  
  // Add functions to handle button clicks
  const handleLogin = () => {
    navigate('/login');
    setMenuActive(false);
  };

  const handleMain = () => {
    navigate('/');
    setMenuActive(false);
  };
  
  const handleSignUp = () => {
    navigate('/signup');
    setMenuActive(false);
  };

  // Check current path to determine which buttons to show
  const isLoginPage = location.pathname === '/login';
  const isSignupPage = location.pathname === '/signup';

  // Function to detect which section is currently in view
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['home', 'services', 'benefits', 'testimonials'];
      const scrollPosition = window.scrollY + 100; // Offset for header height
      
      let currentSectionFound = '';
      
      sections.forEach(sectionId => {
        const section = document.getElementById(sectionId);
        if (section) {
          const sectionTop = section.offsetTop;
          const sectionBottom = sectionTop + section.offsetHeight;
          
          if (scrollPosition >= sectionTop && scrollPosition < sectionBottom) {
            currentSectionFound = sectionId;
          }
        }
      });
      
      setCurrentSection(currentSectionFound);
    };

    // Add scroll event listener
    window.addEventListener('scroll', handleScroll);
    
    // Check initial position
    handleScroll();
    
    // Cleanup
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Determine header background color based on current section
  const getHeaderStyle = () => {
    if (currentSection === 'services' || currentSection === 'testimonials') {
      return { backgroundColor: '#f5f5f5' };
    }
    return {};
  };

  return (
    <header className="landing-header" style={getHeaderStyle()}>
      <div className="landing-container landing-nav-container">
        <div className="landing-logo">
          <img src={difsyslogo} alt="difsyslogo" onClick={handleMain}/>
        </div>
        
        <button className="landing-menu-toggle" onClick={toggleMenu}>
          <i className="fas fa-bars"></i>
        </button>
        
        <ul className={`landing-nav-links ${menuActive ? 'active' : ''}`}>
          {/* Auth links moved to top of menu for mobile */}
          <div className="landing-mobile-auth-container">
            {!isLoginPage && (
              <li className="landing-mobile-auth">
                <a href="#" onClick={handleLogin} className="landing-login-link">Log In</a>
              </li>
            )}
            {!isSignupPage && (
              <li className="landing-mobile-auth">
                <a href="#" onClick={handleSignUp} className="landing-signup-link">Sign Up</a>
              </li>
            )}
          </div>
          <li><a href="#services" onClick={() => setMenuActive(false)}>Our Expertise</a></li>
          <li><a href="#benefits" onClick={() => setMenuActive(false)}>Why Difsys</a></li>
          <li><a href="#testimonials" onClick={() => setMenuActive(false)}>Contact Us</a></li>
        </ul>
        
        <div className="landing-auth-buttons">
          {!isLoginPage && (
            <button className="landing-btn landing-btn-outline" onClick={handleLogin}>LOG IN</button>
          )}
          {!isSignupPage && (
            <button className="landing-btn landing-btn-primary" onClick={handleSignUp}>SIGN UP</button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;