import React from 'react';
// Importaciones de iconos de Lucide React: Añadidos Phone para el número de teléfono
import { Facebook, Instagram, Twitter, MapPin, Mail, Briefcase, UserCheck, Phone } from 'lucide-react'; 

// Props esperadas:
// - onOpenPowaContactForm: Función para abrir el formulario de contacto Powa.
// - onOpenAdminLogin: Función para navegar a la página de login de admin.
// - userProfile: Objeto con el perfil del usuario (para mostrar/ocultar el botón de admin).
// - onGoToHome: (Opcional) Función para navegar a la página de inicio.
// - onGoToProducts: (Opcional) Función para navegar a la página de productos.
// - onGoToBranches: (Opcional) Función para navegar a la página de sucursales (si existe).
// - onGoToFAQ: (Opcional) Función para navegar a la página de preguntas frecuentes (si existe).
const Footer = ({ 
  onOpenPowaContactForm, 
  onOpenAdminLogin, 
  userProfile,
  onGoToHome,    
  onGoToProducts,  
  onGoToBranches,  
  onGoToFAQ        
}) => { 
  const currentYear = new Date().getFullYear();

  // Obtener el número de WhatsApp desde las variables de entorno
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER; 

  // Formato del número de teléfono para mostrar
  const displayPhoneNumber = "11 2842-1359"; // Ejemplo, ajusta si tienes uno específico para mostrar

  const whatsappLink = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#';

  return (
    // AÑADIDO: mt-16 y rounded-t-3xl
    <footer className="bg-gray-900 dark:bg-gray-950 text-gray-300 py-10 sm:py-12 relative z-0 mt-16 rounded-t-3xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row justify-between items-center md:items-start gap-8">
        {/* Sección de Navegación Rápida */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left mb-6 md:mb-0">
          <h4 className="text-xl font-bold text-white mb-4">Navegación Rápida</h4>
          <nav className="flex flex-col space-y-2">
            {onGoToHome && (
              <button onClick={onGoToHome} className="text-gray-300 hover:text-red-500 transition-colors duration-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1">
                Inicio
              </button>
            )}
            {onGoToProducts && (
              <button onClick={onGoToProducts} className="text-gray-300 hover:text-red-500 transition-colors duration-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1">
                Productos
              </button>
            )}
            {onGoToBranches && (
              <button onClick={onGoToBranches} className="text-gray-300 hover:text-red-500 transition-colors duration-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1">
                Sucursales
              </button>
            )}
            {onGoToFAQ && (
              <button onClick={onGoToFAQ} className="text-gray-300 hover:text-red-500 transition-colors duration-200 text-base font-medium focus:outline-none focus:ring-2 focus:ring-red-500 rounded-md px-2 py-1">
                Preguntas Frecuentes
              </button>
            )}
          </nav>
        </div>

        {/* Sección de Contacto */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left mb-6 md:mb-0">
          <h4 className="text-xl font-bold text-white mb-4">Contáctanos</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <MapPin size={20} className="text-red-400 flex-shrink-0" />
              <p className="text-gray-300 text-base">C. 881 5003, B1881 Villa la Florida, Provincia de Buenos Aires</p>
            </div>
            {/* Botón para abrir Google Maps con la ubicación exacta */}
            <a
              href="https://maps.app.goo.gl/Zw3jiwTQAuZJ7q467"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md transition-all duration-200 text-sm font-semibold transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-500"
              aria-label="Ver ubicación en Google Maps"
            >
              <MapPin size={18} /> Ver en Google Maps
            </a>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Mail size={20} className="text-red-400 flex-shrink-0" />
              <a href="mailto:info@labumatie.com" className="text-gray-300 hover:text-red-500 transition-colors duration-200 text-base">info@labumatie.com</a>
            </div>
            <div className="flex items-center justify-center md:justify-start gap-2">
              <Phone size={20} className="text-red-400 flex-shrink-0" />
              <span className="text-gray-300 text-base">{displayPhoneNumber}</span>
            </div>
            {whatsappNumber && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg shadow-md transition-all duration-200 text-sm font-semibold transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500"
                aria-label="Enviar mensaje por WhatsApp"
              >
                <img src="https://upload.wikimedia.org/wikipedia/commons/6/6b/WhatsApp.svg" alt="WhatsApp" className="w-5 h-5" />
                WhatsApp
              </a>
            )}
          </div>
        </div>

        {/* Sección de Redes Sociales */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h4 className="text-xl font-bold text-white mb-4">Síguenos</h4>
          <div className="flex space-x-4">
            <a href="https://facebook.com/labumatie" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-600 transition-colors duration-200" aria-label="Facebook">
              <Facebook size={28} />
            </a>
            <a href="https://instagram.com/labumatie" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-pink-500 transition-colors duration-200" aria-label="Instagram">
              <Instagram size={28} />
            </a>
            <a href="https://twitter.com/labumatie" target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-blue-400 transition-colors duration-200" aria-label="Twitter">
              <Twitter size={28} />
            </a>
          </div>
          {/* AÑADIDO: Logo de La Abu Matie con mt-1 */}
          <div className="flex justify-center md:justify-start mt-1"> {/* mt-1 para aproximadamente 5px */}
            <img
              src="/LaAbuMatieSticker.jpeg" // Asegúrate de que esta ruta sea correcta
              alt="Logo de La Abu Matie"
              className="w-32 h-32 object-cover rounded-full
                         border-2 border-white shadow-xl shadow-white
                         transform scale-105" 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.co/128x128?text=Logo+Abu"; }}
            />
          </div>
        </div>
        
      </div>

      {/* Enlace a Agencia Digital Powa */}
      <div className="text-center mt-8 pt-6 border-t border-gray-700 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-center px-4 sm:px-6 lg:px-8"> 
        <a 
          href="https://agenciadigitalpowa.web.app/" // Tu URL específica para Powa
          target="_blank" 
          rel="noopener noreferrer" 
          className="group flex items-center justify-center text-sm font-semibold text-gray-500 dark:text-gray-600 hover:text-purple-400 dark:hover:text-purple-500 transition-colors duration-200 mb-3 sm:mb-0 sm:mr-4"
          aria-label="Desarrollo por Agencia Digital Powa"
        >
          {/* Contenedor circular violeta para el logo de Powa */}
          <div className="w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center mr-2 shadow-md"> 
            <img
              src="/logopowa.svg" // Tu ruta específica para el logo de Powa
              alt="Icono de Agencia Digital Powa"
              className="w-6 h-4 object-contain" 
              style={{ color: '#60A5FA' }} // Estilo inline para el color del SVG si es necesario
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/16x16/ADADAD/FFFFFF?text=P"; }}
            />
          </div>
          <span className="text-gray-500 dark:text-gray-600 transition-colors duration-200
                               group-hover:text-purple-400 group-active:text-purple-400"> 
            Desarrollo Agencia Digital Powa
          </span>
        </a>
        <p className="text-xs text-gray-500 dark:text-gray-600 mt-3">
          Tu socio estratégico en desarrollo web y móvil.
        </p>
      </div>

      {/* Derechos de Autor */}
      <div className="border-t border-gray-700 dark:border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500 dark:text-gray-600 relative z-10 px-4 sm:px-6 lg:px-8"> 
        &copy; {currentYear} La Abu Matie. Todos los derechos reservados.
      </div>

      {/* Botón de Admin Login (Camuflado y Pequeño) */}
      {userProfile && userProfile.role !== 'admin' && userProfile.id && ( 
        <button
          onClick={onOpenAdminLogin}
          className="absolute bottom-6 right-6 text-sm text-gray-600 dark:text-gray-700 hover:text-gray-400 dark:hover:text-gray-500 font-normal hover:underline transition-colors duration-200 flex items-center gap-1 opacity-70 hover:opacity-100"
          aria-label="Acceso de administrador"
        >
          <UserCheck size={16} /> Admin Login
        </button>
      )}
    </footer>
  );
};

export default Footer;
