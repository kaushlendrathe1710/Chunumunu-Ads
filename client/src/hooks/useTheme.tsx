import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { setTheme, setSystemTheme, initializeTheme } from '@/store/slices/themeSlice';
import { ThemeType } from '@shared/types';
import { theme as themeConstants } from '@shared/constants';

type Theme = ThemeType;

export const useTheme = () => {
  const dispatch = useAppDispatch();
  const { theme, systemTheme } = useAppSelector((state) => state.theme);

  useEffect(() => {
    // Initialize theme on mount
    dispatch(initializeTheme());

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleChange = (e: MediaQueryListEvent) => {
      dispatch(setSystemTheme(e.matches ? 'dark' : 'light'));
    };

    mediaQuery.addEventListener('change', handleChange);

    return () => {
      mediaQuery.removeEventListener('change', handleChange);
    };
  }, [dispatch]);

  const changeTheme = (newTheme: Theme) => {
    dispatch(setTheme(newTheme));
  };

  const currentTheme = theme === (themeConstants.system as Theme) ? systemTheme : theme;

  return {
    theme,
    currentTheme,
    setTheme: changeTheme,
  };
};
