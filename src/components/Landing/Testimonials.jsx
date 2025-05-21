import React, { useState, useEffect } from 'react';
import { useAnimateOnScroll } from './AnimateOnScroll';

const Testimonials = () => {
    useAnimateOnScroll();
  const testimonials = [
    {
      text: "DIFS completely revolutionized our hiring process. We've reduced time-to-hire by 40% and improved retention rates significantly.",
      author: "Sarah Johnson",
      company: "HR Director, TechCorp Inc."
    },
    {
      text: "The facility management tools have helped us cut operational costs by 30% while improving overall efficiency. The ROI has been outstanding.",
      author: "Michael Chen",
      company: "Operations Manager, Global Manufacturing"
    },
    {
      text: "Their compliance solution has been a game-changer for us. We've eliminated the stress of regulatory audits with automated monitoring and reporting.",
      author: "Lisa Rodriguez",
      company: "Compliance Officer, HealthTech Solutions"
    }
  ];

  const [currentTestimonial, setCurrentTestimonial] = useState(0);

  // Auto rotate testimonials
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [testimonials.length]);

  return (
    <section id = 'testimonials' className="testimonials">
      <div className="container">
        <div className="section-title">
          <h2>What Our Employee Says</h2>
          <p>Don't just take our word for it — hear from businesses that have transformed with DIFS.</p>
        </div>
        
        <div className="testimonials-slider">
          <div className="testimonials-container">
            <div className="testimonial">
              <p className="testimonial-text">"{testimonials[currentTestimonial].text}"</p>
              <p className="testimonial-author">{testimonials[currentTestimonial].author}</p>
              <p className="testimonial-company">{testimonials[currentTestimonial].company}</p>
            </div>
          </div>
          
          <div className="slider-nav">
            {testimonials.map((_, index) => (
              <div 
                key={index}
                className={`slider-dot ${currentTestimonial === index ? 'active' : ''}`}
                onClick={() => setCurrentTestimonial(index)}
              ></div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Testimonials;