import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { theme as themeConstants } from '@shared/constants';
import { ThemeType } from '@shared/types';

type Theme = ThemeType;

interface ThemeState {
  theme: Theme;
  systemTheme: 'light' | 'dark';
  isInitialized: boolean;
}

// Helper function to get initial theme
const getInitialTheme = (): Theme => {
  if (typeof window === 'undefined') return themeConstants.light as Theme;
  return ((localStorage.getItem('theme') as Theme) || themeConstants.system) as Theme;
};

// Helper function to get system theme
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
};

// Helper function to apply theme to DOM
const applyThemeToDOM = (theme: Theme, systemTheme: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  const shouldBeDark =
    theme === (themeConstants.dark as Theme) ||
    (theme === (themeConstants.system as Theme) && systemTheme === 'dark');

  if (shouldBeDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
};

const initialState: ThemeState = {
  theme: getInitialTheme(),
  systemTheme: getSystemTheme(),
  isInitialized: false,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<Theme>) => {
      state.theme = action.payload;
      localStorage.setItem('theme', action.payload);
      applyThemeToDOM(action.payload, state.systemTheme);
    },
    setSystemTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.systemTheme = action.payload;

      // If theme is system, apply the system theme
      if (state.theme === (themeConstants.system as Theme)) {
        applyThemeToDOM(state.theme, action.payload);
      }
    },
    initializeTheme: (state) => {
      if (!state.isInitialized) {
        state.isInitialized = true;
        applyThemeToDOM(state.theme, state.systemTheme);
      }
    },
  },
});

export const { setTheme, setSystemTheme, initializeTheme } = themeSlice.actions;
export default themeSlice.reducer;
