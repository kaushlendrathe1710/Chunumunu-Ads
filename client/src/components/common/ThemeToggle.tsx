import React from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from '@/hooks/useTheme';
import { theme as themeConstants } from '@shared/constants';
import { ThemeType } from '@shared/types';

const themeOrder: ThemeType[] = [themeConstants.light, themeConstants.system, themeConstants.dark];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  const handleToggle = () => {
    const currentIndex = themeOrder.indexOf(theme);
    const nextTheme = themeOrder[(currentIndex + 1) % themeOrder.length];
    setTheme(nextTheme);
  };

  return (
    <Button variant="outline" size="icon" className="relative h-9 w-9" onClick={handleToggle}>
      {/* Light */}
      <Sun
        className={`absolute h-5 w-5 transition-all duration-300 ${
          theme === themeConstants.light
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />

      {/* System */}
      <Monitor
        className={`absolute h-5 w-5 transition-all duration-300 ${
          theme === themeConstants.system
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />

      {/* Dark */}
      <Moon
        className={`absolute h-5 w-5 transition-all duration-300 ${
          theme === themeConstants.dark
            ? 'rotate-0 scale-100 opacity-100'
            : '-rotate-90 scale-0 opacity-0'
        }`}
      />

      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
