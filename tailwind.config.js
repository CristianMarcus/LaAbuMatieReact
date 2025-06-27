/** @type {import('tailwindcss').Config} */
export default {
  // Configura Tailwind CSS para que use la clase 'dark' en el HTML
  // para aplicar los estilos de modo oscuro.
  darkMode: 'class', // <--- ¡ESTA LÍNEA ES CLAVE PARA EL MODO OSCURO MANUAL!

  // La propiedad 'content' le dice a Tailwind qué archivos escanear
  // para encontrar las clases de utilidad que debe incluir en el CSS final.
  content: [
    "./index.html", // Escanea el archivo HTML principal
    "./src/**/*.{js,ts,jsx,tsx}", // Escanea todos los archivos JS, TS, JSX, TSX en la carpeta src y subcarpetas
  ],

  // La propiedad 'theme' permite personalizar el diseño de Tailwind,
  // como colores, fuentes, espaciados, etc.
  theme: {
    extend: {
      // Extiende la configuración de fuentes de Tailwind.
      // Define 'poppins' para usar la fuente Poppins de Google Fonts.
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'], // Asegúrate de haber importado Poppins en index.html
      },
      // Puedes extender la paleta de colores de Tailwind aquí si lo necesitas.
      // Por ejemplo, un gris más oscuro y rico para el modo oscuro, si no está ya en Tailwind por defecto.
      colors: {
        'gray-850': '#1A202C', // Un gris oscuro personalizado para complementar el diseño
      }
    },
  },

  // Los plugins añaden funcionalidades adicionales a Tailwind CSS.
  plugins: [
     // Plugin para truncar texto con un número específico de líneas
    // Agrega aquí cualquier otro plugin de Tailwind CSS que estés utilizando.
  ],
}
