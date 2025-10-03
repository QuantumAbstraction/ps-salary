'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Sun, Moon } from './Icons';

export default function SimpleThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder while mounting to prevent hydration mismatch
    return (
      <div className="w-10 h-10 rounded-lg bg-default-200 animate-pulse" />
    );
  }

  const isDark = theme === 'dark';

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="
        w-10 h-10 
        rounded-lg 
        bg-background 
        border border-content3/40 
        hover:bg-content2 
        transition-colors 
        flex items-center justify-center
        focus:outline-none 
        focus:ring-2 
        focus:ring-primary 
        focus:ring-offset-2
      "
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-foreground" />
      ) : (
        <Moon className="w-5 h-5 text-foreground" />
      )}
    </button>
  );
}