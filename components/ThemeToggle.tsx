'use client';

import { useTheme } from 'next-themes';
import { useEffect, useMemo, useState } from 'react';
import { Switch } from '@heroui/react';
import { Sun, Moon } from './Icons';

export default function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = useMemo(() => {
    if (!mounted) return false;
    const current = resolvedTheme || theme;
    return current === 'dark';
  }, [resolvedTheme, theme, mounted]);

  // Don't render anything on the server to prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="h-6 w-10 rounded-full bg-default-200 animate-pulse" />
    );
  }

  return (
    <Switch
      size="sm"
      color="secondary"
      aria-label="Toggle theme"
      isSelected={isDark}
      startContent={<Sun className="h-2 w-2" />}
      endContent={<Moon className="h-2 w-2" />}
      classNames={{
        thumb: 'bg-background border border-content3/50',
      }}
      onValueChange={(selected) => setTheme(selected ? 'dark' : 'light')}
    />
  );
}