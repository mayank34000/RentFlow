import { useState, useEffect } from 'react';

export function useScrollDirection() {
  const [scrolled, setScrolled] = useState(false);
  const [hiddenNav, setHiddenNav] = useState(false);

  useEffect(() => {
    let lastScrollY = window.scrollY || document.documentElement.scrollTop;

    const handleScroll = () => {
      const currentScrollY = window.scrollY || document.documentElement.scrollTop;

      if (currentScrollY > 50) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }

      if (currentScrollY > lastScrollY && currentScrollY > 80) {
        setHiddenNav(true);
      } else {
        setHiddenNav(false);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return { scrolled, hiddenNav };
}
