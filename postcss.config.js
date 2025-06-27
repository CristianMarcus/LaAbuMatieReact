// postcss.config.js
// Archivo de configuración para PostCSS, compatible con módulos ES.

// Se exporta un objeto de configuración que PostCSS usará para procesar los estilos.
export default {
  // La propiedad 'plugins' es un objeto donde cada clave es el nombre de un plugin
  // y su valor son las opciones de configuración para ese plugin.
  plugins: {
    // Integra Tailwind CSS como un plugin de PostCSS.
    // Esto es lo que permite a Tailwind procesar tus clases de utilidad en el CSS final.
    tailwindcss: {},
    // Integra Autoprefixer como un plugin de PostCSS.
    // Autoprefixer añade automáticamente prefijos de proveedor (ej. -webkit-, -moz-)
    // a tus propiedades CSS para asegurar la compatibilidad con diferentes navegadores.
    autoprefixer: {},
  },
}