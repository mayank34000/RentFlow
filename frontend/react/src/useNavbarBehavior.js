import { useState, useEffect, useRef } from 'react';

export function useScrollHide() {
    const [scrollState, setScrollState] = useState({ hidden: false, scrolled: false });
    const lastScrollTopRef = useRef(typeof window !== 'undefined' ? window.scrollY || document.documentElement.scrollTop : 0);

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY || document.documentElement.scrollTop;
            const header = document.getElementById("site-header");
            const headerHeight = header ? header.offsetHeight : 80;

            const isHidden = (scrollTop > lastScrollTopRef.current && scrollTop > headerHeight);
            const isScrolled = (scrollTop > 50);

            setScrollState(prev => {
                if (prev.hidden !== isHidden || prev.scrolled !== isScrolled) {
                    return { hidden: isHidden, scrolled: isScrolled };
                }
                return prev;
            });

            lastScrollTopRef.current = scrollTop;
        };

        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
        };
    }, []);

    return scrollState;
}

export function useTheme() {
    useEffect(() => {
        const applyTheme = () => {
            const savedTheme = localStorage.getItem("theme") || "dark";
            if (savedTheme === "light") {
                document.body.classList.add("light-theme");
            } else {
                document.body.classList.remove("light-theme");
            }
        };

        // We already do initial application in index.html,
        // but applying it on mount handles route changes correctly and guarantees state.
        applyTheme();

        // Listen for storage changes from other tabs/windows if needed
        window.addEventListener("storage", applyTheme);

        return () => {
            window.removeEventListener("storage", applyTheme);
        };
    }, []);
}
