import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Users, TrendingUp, Settings, Shield, Zap, Database } from 'lucide-react';
import { useAnimateOnScroll } from '../components/Landing/AnimateOnScroll';
import difsystesting from '../assets/difsystesting.jpg';
import slide1 from '../assets/slide1.jpg';
import slide2 from '../assets/slide2.jpg';
import slide3 from '../assets/slide3.jpg';
import slide4 from '../assets/slide4.jpg';
import slide5 from '../assets/slide5.jpg';
import difsysbg from '../assets/difsysbg.jpg';
import difsysteam from '../assets/difsysteam.png';
import difsyslogo from '../assets/difsyslogo.png';
import Header from '../components/Landing/Header';
import '../components/Landing/landing.css';


const Landing = () => {
  useAnimateOnScroll();
  const navigate = useNavigate();

  // Hero Section
  const LandingHero = () => {
    const handleApply = () => {
      navigate('/apply-now');
    };
    
    return (
      <main id = "home" className="landing-hero-section">
        <img src={difsysteam} alt="Background" className="landing-hero-bg" />
        <div className="landing-hero-content">
          <h1>Digitally Intelligent Facility Systems, Inc.</h1>
          <p className="landing-hero-text">
            Your hiring journey starts here — efficient, simple, successful.
          </p>
          <button className="landing-demo-btn" onClick={handleApply}>Apply Now!</button>
        </div>
      </main>
    );
  };

  // Services Section with Slider
  const LandingServices = () => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [itemsPerSlide, setItemsPerSlide] = useState(3);
  
    const services = [
      {
        icon: Users,
        title: "Fire Detection and Alarm System (FDAS)",
        description: "Supply, Installation and Commissioning of Siemens Cerberus Pro, Cooper Fire System and other major Fire Alarm Control Panel (FACP) brands."
      },
      {
        icon: TrendingUp,
        title: "Closed-Circuit Television System (CCTV)",
        description: "Supply, Installation and Commissioning of Hikvision, Dahua, Acti, Ava Unified Security and other major brands of CCTV."
      },
      {
        icon: Settings,
        title: "Factory Automation and Process Automation (PLC and SCADA)",
        description: "Supply, Installation and Commissioning of Siemens Simatic Components, Rockwell Allen Bradley, ABB and other major PLC and SCADA systems Building Management System (BMS)."
      },
      {
        icon: Shield,
        title: "Building Management System (BMS)",
        description: "Supply, Installation and Commissioning of Siemens Design CC, Schneider Eco Structure and other major Building Management hardware and software."
      },
      {
        icon: Zap,
        title: "Energy Management System (EMS)",
        description: "Supply, Installation and Commissioning of Schneider Eco Structure Power Monitoring Expert Software and Power Meters."
      },
    ];
  
    // Calculate how many positions we can slide to
    const maxSlides = Math.max(0, services.length - itemsPerSlide);
  
    useEffect(() => {
      const updateItemsPerSlide = () => {
        if (window.innerWidth <= 768) {
          setItemsPerSlide(1);
        } else if (window.innerWidth <= 1024) {
          setItemsPerSlide(2);
        } else {
          setItemsPerSlide(3);
        }
      };
  
      updateItemsPerSlide();
      window.addEventListener('resize', updateItemsPerSlide);
      return () => window.removeEventListener('resize', updateItemsPerSlide);
    }, []);
  
    useEffect(() => {
      setCurrentSlide(0);
    }, [itemsPerSlide]);
  
    const nextSlide = () => {
      setCurrentSlide((prev) => Math.min(prev + 1, maxSlides));
    };
  
    const prevSlide = () => {
      setCurrentSlide((prev) => Math.max(prev - 1, 0));
    };
  
    const goToSlide = (index) => {
      setCurrentSlide(Math.min(index, maxSlides));
    };

    const getCardWidth = () => {
      if (itemsPerSlide === 1) return 20; // Mobile
      if (itemsPerSlide === 2) return 20; // Tablet  
      return 60 / itemsPerSlide; // Desktop
    };
    
    const cardWidth = getCardWidth();
    const transformValue = -(currentSlide * cardWidth);
  
    return (
      <section id="services" className="landing-services-slider">
        <div className="landing-container">
          <div className="landing-section-title">
            <h2>DIFSYS EXPERTISE</h2>
            <p>
              We provide end-to-end solutions for your facility management needs with cutting-edge digital intelligence.
            </p>
          </div>
          
          <div className="landing-slider-container">
            <div className="landing-slider-wrapper">
              <div 
                className="landing-services-slides"
                style={{
                  transform: `translateX(${transformValue}%)`,
                  width: `${(services.length * 100) / itemsPerSlide}%`,
                  transition: 'transform 0.5s ease-in-out'
                }}
              >
                {services.map((service, index) => {
                  const Icon = service.icon;
                  return (
                    <div 
                      key={index}
                      className="landing-service-card-container"
                      style={{
                        width: `${100 / services.length}%`,
                        padding: '0 14px',
                        boxSizing: 'border-box'
                      }}
                    >
                      <div className="landing-service-card">
                        <div className="landing-service-icon">
                          <Icon size={32} color="#0b3d91" />
                        </div>
                        <h3 className="landing-service-title">
                          {service.title}
                        </h3>
                        <p className="landing-service-description">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
  
            {/* Show navigation buttons only if there are more cards than visible */}
            {maxSlides > 0 && (
              <>
                <button
                  onClick={prevSlide}
                  className="landing-slider-nav-button landing-prev"
                  aria-label="Previous slide"
                  disabled={currentSlide === 0}
                  style={{ opacity: currentSlide === 0 ? 0.5 : 1 }}
                >
                  <ChevronLeft size={24} />
                </button>
                
                <button
                  onClick={nextSlide}
                  className="landing-slider-nav-button landing-next"
                  aria-label="Next slide"
                  disabled={currentSlide === maxSlides}
                  style={{ opacity: currentSlide === maxSlides ? 0.5 : 1 }}
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}
  
            {/* Show dots only if there are multiple positions */}
            {maxSlides > 0 && (
              <div className="landing-slider-dots">
                {Array.from({ length: maxSlides + 1 }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => goToSlide(index)}
                    className={`landing-slider-dot ${index === currentSlide ? 'landing-active' : ''}`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            )}
  
            {maxSlides > 0 && (
              <div className="landing-slider-progress">
                <div className="landing-slider-progress-bar">
                  <div 
                    className="landing-slider-progress-fill"
                    style={{ 
                      width: `${((currentSlide + 1) / (maxSlides + 1)) * 100}%`,
                      transition: 'width 0.3s ease'
                    }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    );
  };

  const LandingBenefits = () => {
    const benefitsImages = [difsystesting, slide1, slide2, slide3, slide4, slide5 ];
    const [currentBenefits, setCurrentBenefits] = useState(0);
    const [isTransitioning, setIsTransitioning] = useState(false);
  
    useEffect(() => {
      const interval = setInterval(() => {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentBenefits((prev) => (prev + 1) % benefitsImages.length);
          setIsTransitioning(false);
        }, 250);
      }, 4000);
  
      return () => clearInterval(interval);
    }, [benefitsImages.length]);
  
    const handleImageClick = (index) => {
      if (index !== currentBenefits && !isTransitioning) {
        setIsTransitioning(true);
        setTimeout(() => {
          setCurrentBenefits(index);
          setIsTransitioning(false);
        }, 250);
      }
    };
  
    const getImageStyle = (index) => {
      const position = (index - currentBenefits + benefitsImages.length) % benefitsImages.length;
      
      if (position === 0) {
        // Center image
        return {
          transform: 'translateX(0) scale(1)',
          zIndex: 3,
          opacity: 1,
          filter: 'brightness(1)'
        };
      } else if (position === 1) {
        // Right image
        return {
          transform: 'translateX(60%) scale(0.8)',
          zIndex: 1,
          opacity: 0.7,
          filter: 'brightness(0.7)'
        };
      } else if (position === benefitsImages.length - 1) {
        // Left image (previous image)
        return {
          transform: 'translateX(-60%) scale(0.8)',
          zIndex: 2,
          opacity: 0.7,
          filter: 'brightness(0.7)'
        };
      } else {
        // Hidden images (not adjacent to center)
        return {
          transform: 'translateX(0) scale(0.8)',
          zIndex: 0,
          opacity: 0,
          filter: 'brightness(0.7)',
          pointerEvents: 'none'
        };
      }
    };
  
    return (
      <section id="benefits" className="landing-benefits">
        <div className="landing-container">
          <div className="landing-benefits-content">
            <div className="landing-benefits-gallery">
              <div className="landing-gallery-container">
                {benefitsImages.map((image, index) => (
                  <div
                    key={index}
                    className={`landing-gallery-image ${index === currentBenefits ? 'active' : ''}`}
                    style={getImageStyle(index)}
                    onClick={() => handleImageClick(index)}
                  >
                    <img
                      src={image}
                      alt="DIFS Benefits"
                      className={isTransitioning ? 'transitioning' : ''}
                    />
                  </div>
                ))}
              </div>
              
              <div className="landing-gallery-indicators">
                {benefitsImages.map((_, index) => (
                  <button
                    key={index}
                    className={`landing-gallery-indicator ${index === currentBenefits ? 'active' : ''}`}
                    onClick={() => handleImageClick(index)}
                  />
                ))}
              </div>
            </div>
  
            <div className="landing-benefits-text">
              <h2>Why Choose DIFSYS?</h2>
  
              <div className="landing-benefit-item">
                <div className="landing-benefit-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3>Expertise and Specialization</h3>
                  <p>Our team is highly skilled in Automation Systems, Building Management Systems, Energy Management Systems, CCTV, FDAS, Solar Panels, and Door Access solutions.</p>
                </div>
              </div>
  
              <div className="landing-benefit-item">
                <div className="landing-benefit-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3>Quality and Reliability</h3>
                  <p>We ensure that every project meets the highest standards, focusing on performance, safety, and sustainability.</p>
                </div>
              </div>
  
              <div className="landing-benefit-item">
                <div className="landing-benefit-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3>Client-Centered Approach</h3>
                  <p>We value our clients by providing cost-effective, customized solutions that maximize efficiency and long-term value.</p>
                </div>
              </div>
  
              <div className="landing-benefit-item">
                <div className="landing-benefit-icon">
                  <i className="fas fa-check-circle"></i>
                </div>
                <div>
                  <h3>Innovation and Adaptability</h3>
                  <p>We integrate modern technology to keep up with the ever-changing demands of industries and businesses.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    );
  };

  // Testimonials Section
  const LandingTestimonials = () => {
    const testimonials = [
      {
        text: "Difsys, Inc. is committed to delivering quality Engineering Services, Technology Solutions and provides Automation Systems that will enable our clients to achieve their desired goals and initiatives.",
        author: "Our Mission",
      },
      {
        text: "To be recognized and valued as the number one Technology Solution Provider for Industrial Plants and Commercial Businesses.",
        author: "Our Vision",
      },    
    ];

    const [currentTestimonial, setCurrentTestimonial] = useState(0);

    useEffect(() => {
      const interval = setInterval(() => {
        setCurrentTestimonial((prev) => (prev + 1) % testimonials.length);
      }, 4000);
      
      return () => clearInterval(interval);
    }, [testimonials.length]);

    return (
      <section id='testimonials' className="landing-testimonials">
        <div className="landing-container">
          <div className="landing-section-title">
            <h2>Our Mission and Vision</h2>
            <p>Don't just take our word for it — hear from businesses that have transformed with DIFSYS.</p>
          </div>
          
          <div className="landing-testimonials-slider">
            <div className="landing-testimonials-container">
              <div className="landing-testimonial">
                <p className="landing-testimonial-text">"{testimonials[currentTestimonial].text}"</p>
                <p className="landing-testimonial-author">{testimonials[currentTestimonial].author}</p>
                <p className="landing-testimonial-company">{testimonials[currentTestimonial].company}</p>
              </div>
            </div>
            
            <div className="landing-slider-nav">
              {testimonials.map((_, index) => (
                <div 
                  key={index}
                  className={`landing-slider-dot ${currentTestimonial === index ? 'landing-active' : ''}`}
                  onClick={() => setCurrentTestimonial(index)}
                ></div>
              ))}
            </div>
          </div>
        </div>
      </section>
    );
  };

  // Footer Section
  const LandingFooter = () => {
    return (
      <footer id='contact' className="landing-footer">
        <div className="landing-container">
          <div className="landing-footer-content">
            <div className="landing-footer-info">
              <div className="landing-footer-logo">
                <div className='landing-logo-footer'>
                  <img src={difsyslogo} alt="DIFS Logo"/>
                </div>
              </div>
              <p>Empowering smart spaces through digitally intelligent systems for seamless, secure, and efficient facility management solutions.</p>
            </div>
            
            <div className="landing-footer-address">
              <h3>Digitally Intelligent Facility System, Inc.</h3>
              <p>Block 4 Lot 11, Lynville Residences</p>
              <p>Brgy Marinig, Cabuyao, 4025 Laguna</p>
              <p>info@difsystem.com</p>
              <p>(555) 123-4567</p>
            </div>
            
            <div className="landing-footer-map">
              <iframe 
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d966.6476343773678!2d121.14157315204628!3d14.27708538742735!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3397d9c3f4c12a43%3A0x377e0582067316af!2sDigitalIy%20Intelligent%20Facility%20Systems%20Inc.!5e0!3m2!1sen!2sph!4v1747881289922!5m2!1sen!2sph" 
                width="100%" 
                height="200" 
                style={{border:0}} 
                allowFullScreen="" 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade"
                title="DIFS Location"
              ></iframe>
            </div>
            
            <div className="landing-footer-links">
              <h3>Connect</h3>
              <div className="landing-footer-social">
                <a href="https://www.facebook.com/difsys.hr"><i className="fab fa-facebook-f"></i></a>
                <a href="#"><i className="fab fa-twitter"></i></a>
                <a href="#"><i className="fab fa-linkedin-in"></i></a>
                <a href="#"><i className="fab fa-instagram"></i></a>
              </div>
            </div>
          </div>
          
          <div className="landing-footer-bottom">
            <p>&copy; 2025 Digitally Intelligent Facility System, Inc. All rights reserved.</p>
          </div>
        </div>
      </footer>
    );
  };

  return (
    <div className="landing-page">
      <Header />
      <LandingHero />
      <LandingServices />
      <LandingBenefits />
      <LandingTestimonials />
      <LandingFooter />
    </div>
  );
};

export default Landing;