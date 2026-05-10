import { useContext } from 'react';
import { ThemeContext, ThemeContextValue } from './ThemeProvider';

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
