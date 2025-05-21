import React from 'react';
import { useAnimateOnScroll } from './AnimateOnScroll';
import { useScrollToElement } from './ScrolltoElement';

const Services = () => {

  useScrollToElement();

    useAnimateOnScroll();

  return (
    <section id="services" className="services">
      <div className="container">
        <div className="section-title">
          <h2>Our Comprehensive Services</h2>
          <p>We provide end-to-end solutions for your facility management needs with cutting-edge digital intelligence.</p>
        </div>
        
        <div className="services-grid">
          <div className="service-card">
            <div className="service-icon">
              <i className="fas fa-users"></i>
            </div>
            <h3 className="service-title">Smart Hiring</h3>
            <p>Streamline your recruitment process with AI-powered candidate matching and automated workflows.</p>
          </div>
          
          <div className="service-card">
            <div className="service-icon">
              <i className="fas fa-chart-line"></i>
            </div>
            <h3 className="service-title">Performance Analytics</h3>
            <p>Track and optimize facility performance with real-time data and actionable insights.</p>
          </div>
          
          <div className="service-card">
            <div className="service-icon">
              <i className="fas fa-cogs"></i>
            </div>
            <h3 className="service-title">Facility Management</h3>
            <p>Comprehensive tools for maintaining optimal facility operations and resource allocation.</p>
          </div>
          
          <div className="service-card">
            <div className="service-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className="service-title">Compliance Solutions</h3>
            <p>Stay compliant with industry regulations and standards with our automated monitoring.</p>
          </div>

          <div className="service-card">
            <div className="service-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className="service-title">Compliance Solutions</h3>
            <p>Stay compliant with industry regulations and standards with our automated monitoring.</p>
          </div>

          <div className="service-card">
            <div className="service-icon">
              <i className="fas fa-shield-alt"></i>
            </div>
            <h3 className="service-title">Compliance Solutions</h3>
            <p>Stay compliant with industry regulations and standards with our automated monitoring.</p>
          </div>

        </div>
      </div>
    </section>
  );
};

export default Services;