import { useState, useEffect } from 'react';

/**
 * Hook personalizado para gestionar si el mensaje de bienvenida del administrador
 * ya ha sido mostrado en la sesión actual.
 *
 * @returns {Array} Un array que contiene:
 * - {boolean} hasShownAdminWelcome: Verdadero si el mensaje ya se mostró en esta sesión.
 * - {Function} setHasShownAdminWelcome: Setter para el estado.
 */
export const useAdminWelcome = () => {
  const [hasShownAdminWelcome, setHasShownAdminWelcome] = useState(() => {
    // Inicializa leyendo de sessionStorage para que sea por sesión
    if (typeof window !== 'undefined' && window.sessionStorage) {
      const saved = sessionStorage.getItem('hasShownAdminWelcomeThisSession');
      return saved ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Guarda el estado en sessionStorage cada vez que cambia
  useEffect(() => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      sessionStorage.setItem('hasShownAdminWelcomeThisSession', JSON.stringify(hasShownAdminWelcome));
    }
  }, [hasShownAdminWelcome]);

  return [hasShownAdminWelcome, setHasShownAdminWelcome];
};
