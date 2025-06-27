// src/components/ProductCardSkeleton.jsx
import React from 'react';

// Componente ProductCardSkeleton: Muestra una versión de "esqueleto"
// de una tarjeta de producto mientras los datos se están cargando.
// Utiliza animaciones de "pulse" de Tailwind CSS para un efecto visual de carga.
const ProductCardSkeleton = () => {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden animate-pulse">
      {/* Área de la imagen del esqueleto */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-t-2xl flex justify-center items-center">
        {/* No hay imagen, solo un color de fondo */}
      </div>

      {/* Área del contenido de texto del esqueleto */}
      <div className="p-5 flex flex-col flex-grow">
        {/* Líneas de texto simuladas para el nombre */}
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-md w-3/4 mb-2"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded-md w-1/2 mb-3"></div>

        {/* Líneas de texto simuladas para la descripción */}
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-full mb-2"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-11/12 mb-3"></div>
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-md w-5/6 flex-grow"></div>

        {/* Línea de texto simulada para el precio */}
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded-md w-1/3 mt-4 mb-4"></div>

        {/* Botón simulado */}
        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl w-full"></div>
      </div>
    </div>
  );
};

export default ProductCardSkeleton;
