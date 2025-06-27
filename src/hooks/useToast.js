import { useState, useCallback } from 'react';

/**
 * Hook personalizado para gestionar las notificaciones Toast.
 * Proporciona un estado para el toast y una función para mostrar notificaciones.
 *
 * @returns {Array} Un array que contiene:
 * - {Object} toast: El objeto de estado actual del toast ({ message, type, show, duration, id }).
 * - {Function} showNotification: Función para disparar una nueva notificación.
 */
export const useToast = () => {
  const [toast, setToast] = useState({
    message: '',
    type: 'info',
    show: false,
    duration: 3000,
    id: null,
  });

  /**
   * Muestra una notificación toast.
   * @param {string} message - El mensaje a mostrar en la notificación.
   * @param {string} [type='info'] - El tipo de notificación (e.g., 'success', 'error', 'warning', 'info').
   * @param {number} [duration=3000] - La duración en milisegundos que la notificación estará visible.
   */
  const showNotification = useCallback((message, type = 'info', duration = 3000) => {
    setToast({
      message,
      type,
      show: true,
      duration,
      id: Date.now(), // Usar un ID único para forzar la re-renderización si el mensaje es el mismo
    });
  }, []);

  return [toast, showNotification];
};
