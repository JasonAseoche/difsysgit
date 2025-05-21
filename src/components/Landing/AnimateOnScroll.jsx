import { useEffect } from 'react';

export const useAnimateOnScroll = () => {
  useEffect(() => {
    const animatedElements = document.querySelectorAll('.service-card, .benefit-item, .testimonial');
    
    const checkScroll = () => {
      animatedElements.forEach(element => {
        const elementPosition = element.getBoundingClientRect().top;
        const screenPosition = window.innerHeight / 1.3;
        
        if (elementPosition < screenPosition) {
          element.style.opacity = 1;
          element.style.transform = 'translateY(0)';
        }
      });
    };

    // Initialize element styles
    animatedElements.forEach(element => {
      element.style.opacity = 0;
      element.style.transform = 'translateY(20px)';
      element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    });

    // Check on load and scroll
    window.addEventListener('load', checkScroll);
    window.addEventListener('scroll', checkScroll);

    return () => {
      window.removeEventListener('load', checkScroll);
      window.removeEventListener('scroll', checkScroll);
    };
  }, []);
};
