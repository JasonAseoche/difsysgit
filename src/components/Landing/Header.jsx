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
  };
  
  const handleSignUp = () => {
    navigate('/signup');
  };

  // Check current path to determine which buttons to show
  const isLoginPage = location.pathname === '/login';
  const isSignupPage = location.pathname === '/signup';

  // Function to detect which section is currently in view
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['why-difs', 'services', 'benefits', 'testimonials'];
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
    <header style={getHeaderStyle()}>
      <div className="container nav-container">
        <div className="logo">
          <img src={difsyslogo} alt="DIFS Logo"/>
        </div>
        
        <button className="menu-toggle" onClick={toggleMenu}>
          <i className="fas fa-bars"></i>
        </button>
        
        <ul className={`nav-links ${menuActive ? 'active' : ''}`}>
          <li><a href="#why-difs" onClick={() => setMenuActive(false)}>Why DIFS</a></li>
          <li><a href="#services" onClick={() => setMenuActive(false)}>Who We Are</a></li>
          <li><a href="#benefits" onClick={() => setMenuActive(false)}>Benefits</a></li>
          <li><a href="#testimonials" onClick={() => setMenuActive(false)}>Contact Us</a></li>
        </ul>
        
        <div className="auth-buttons">
          {!isLoginPage && (
            <button className="btn btn-outline" onClick={handleLogin}>LOG IN</button>
          )}
          {!isSignupPage && (
            <button className="btn btn-primary" onClick={handleSignUp}>SIGN UP</button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;