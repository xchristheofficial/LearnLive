import { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';
const Ctx = createContext<{ theme: Theme; toggleTheme: () => void }>({ theme: 'light', toggleTheme: () => {} });

function getInitialTheme(): Theme {
  try {
    const saved = localStorage.getItem('learnlive_theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  return 'light';
}

// Applies a `.dark` class to <html> so Tailwind's dark: variant (and the
// global overrides in index.css) can re-theme the whole app, persisted
// across visits in localStorage.
export function ThemeProvider({ children }: any) {
  const [theme, setTheme] = useState<Theme>(getInitialTheme);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    try { localStorage.setItem('learnlive_theme', theme); } catch {}
  }, [theme]);
  const toggleTheme = () => setTheme(t => (t === 'dark' ? 'light' : 'dark'));
  return <Ctx.Provider value={{ theme, toggleTheme }}>{children}</Ctx.Provider>;
}
export const useTheme = () => useContext(Ctx);
