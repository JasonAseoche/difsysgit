import React, { useState, useEffect } from 'react';
import stockimage from '../../assets/difstock.jpg';
import difsysteamwork from '../../assets/difsysteamwork.jpg'
import difsysplanning from '../../assets/difsysplanning.jpg'
import { useAnimateOnScroll } from './AnimateOnScroll';

const Benefits = () => {
  useAnimateOnScroll();

  const benefitsImages = [stockimage, difsysteamwork, difsysplanning];
  const [currentBenefits, setCurrentBenefits] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBenefits((prev) => (prev + 1) % benefitsImages.length);
    }, 5000); // Change image every 4 seconds

    return () => clearInterval(interval);
  }, [benefitsImages.length]);

  return (
    <section id="benefits" className="benefits">
      <div className="container">
        <div className="benefits-content">
          <div className="benefits-image">
            <img
              src={benefitsImages[currentBenefits]}
              alt="DIFS Benefits"
              className="benefits-slider-image"
            />
          </div>

          <div className="benefits-text">
            <h2>Why Choose DIFS?</h2>

            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <h3>Industry Expertise</h3>
                <p>With years of experience in facility management, we understand your unique challenges.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <h3>Advanced Technology</h3>
                <p>Our digital systems leverage cutting-edge AI and data analytics for optimal results.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <h3>Customized Solutions</h3>
                <p>Tailored approaches for businesses of all sizes and industries.</p>
              </div>
            </div>

            <div className="benefit-item">
              <div className="benefit-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div>
                <h3>Dedicated Support</h3>
                <p>24/7 customer service and technical support for uninterrupted operations.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Benefits;
