import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para gestionar la visibilidad y funcionalidad de un botón "Scroll to Top".
 * El botón se muestra cuando el usuario se desplaza hacia abajo una cierta cantidad.
 *
 * @param {number} [threshold=300] - La cantidad de píxeles de desplazamiento vertical antes de que el botón se muestre.
 * @returns {Array} Un array que contiene:
 * - {boolean} showScrollToTopButton: Verdadero si el botón debe ser visible, falso en caso contrario.
 * - {Function} scrollToTop: Función para desplazar la ventana al inicio de la página.
 */
export const useScrollToTop = (threshold = 300) => {
  const [showScrollToTopButton, setShowScrollToTopButton] = useState(false);

  useEffect(() => {
    // Manejador del evento de scroll
    const handleScroll = () => {
      if (window.scrollY > threshold) {
        setShowScrollToTopButton(true);
      } else {
        setShowScrollToTopButton(false);
      }
    };

    // Añadir y remover el event listener
    if (typeof window !== 'undefined') {
      window.addEventListener('scroll', handleScroll);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('scroll', handleScroll);
      }
    };
  }, [threshold]);

  // Función para desplazar la página hacia arriba suavemente
  const scrollToTop = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }
  }, []);

  return [showScrollToTopButton, scrollToTop];
};
