import React from 'react';
import difsysteam from '../../assets/difsysteam.png'

const Hero = () => {
  return (
    <main className="hero-section">
      <img src={difsysteam} alt="Background" className="hero-bg" />
      <div className="hero-content">
        <h1>Digitally Intelligent Facility System, Inc.</h1>
        <p className="hero-text">
          Your hiring journey starts here — efficient, simple, successful.
        </p>
        <button className="demo-btn">Apply Now!</button>
      </div>
    </main>
  );
};

export default Hero;