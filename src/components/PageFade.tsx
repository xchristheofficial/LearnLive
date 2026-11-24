import { motion } from 'framer-motion';
import { useLocation } from 'react-router-dom';

// Wraps the routed page content with a subtle fade+rise on every navigation
// so moving between pages feels smooth rather than an abrupt swap.
export default function PageFade({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  return (
    <motion.div key={pathname} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22, ease: 'easeOut' }}>
      {children}
    </motion.div>
  );
}
