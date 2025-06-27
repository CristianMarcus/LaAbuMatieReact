import React, { useState, useEffect } from 'react';
import { XCircle, CheckCircle, Info, AlertTriangle } from 'lucide-react';

const ToastNotification = ({ message, type, duration = 3000 }) => {
  const [isVisible, setIsVisible] = useState(false);

  // Este efecto se encarga de mostrar y ocultar la notificación
  useEffect(() => {
    let timer;
    if (message) { // Si hay un mensaje, lo hacemos visible
      setIsVisible(true);
      // Configuramos el temporizador para ocultarlo después de 'duration'
      timer = setTimeout(() => {
        setIsVisible(false);
      }, duration);
    } else {
      // Si el mensaje es nulo o vacío (indicando que no hay notificación), lo ocultamos
      setIsVisible(false);
    }

    // Función de limpieza: se ejecuta cuando el componente se desmonta
    // o cuando las dependencias del efecto cambian y el efecto se re-ejecuta
    return () => {
      if (timer) {
        clearTimeout(timer); // Limpiamos cualquier temporizador pendiente
      }
    };
  }, [message, type, duration]); // Dependencias: el efecto se re-ejecuta si cambian

  // No renderizamos nada si la notificación no debe ser visible o no hay mensaje
  if (!isVisible || !message) return null;

  // Definir colores e iconos según el tipo de notificación
  let bgColor = '';
  let textColor = '';
  let icon = null;

  switch (type) {
    case 'success':
      bgColor = 'bg-green-500';
      textColor = 'text-white';
      icon = <CheckCircle size={20} />;
      break;
    case 'error':
      bgColor = 'bg-red-500';
      textColor = 'text-white';
      icon = <AlertTriangle size={20} />;
      break;
    case 'info':
      bgColor = 'bg-blue-500';
      textColor = 'text-white';
      icon = <Info size={20} />;
      break;
    default:
      bgColor = 'bg-gray-500';
      textColor = 'text-white';
      icon = <Info size={20} />;
  }

  return (
    <div
      className={`fixed bottom-6 right-6 p-4 rounded-lg shadow-xl flex items-center space-x-3 
                  transform transition-transform duration-300 ease-out z-50
                  ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
                  ${bgColor} ${textColor}`}
      role="alert"
    >
      {icon && <div className="flex-shrink-0">{icon}</div>}
      <div className="flex-grow text-sm font-medium">{message}</div>
      <button
        onClick={() => setIsVisible(false)} // Permite cerrar manualmente
        className="ml-auto text-current opacity-75 hover:opacity-100 focus:outline-none"
        aria-label="Cerrar notificación"
      >
        <XCircle size={20} />
      </button>
    </div>
  );
};

export default ToastNotification;
