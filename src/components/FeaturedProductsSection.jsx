// src/components/FeaturedProductsSection.jsx
import React from 'react';
import ProductCard from './ProductCard'; // Reutilizamos ProductCard para los productos destacados
import { Star } from 'lucide-react'; // Icono de estrella para la sección de destacados

// Componente FeaturedProductsSection: Muestra una colección de productos destacados.
// Props:
// - featuredProducts: Array de objetos de productos que se van a destacar.
// - onAddToCart: Función para añadir un producto al carrito.
// - onOpenDetails: Función para abrir el modal de detalles del producto.
// - favoriteProductIds: Array de IDs de productos favoritos.
// - onToggleFavorite: Función para alternar el estado de favorito.
const FeaturedProductsSection = ({
  featuredProducts,
  onAddToCart,
  onOpenDetails,
  favoriteProductIds,
  onToggleFavorite,
}) => {
  if (!featuredProducts || featuredProducts.length === 0) {
    return null; // No renderiza la sección si no hay productos destacados
  }

  return (
    // Contenedor principal de la sección de destacados
    // Con un fondo degradado sutil (ahora en tonos mostaza/ámbar), padding generoso,
    // bordes redondeados y una sombra marcada.
    // === CAMBIO AQUÍ: Degradado de fondo a tonos ámbar/mostaza ===
    <div className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-900 dark:to-amber-800 p-8 sm:p-10 lg:p-12 rounded-3xl shadow-2xl border border-amber-200 dark:border-amber-700">
      {/* Título de la sección, prominente, con efecto de sombra de texto */}
      <h2 className="text-5xl sm:text-6xl font-extrabold text-center mb-12 text-amber-700 dark:text-amber-400 drop-shadow-lg flex items-center justify-center gap-4">
        <Star size={48} className="text-amber-500 fill-current animate-spin-slow" /> {/* Estrella girando */}
        Nuestros Destacados
        <Star size={48} className="text-amber-500 fill-current animate-spin-slow" />
      </h2>
      {/* Contenedor para el carrusel de productos, con desplazamiento horizontal */}
      <div className="flex overflow-x-auto snap-x snap-mandatory py-4 px-2 space-x-6 custom-scrollbar scroll-smooth">
        {featuredProducts.map((producto) => (
          // Cada tarjeta de producto en el carrusel
          // Con un ancho mínimo para asegurar que se muestren varias tarjetas y un efecto hover de escala.
          <div
            key={producto.id}
            className="min-w-[280px] sm:min-w-[320px] lg:min-w-[300px] xl:min-w-[280px] snap-start transition-transform duration-300 hover:scale-[1.02] transform hover:shadow-xl"
          >
            <ProductCard
              producto={producto}
              onAddToCart={onAddToCart}
              onOpenDetails={onOpenDetails}
              isFavorite={favoriteProductIds.includes(producto.id)}
              onToggleFavorite={onToggleFavorite}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default FeaturedProductsSection;