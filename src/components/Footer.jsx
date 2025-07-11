import React from 'react';
// Importaciones de iconos de Lucide React
import { Facebook, Instagram, Twitter, MapPin, Mail, Briefcase, UserCheck } from 'lucide-react'; 

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
  const displayPhoneNumber = "+54 9 11 2842-1359"; 

  // URL de WhatsApp
  const whatsappUrl = whatsappNumber ? `https://wa.me/${whatsappNumber}` : '#';

  // Dirección de La Abu Matie para Google Maps (para el clic)
  const laAbuMatieAddress = "Calle 881 N° 5003, San Francisco Solano, Quilmes, Bs.As";
  // Dirección codificada para URLs de Google Maps (espacios por +, Ñ por %C3%91, etc.)
  const encodedAddress = encodeURIComponent(laAbuMatieAddress);

  // URL para abrir Google Maps al hacer clic (ESTO NO REQUIERE API KEY)
  const googleMapsClickUrl = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;

  // URL para el iframe del mini-mapa de OpenStreetMap (NO REQUIERE API KEY)
  // Utiliza coordenadas aproximadas de San Francisco Solano, Quilmes.
  // Puedes buscar "San Francisco Solano, Quilmes" en Google Maps, hacer clic derecho en el mapa
  // y te aparecerán las coordenadas. Luego puedes ir a openstreetmap.org/export/embed.html
  // para generar una URL de iframe más precisa con esas coordenadas.
  const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=-58.3000,-34.7800,-58.2000,-34.7000&marker=-34.7400,-58.2500&zoom=14`; 


  return (
    <footer className="bg-gradient-to-br from-gray-800 to-gray-900 text-gray-300 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-950 py-10 px-4 sm:px-6 lg:px-8 mt-16 rounded-t-3xl shadow-2xl border-t border-gray-700 dark:border-gray-800 relative">
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
          <h3 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-red-300 dark:from-red-400 dark:to-red-200 mb-4 drop-shadow-lg animate-blink"> 
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
            {/* Elemento de la dirección con enlace a Google Maps y previsualización */}
            <li className="relative flex items-center justify-center md:justify-start group"> 
              <MapPin size={20} className="mr-3 text-red-400 flex-shrink-0" />
              <a 
                href={googleMapsClickUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-red-400 transition-colors duration-300"
                aria-label="Ver ubicación en Google Maps"
              >
                <span>{laAbuMatieAddress}</span> 
              </a>
              {/* Mini-mapa de OpenStreetMap que aparece al pasar el mouse */}
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 h-48 bg-white dark:bg-gray-800 rounded-lg shadow-xl overflow-hidden opacity-0 group-hover:opacity-100 group-hover:visible transition-all duration-300 invisible z-50 transform scale-95 group-hover:scale-100 origin-bottom">
                <iframe
                  width="100%"
                  height="100%"
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={osmEmbedUrl} 
                  title="Ubicación de La Abu Matie en OpenStreetMap"
                ></iframe>
                <p className="text-xs text-gray-500 dark:text-gray-400 p-2 text-center">
                  Haz clic en la dirección para abrir en Google Maps
                </p>
              </div>
            </li>

            {/* Elemento del número de WhatsApp con icono GIF */}
            <li className="flex items-center justify-center md:justify-start">
              <img 
                src="/icons8-whatsapp.svg" 
                alt="WhatsApp" 
                width="20" 
                height="20" 
                className="mr-3 flex-shrink-0 rounded-full" 
              />
              <a 
                href={whatsappUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="hover:text-red-400 transition-colors duration-300" 
                aria-label={`Contactar por WhatsApp a ${displayPhoneNumber}`} 
              >
                {displayPhoneNumber} 
              </a>
            </li>
            <li className="flex items-center justify-center md:justify-start">
              <Mail size={20} className="mr-3 text-red-400 flex-shrink-0" />
              <a href="mailto:martagracielabuchamer@gmail.com" className="hover:text-red-400 transition-colors duration-300">info@laabuelamatie.com</a>
            </li>
          </ul>
        </div>

        {/* Sección 4: Logo de La Abu Matie con estilo permanente (como en Capriccio) */}
        <div className="text-center md:text-left"> 
          <div className="flex justify-center md:justify-start">
            <img
              src="/LaAbuMatieSticker.jpeg" 
              alt="Logo de La Abu Matie"
              className="w-32 h-32 object-cover rounded-full
                         border-2 border-white shadow-xl shadow-white
                         transform scale-105" 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://via.placeholder.co/128x128?text=Logo+Abu"; }}
            />
          </div>
        </div>

      </div> {/* Fin del grid de 4 columnas */}

      {/* Nueva Sección: Agencia Digital Powa */}
      <div className="text-center mt-16 text-xs text-gray-600 dark:text-gray-700"> 
        <a 
          href="https://agenciadigitalpowa.web.app/"
          target="_blank" 
          rel="noopener noreferrer" 
          className="group inline-block cursor-pointer rounded-md focus:outline-none" 
          tabIndex="0" 
          onFocus={(e) => {
            setTimeout(() => {
              if (e.target === document.activeElement) {
                e.target.blur();
              }
            }, 100); 
          }}
        >
          <div className="flex items-center justify-center
                      p-2 rounded-md border border-white shadow-lg shadow-purple-500 scale-105"> 
            <img
              src="/logopowa.svg" 
              alt="Icono de Agencia Digital Powa"
              className="w-4 h-4 mr-1 object-contain" 
              style={{ color: '#60A5FA' }} 
              onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/16x16/ADADAD/FFFFFF?text=P"; }}
            />
            <span className="text-gray-600 dark:text-gray-700 transition-colors duration-200
                             group-hover:text-purple-400 group-active:text-purple-400"> 
              Desarrollo Agencia Digital Powa
            </span>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-600 mt-3"> {/* <<<<<<<<<<<<<<< CAMBIADO A mt-3 */}
            Tu socio estratégico en desarrollo web y móvil.
          </p>
        </a>
      </div>

      {/* Derechos de Autor */}
      <div className="border-t border-gray-700 dark:border-gray-800 mt-8 pt-6 text-center text-sm text-gray-500 dark:text-gray-600 relative z-10"> 
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
