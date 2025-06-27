import React from 'react';
import { Facebook, Instagram, Twitter, MapPin, Mail, Phone, Briefcase, UserCheck } from 'lucide-react'; 

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

  return (
    <footer className="bg-gradient-to-br from-gray-900 to-gray-950 text-gray-300 dark:bg-gradient-to-br dark:from-gray-950 dark:to-black py-12 px-4 sm:px-6 lg:px-8 mt-16 rounded-t-3xl shadow-2xl border-t border-gray-700 dark:border-gray-800 relative overflow-hidden">
      {/* Patrón de fondo sutil */}
      <div className="absolute inset-0 z-0 opacity-5 dark:opacity-10 pointer-events-none">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice">
          <pattern id="pattern-circles" x="0" y="0" width="10" height="10" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1" fill="#4a5568" /> {/* Círculos más pequeños y sutiles */}
          </pattern>
          <rect x="0" y="0" width="100%" height="100%" fill="url(#pattern-circles)" />
        </svg>
      </div>

      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 relative z-10">
        {/* Sección 1: Información de la Empresa */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left">
          <h3 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 dark:from-red-400 dark:to-red-200 mb-4 drop-shadow-lg animate-blink"> {/* AÑADIDA CLASE animate-blink */}
            La Abu Matie
          </h3>
          <p className="text-sm leading-relaxed mb-4 text-gray-400 dark:text-gray-500">
            ¡Creaciones que Sorprenden, Sabores que Enamoran!
          </p>
          <div className="flex space-x-5 mt-2">
            <a href="https://facebook.com" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="text-gray-400 hover:text-blue-500 transition-all duration-300 transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-full">
              <Facebook size={26} />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="text-gray-400 hover:text-pink-500 transition-all duration-300 transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-pink-500 rounded-full">
              <Instagram size={26} />
            </a>
            <a href="https://twitter.com" target="_blank" rel="noopener noreferrer" aria-label="Twitter" className="text-gray-400 hover:text-blue-400 transition-all duration-300 transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-blue-400 rounded-full">
              <Twitter size={26} />
            </a>
          </div>
        </div>

        {/* Sección 2: Enlaces Rápidos */}
        <div className="text-center md:text-left">
          <h4 className="text-xl font-semibold text-white dark:text-gray-100 mb-5">Enlaces Rápidos</h4>
          <ul className="space-y-3">
            <li>
              <a onClick={onGoToHome} href={onGoToHome ? "#" : "/"} className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-base font-medium">Inicio</a>
            </li>
            <li>
              <a onClick={onGoToProducts} href={onGoToProducts ? "#" : "/"} className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-base font-medium">Productos</a>
            </li>
            <li>
              <a onClick={onGoToBranches} href={onGoToBranches ? "#" : "/"} className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-base font-medium">Nuestras Sucursales</a>
            </li>
            <li>
              <a onClick={onGoToFAQ} href={onGoToFAQ ? "#" : "/"} className="text-gray-400 hover:text-red-400 transition-colors duration-300 text-base font-medium">Preguntas Frecuentes</a>
            </li>
          </ul>
        </div>

        {/* Sección 3: Contacto */}
        <div className="text-center md:text-left">
          <h4 className="text-xl font-semibold text-white dark:text-gray-100 mb-5">Contáctanos</h4>
          <ul className="space-y-3 text-base">
            <li className="flex items-center justify-center md:justify-start">
              <MapPin size={20} className="mr-3 text-red-400 flex-shrink-0" />
              <span>Calle 881 N° 5003, San Francisco Solano, Quilmes, Bs.As</span>
            </li>
            <li className="flex items-center justify-center md:justify-start">
              <Phone size={20} className="mr-3 text-red-400 flex-shrink-0" />
              <a href="tel:+5491128421359" className="hover:text-red-400 transition-colors duration-300">+54 9 11 2842-1359</a>
            </li>
            <li className="flex items-center justify-center md:justify-start">
              <Mail size={20} className="mr-3 text-red-400 flex-shrink-0" />
              <a href="mailto:info@laabuelamatie.com" className="hover:text-red-400 transition-colors duration-300">info@laabuelamatie.com</a>
            </li>
          </ul>
        </div>

        {/* Sección 4: Servicios Digitales / Agencia */}
        <div className="text-center md:text-left">
          <h4 className="text-xl font-semibold text-white dark:text-gray-100 mb-5">Servicios Digitales</h4>
          <p className="text-sm mb-6 text-gray-400 dark:text-gray-500">
            ¿Necesitas una aplicación web o móvil a medida?
            <strong className="text-red-400"> Agencia Digital Powa</strong> te ayuda a crecer.
          </p>
          <button
            onClick={onOpenPowaContactForm} 
            className="inline-flex items-center justify-center px-6 py-3 bg-purple-700 hover:bg-purple-800 text-white font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400 group"
            aria-label="Agenda tu Consulta con Agencia Digital Powa"
          >
            <Briefcase size={22} className="mr-2 group-hover:rotate-6 transition-transform duration-200" />
            Agenda tu Consulta
          </button>
        </div>
      </div>

      {/* Derechos de Autor */}
      <div className="border-t border-gray-700 dark:border-gray-800 mt-12 pt-6 text-center text-sm text-gray-500 dark:text-gray-600 relative z-10">
        &copy; {currentYear} La Abu Matie. Todos los derechos reservados.
      </div>

      {/* Botón de Admin Login (Camuflado y Pequeño) */}
      {userProfile && userProfile.role !== 'admin' && userProfile.id && ( 
        <button
          onClick={onOpenAdminLogin}
          className="absolute bottom-6 right-6 text-sm text-gray-600 dark:text-gray-700 hover:text-gray-400 dark:hover:text-gray-500 font-normal hover:underline transition-colors duration-200 flex items-center space-x-1 z-20"
          aria-label="Acceder como Administrador"
          title="Acceso para Administradores" 
        >
          <UserCheck size={16} className="inline-block" /> 
          <span>Admin</span>
        </button>
      )}
    </footer>
  );
};

export default Footer;
