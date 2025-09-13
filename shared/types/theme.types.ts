import { theme as themeConstants } from '../constants/constants';

export type ThemeType = (typeof themeConstants)[keyof typeof themeConstants];

export const ThemeValues = themeConstants;
