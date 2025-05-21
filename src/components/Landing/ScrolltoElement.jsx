import { useEffect } from 'react';

export const useScrollToElement = () => {
  useEffect(() => {
    // Smooth scroll for navigation links
    const handleScroll = (e) => {
      e.preventDefault();
      
      const targetId = e.currentTarget.getAttribute('href');
      if (targetId === '#') return;
      
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        // Adjust scroll position with a small delay to ensure smoother transition
        setTimeout(() => {
          const headerOffset = 70; // Adjust based on your header height
          const elementPosition = targetElement.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
          
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });
        }, 10);
      }
    };

    const anchors = document.querySelectorAll('a[href^="#"]');
    anchors.forEach(anchor => {
      anchor.addEventListener('click', handleScroll);
    });

    return () => {
      anchors.forEach(anchor => {
        anchor.removeEventListener('click', handleScroll);
      });
    };
  }, []);
};