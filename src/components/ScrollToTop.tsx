import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// SPAs don't reset scroll position on navigation by default, so clicking
// into a new page while scrolled down used to leave the viewport stuck
// mid-page. This resets to the top on every route change.
export default function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior }); }, [pathname]);
  return null;
}
