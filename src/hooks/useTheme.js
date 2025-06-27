import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para gestionar el modo oscuro/claro de la aplicación.
 * Persiste la preferencia del usuario en localStorage.
 *
 * @returns {Array} Un array que contiene:
 * - {boolean} isDarkMode: Verdadero si el modo oscuro está activado, falso en caso contrario.
 * - {Function} toggleDarkMode: Función para alternar entre modo oscuro y claro.
 */
export const useTheme = () => {
  // Inicializa el estado leyendo de localStorage o detectando la preferencia del sistema
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedTheme = localStorage.getItem('theme');
      return savedTheme === 'dark';
    }
    // Si no hay localStorage (ej. SSR) o no hay tema guardado, usa la preferencia del sistema
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  // Efecto para aplicar la clase 'dark' al <html> y guardar en localStorage
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('theme', 'dark');
      }
    } else {
      document.documentElement.classList.remove('dark');
      if (typeof window !== 'undefined' && window.localStorage) {
        localStorage.setItem('theme', 'light');
      }
    }
  }, [isDarkMode]);

  // Función para alternar el modo oscuro
  const toggleDarkMode = useCallback(() => {
    setIsDarkMode(prevMode => !prevMode);
  }, []);

  return [isDarkMode, toggleDarkMode];
};
