import { useState, useEffect } from 'react';

export const useNavigation = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeSection, setActiveSection] = useState<'planning' | 'tracking' | 'savings' | 'analytics'>(
    'planning'
  );
  const [showBackToTop, setShowBackToTop] = useState(false);

  // Month navigation
  const navigateMonth = (direction: 'prev' | 'next') => {
    const prevScroll = window.scrollY;
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(prev.getMonth() - 1);
      } else {
        newDate.setMonth(prev.getMonth() + 1);
      }
      return newDate;
    });
    // Preserve scroll position on month change
    requestAnimationFrame(() => window.scrollTo({ top: prevScroll }));
  };

  const goToToday = () => setCurrentDate(new Date());

  const monthInputValue = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;

  const onMonthChange = (value: string) => {
    // value is in format YYYY-MM
    const [y, m] = value.split('-').map(Number);
    if (!isNaN(y) && !isNaN(m)) {
      const d = new Date(currentDate);
      d.setFullYear(y);
      d.setMonth(m - 1);
      d.setDate(1);
      setCurrentDate(d);
    }
  };

  const scrollToTop = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  // Observe sections to update active tab on scroll
  useEffect(() => {
    const ids: Array<typeof activeSection> = ['planning', 'tracking', 'savings', 'analytics'];
    const elements = ids.map((id) => document.getElementById(id)).filter(Boolean) as HTMLElement[];

    if (elements.length === 0) return;

    const io = new IntersectionObserver(
      (entries) => {
        // Pick the most visible entry
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
        const id = visible?.target?.id as string | undefined;
        if (id && (ids as string[]).includes(id)) {
          setActiveSection(id as typeof activeSection);
        }
      },
      {
        root: null,
        threshold: [0.25, 0.5, 0.75],
        rootMargin: '-10% 0px -70% 0px',
      }
    );

    elements.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  // Back-to-top visibility
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return {
    currentDate,
    setCurrentDate,
    activeSection,
    showBackToTop,
    navigateMonth,
    goToToday,
    monthInputValue,
    onMonthChange,
    scrollToTop,
  };
};
