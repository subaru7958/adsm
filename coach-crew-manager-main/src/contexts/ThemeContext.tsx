import React, { createContext, useContext, useEffect, useState } from 'react';
import { adminApi } from '@/lib/api';

interface ThemeColors {
  primaryColor: string;
  secondaryColor: string;
}

interface ThemeContextType {
  colors: ThemeColors;
  updateColors: (colors: ThemeColors) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [colors, setColors] = useState<ThemeColors>({
    primaryColor: '#3b82f6',
    secondaryColor: '#8b5cf6',
  });
  const [isLoaded, setIsLoaded] = useState(false);

  const applyTheme = (themeColors: ThemeColors) => {
    const root = document.documentElement;
    
    // Convert hex to HSL for better color manipulation
    const hexToHSL = (hex: string) => {
      const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      if (!result) return { h: 0, s: 0, l: 0 };
      
      let r = parseInt(result[1], 16) / 255;
      let g = parseInt(result[2], 16) / 255;
      let b = parseInt(result[3], 16) / 255;
      
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
          case g: h = ((b - r) / d + 2) / 6; break;
          case b: h = ((r - g) / d + 4) / 6; break;
        }
      }
      
      return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100),
      };
    };
    
    const primary = hexToHSL(themeColors.primaryColor);
    const secondary = hexToHSL(themeColors.secondaryColor);
    
    // Apply CSS variables
    root.style.setProperty('--primary', `${primary.h} ${primary.s}% ${primary.l}%`);
    root.style.setProperty('--primary-foreground', `0 0% ${primary.l > 50 ? '0%' : '100%'}`);
    
    root.style.setProperty('--secondary', `${secondary.h} ${secondary.s}% ${secondary.l}%`);
    root.style.setProperty('--secondary-foreground', `0 0% ${secondary.l > 50 ? '0%' : '100%'}`);
    
    // Create gradient from primary to secondary
    root.style.setProperty('--gradient-primary', `linear-gradient(135deg, ${themeColors.primaryColor} 0%, ${themeColors.secondaryColor} 100%)`);
  };

  const updateColors = (newColors: ThemeColors) => {
    setColors(newColors);
    applyTheme(newColors);
    // Cache the new colors
    localStorage.setItem('themeColors', JSON.stringify(newColors));
  };

  useEffect(() => {
    // Only load theme colors if user is authenticated
    const loadTheme = async () => {
      // Check if user has a token (is authenticated)
      const token = localStorage.getItem('token');
      if (!token) {
        // No token means public page - don't apply custom theme
        return;
      }

      // Try to load cached colors from localStorage first for instant application
      const cachedColors = localStorage.getItem('themeColors');
      if (cachedColors) {
        try {
          const parsedColors = JSON.parse(cachedColors);
          setColors(parsedColors);
          applyTheme(parsedColors);
          console.log('[ThemeContext] Applied cached theme colors:', parsedColors);
        } catch (e) {
          console.error('[ThemeContext] Failed to parse cached colors');
        }
      }

      // Then fetch fresh colors from server
      try {
        const { data } = await adminApi.getSettings();
        if (data.settings) {
          const newColors = {
            primaryColor: data.settings.primaryColor || '#3b82f6',
            secondaryColor: data.settings.secondaryColor || '#8b5cf6',
          };
          setColors(newColors);
          applyTheme(newColors);
          // Cache the colors for next time
          localStorage.setItem('themeColors', JSON.stringify(newColors));
          console.log('[ThemeContext] Loaded and cached theme colors from server:', newColors);
          setIsLoaded(true);
        }
      } catch (err) {
        console.error('[ThemeContext] Failed to load theme from server:', err);
        // If settings fetch fails and we have cached colors, keep using them
        if (!cachedColors) {
          applyTheme(colors);
        }
        setIsLoaded(true);
      }
    };
    loadTheme();
    
    // No cleanup function - let CSS variables persist for authenticated pages
    // PublicPageWrapper will handle resetting them when needed
  }, []);

  // Re-apply theme if CSS variables are missing (e.g., after visiting public pages)
  useEffect(() => {
    if (!isLoaded) return;

    const checkAndReapplyTheme = () => {
      const token = localStorage.getItem('token');
      if (!token) return; // Not authenticated, don't apply theme

      const root = document.documentElement;
      // Check inline style property (set by our applyTheme function)
      const currentPrimary = root.style.getPropertyValue('--primary');
      const currentGradient = root.style.getPropertyValue('--gradient-primary');
      
      // If CSS variables are missing, reapply the theme
      if (!currentPrimary || !currentGradient) {
        console.log('[ThemeContext] CSS variables missing, reapplying theme:', colors);
        applyTheme(colors);
      }
    };

    // Check immediately
    checkAndReapplyTheme();

    // Also check periodically (in case user navigates from public to authenticated)
    const interval = setInterval(checkAndReapplyTheme, 500);

    return () => clearInterval(interval);
  }, [colors, isLoaded]);

  return (
    <ThemeContext.Provider value={{ colors, updateColors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
