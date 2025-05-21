import React from 'react';
import difsyslogo from '../../assets/difsyslogo.png'
const Footer = () => {
  return (
    <footer id='contact'>
      <div className="container">
        <div className="footer-content">
          <div className="footer-info">
            <div className="footer-logo">
              <div className='logo-footer'>
                <img src={difsyslogo} alt=""/>
              </div>
            </div>
            <p>Digitally Intelligent Facility System, Inc.</p>
            <p>123 Tech Avenue, Suite 400</p>
            <p>San Francisco, CA 94103</p>
            <p>info@difsystem.com</p>
            <p>(555) 123-4567</p>
          </div>
          
          <div className="footer-links">
            <h3>Company</h3>
            <ul>
              <li><a href="#">About Us</a></li>
              <li><a href="#">Our Team</a></li>
              <li><a href="#">Careers</a></li>
              <li><a href="#">News & Press</a></li>
              <li><a href="#">Contact</a></li>
            </ul>
          </div>
          
          <div className="footer-links">
            <h3>Services</h3>
            <ul>
              <li><a href="#">Smart Hiring</a></li>
              <li><a href="#">Performance Analytics</a></li>
              <li><a href="#">Facility Management</a></li>
              <li><a href="#">Compliance Solutions</a></li>
              <li><a href="#">Integration Services</a></li>
            </ul>
          </div>
          
          <div className="footer-links">
            <h3>Resources</h3>
            <ul>
              <li><a href="#">Blog</a></li>
              <li><a href="#">White Papers</a></li>
              <li><a href="#">Case Studies</a></li>
              <li><a href="#">Webinars</a></li>
              <li><a href="#">Support Center</a></li>
            </ul>
          </div>
          
          <div className="footer-links">
            <h3>Connect</h3>
            <div className="footer-social">
              <a href="#"><i className="fab fa-facebook-f"></i></a>
              <a href="#"><i className="fab fa-twitter"></i></a>
              <a href="#"><i className="fab fa-linkedin-in"></i></a>
              <a href="#"><i className="fab fa-instagram"></i></a>
            </div>
            <div style={{ marginTop: '20px' }}>
              <p>Subscribe to our newsletter</p>
              <div style={{ display: 'flex', marginTop: '10px' }}>
                <input type="email" placeholder="Your email" style={{ flex: 1, padding: '8px', border: 'none', borderRadius: '5px 0 0 5px' }} />
                <button style={{ backgroundColor: 'var(--accent-color)', color: 'var(--white)', border: 'none', padding: '8px 12px', borderRadius: '0 5px 5px 0', cursor: 'pointer' }}>
                  <i className="fas fa-paper-plane"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="footer-bottom">
          <p>&copy; 2025 Digitally Intelligent Facility System, Inc. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;