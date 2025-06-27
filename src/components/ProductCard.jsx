// src/components/ProductCard.jsx
import React, { useState, useCallback, useMemo } from 'react'; // ¡AÑADIDO useMemo aquí!
import { ShoppingCart, ImageOff, Plus, Minus, Heart, Star } from 'lucide-react'; 

// Componente funcional ProductCard: Muestra una tarjeta individual de producto.
// Props:
// - producto: Objeto con los datos del producto (id, name, precio, descripcion, imageUrl, stock, reviews).
// - onAddToCart: Función para añadir el producto al carrito.
// - onOpenDetails: Función para abrir el modal de detalles del producto.
// - isFavorite: Booleano que indica si el producto es favorito.
// - onToggleFavorite: Nueva función para añadir/quitar de favoritos.
const ProductCard = React.memo(({ producto, onAddToCart, onOpenDetails, isFavorite, onToggleFavorite }) => {
  // Estado local para la cantidad del producto a añadir al carrito
  // Se inicializa en 1 si hay stock, de lo contrario en 0 para inhabilitar la interacción.
  const [quantity, setQuantity] = useState(producto.stock > 0 ? 1 : 0); 

  // Aseguramos que precio sea un número válido y lo redondeamos a un número entero
  const displayPrecio = typeof producto.precio === 'number' ? Math.floor(producto.precio) : 'N/A';

  // Booleano para verificar si el producto está agotado
  const isOutOfStock = producto.stock <= 0;

  // Manejador para incrementar la cantidad, asegurando que no supere el stock disponible
  const handleIncreaseQuantity = useCallback((e) => {
    e.stopPropagation(); // Detiene la propagación para no abrir el modal
    setQuantity((prevQuantity) => {
      const newQuantity = prevQuantity + 1;
      // Limita la cantidad a no exceder el stock del producto
      return newQuantity <= producto.stock ? newQuantity : producto.stock;
    });
  }, [producto.stock]);

  // Manejador para disminuir la cantidad, asegurando que no baje de 1 (o 0 si ya estaba en 0)
  const handleDecreaseQuantity = useCallback((e) => {
    e.stopPropagation(); // Detiene la propagación para no abrir el modal
    setQuantity((prevQuantity) => (prevQuantity > 1 ? prevQuantity - 1 : (producto.stock > 0 ? 1 : 0)));
  }, [producto.stock]);

  // Calcula la calificación promedio si hay reseñas
  const averageRating = useMemo(() => { // useMemo estaba dando el error, ahora importado
    if (!producto.reviews || producto.reviews.length === 0) {
      return 0;
    }
    const totalRating = producto.reviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / producto.reviews.length).toFixed(1); // Redondea a un decimal
  }, [producto.reviews]);

  // Renderiza el componente ProductCard
  return (
    <div
      // Contenedor principal de la tarjeta con estilos de Tailwind CSS para un diseño responsivo y atractivo.
      // Incluye sombras, bordes redondeados, fondo dinámico y efectos hover.
      onClick={() => onOpenDetails(producto)} // Abre el modal de detalles al hacer clic en la tarjeta
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 cursor-pointer flex flex-col h-full overflow-hidden border border-gray-100 dark:border-gray-700"
    >
      {/* Contenedor de la imagen del producto */}
      <div className="relative w-full h-48 sm:h-56 overflow-hidden rounded-t-2xl">
        {isOutOfStock && (
          // Muestra un indicador de "Agotado" si el producto no tiene stock.
          <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-10 rounded-t-2xl">
            <span className="text-white font-bold text-xl sm:text-2xl animate-pulse">¡Agotado!</span>
          </div>
        )}
        {producto.image ? (
          // Muestra la imagen del producto si está disponible.
          <img
            src={producto.image}
            alt={producto.name}
            className={`w-full h-full object-cover transition-transform duration-300 ${isOutOfStock ? 'grayscale' : 'hover:scale-105'}`}
            // Fallback para la imagen en caso de error de carga.
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = `https://placehold.co/224x224/E0E0E0/6C6C6C?text=No+Imagen`;
              e.target.alt = "Imagen no disponible";
            }}
          />
        ) : (
          // Muestra un icono de "Imagen no disponible" si no hay imagen.
          <div className="w-full h-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-400 rounded-t-2xl">
            <ImageOff size={64} />
          </div>
        )}
        {/* Botón de favorito */}
        <button
          onClick={(e) => {
            e.stopPropagation(); // Evita que se abra el modal de detalles al hacer clic en el corazón
            onToggleFavorite(producto.id);
          }}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-2
            ${isFavorite ? 'bg-red-500 text-white' : 'bg-white text-gray-400 hover:text-red-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:text-red-400'}
          `}
          aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
        </button>
      </div>

      {/* Cuerpo de la tarjeta con información del producto */}
      <div className="p-4 flex-grow flex flex-col justify-between">
        <div>
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 truncate" title={producto.name}>
            {producto.name}
          </h3>
          <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 line-clamp-3">
            {producto.descripcion}
          </p>
          {/* Valoración promedio si existe */}
          {producto.reviews && producto.reviews.length > 0 && (
            <div className="flex items-center text-gray-700 dark:text-gray-300 mb-3">
              <Star size={16} className="text-yellow-400 fill-current mr-1" />
              <span className="text-sm font-semibold">{averageRating}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({producto.reviews.length} reseñas)</span>
            </div>
          )}
        </div>

        {/* Sección de precio y stock */}
        <div className="flex justify-between items-baseline mb-4">
          <p className="text-3xl font-extrabold text-red-700 dark:text-red-400">
            ${displayPrecio}
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Stock: <span className={`font-semibold ${producto.stock <= 5 && producto.stock > 0 ? 'text-orange-500' : isOutOfStock ? 'text-red-600' : 'text-green-600'}`}>
              {isOutOfStock ? 'Agotado' : producto.stock}
            </span>
          </p>
        </div>

        {/* Controles de cantidad y botón "Agregar al carrito" */}
        <div className="flex items-center justify-between mt-auto space-x-2">
          {/* Controles de cantidad */}
          <div className="flex items-center rounded-xl bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
            <button
              onClick={handleDecreaseQuantity}
              className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-l-xl transition-colors duration-200"
              aria-label="Disminuir cantidad"
            >
              <Minus size={18} />
            </button>
            <span className="px-3 py-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {quantity}
            </span>
            <button
              onClick={handleIncreaseQuantity}
              className="p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-r-xl transition-colors duration-200"
              aria-label="Aumentar cantidad"
              disabled={isOutOfStock || quantity >= producto.stock} // Deshabilita si agotado o ya en max stock
            >
              <Plus size={18} />
            </button>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation(); // Detiene la propagación para no abrir el modal
              onAddToCart(producto, quantity);
              setQuantity(producto.stock > 0 ? 1 : 0); // RESTABLECE LA CANTIDAD A 1 (o 0 si agotado) DESPUÉS DE AÑADIR AL CARRITO
            }}
            className={`flex items-center justify-center gap-2 text-white text-base font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2
              ${isOutOfStock || quantity === 0 // Deshabilita si agotado o si la cantidad a agregar es 0
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed' 
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:focus:ring-red-800'}`}
            aria-label={isOutOfStock ? "Producto agotado" : "Agregar al carrito"}
            disabled={isOutOfStock || quantity === 0} // Deshabilita si agotado o cantidad es 0
          >
            <ShoppingCart size={20} />
            <span className="hidden sm:inline">Añadir</span>
          </button>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
