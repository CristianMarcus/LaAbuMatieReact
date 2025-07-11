// src/components/ProductCard.jsx
import React, { useState, useCallback, useMemo, useEffect } from 'react'; // Importa useEffect
import { ShoppingCart, ImageOff, Plus, Minus, Heart, Star } from 'lucide-react';

// Componente funcional ProductCard: Muestra una tarjeta individual de producto.
// Props:
// - producto: Objeto con los datos del producto (id, name, precio, descripcion, imageUrl, stock, reviews, sauces).
// - onAddToCart: Función para añadir el producto al carrito.
// - onOpenDetails: Función para abrir el modal de detalles del producto.
// - isFavorite: Booleano que indica si el producto es favorito.
// - onToggleFavorite: Nueva función para añadir/quitar de favoritos.
const ProductCard = React.memo(({ producto, onAddToCart, onOpenDetails, isFavorite, onToggleFavorite }) => {
  // Estado local para la cantidad del producto a añadir al carrito
  const [quantity, setQuantity] = useState(producto.stock > 0 ? 1 : 0);
  // Nuevo estado para la salsa seleccionada
  const [selectedSauce, setSelectedSauce] = useState(null);

  // Efecto para inicializar la salsa seleccionada cuando el producto cambia o se monta
  useEffect(() => {
    if (producto.category === 'Pastas' && producto.sauces && producto.sauces.length > 0) {
      // Por defecto, selecciona la primera salsa si es "De la Casa" o la primera disponible
      const defaultSauce = producto.sauces.find(s => s.name === 'De la Casa') || producto.sauces[0];
      setSelectedSauce(defaultSauce);
    } else {
      setSelectedSauce(null); // No hay salsas para este producto
    }
  }, [producto]); // Depende de 'producto' para re-inicializar cuando cambie

  // Aseguramos que precio sea un número válido y lo redondeamos a un número entero
  // Ahora incluye el precio de la salsa seleccionada
  const displayPrecio = useMemo(() => {
    let basePrice = typeof producto.precio === 'number' ? Math.floor(producto.precio) : 0;
    if (selectedSauce && typeof selectedSauce.price === 'number') {
      basePrice += selectedSauce.price;
    }
    return basePrice;
  }, [producto.precio, selectedSauce]);

  // Booleano para verificar si el producto está agotado
  const isOutOfStock = producto.stock <= 0;

  // Manejador para incrementar la cantidad, asegurando que no supere el stock disponible
  const handleIncrease = useCallback(() => {
    setQuantity(prevQuantity => Math.min(prevQuantity + 1, producto.stock));
  }, [producto.stock]);

  // Manejador para decrementar la cantidad, asegurando que no baje de 1 (o 0 si ya está agotado)
  const handleDecrease = useCallback(() => {
    setQuantity(prevQuantity => Math.max(prevQuantity - 1, producto.stock > 0 ? 1 : 0));
  }, [producto.stock]);

  // Manejador para añadir al carrito
  const handleAddToCartClick = useCallback((e) => {
    e.stopPropagation(); // Detiene la propagación para no abrir el modal
    // Pasa la salsa seleccionada al carrito
    onAddToCart({ ...producto, selectedSauce: selectedSauce }, quantity); // Pasa el producto modificado con la salsa
    setQuantity(producto.stock > 0 ? 1 : 0); // RESTABLECE LA CANTIDAD A 1 (o 0 si agotado) DESPUÉS DE AÑADIR AL CARRITO
  }, [onAddToCart, producto, quantity, selectedSauce]); // Añadido selectedSauce a las dependencias

  // Manejador para abrir detalles del producto
  const handleOpenDetailsClick = useCallback(() => {
    onOpenDetails(producto);
  }, [onOpenDetails, producto]);

  // Manejador para la selección de salsa que detiene la propagación
  const handleSauceSelection = useCallback((e, sauce) => {
    e.stopPropagation(); // Detiene la propagación para no abrir el modal
    setSelectedSauce(sauce);
  }, []);

  return (
    <div
      className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 flex flex-col h-full overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
      onClick={handleOpenDetailsClick} // Abre el modal de detalles al hacer clic en cualquier parte de la tarjeta
      aria-label={`Ver detalles de ${producto.name}`}
    >
      {/* Sección de la imagen del producto */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700 rounded-t-2xl overflow-hidden flex-shrink-0">
        {producto.image ? (
          <img
            src={producto.image}
            alt={producto.name}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x200/A0522D/F0F8FF?text=${encodeURIComponent(producto.name)}`; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
            <ImageOff size={48} />
          </div>
        )}
        {/* Botón de favoritos */}
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(producto.id); }}
          className={`absolute top-3 right-3 p-2 rounded-full shadow-md transition-colors duration-200 focus:outline-none focus:ring-2
            ${isFavorite
              ? 'bg-red-500 hover:bg-red-600 text-white focus:ring-red-300'
              : 'bg-white hover:bg-gray-100 text-gray-500 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-gray-300 focus:ring-gray-300'
            }`}
          aria-label={isFavorite ? `Eliminar ${producto.name} de favoritos` : `Añadir ${producto.name} a favoritos`}
        >
          <Heart size={20} className={isFavorite ? "fill-current" : ""} />
        </button>
      </div>

      {/* Sección de contenido del producto */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">{producto.name}</h3>
        <p className="text-gray-600 dark:text-gray-300 text-sm mb-3 flex-grow">{producto.descripcion}</p>

        {/* Precio del producto */}
        <p className="text-3xl font-extrabold text-red-600 dark:text-red-400 mb-4">
          ${displayPrecio}
          {producto.stock <= 5 && producto.stock > 0 && (
            <span className="ml-2 text-sm font-semibold text-orange-500 dark:text-orange-300">
              ¡Últimas {producto.stock} unidades!
            </span>
          )}
          {isOutOfStock && (
            <span className="ml-2 text-sm font-semibold text-red-500 dark:text-red-300">
              Agotado
            </span>
          )}
        </p>

        {/* Opciones de salsa (solo para pastas) */}
        {producto.category === 'Pastas' && producto.sauces && producto.sauces.length > 0 && (
          <div className="mb-4">
            <p className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Elige tu Salsa:</p>
            <div className="flex flex-wrap gap-2">
              {producto.sauces.map((sauce) => (
                <label
                  key={sauce.id}
                  className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-all duration-200
                    ${selectedSauce?.id === sauce.id
                      ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  onClick={(e) => e.stopPropagation()} // Detiene la propagación en el label
                >
                  <input
                    type="radio"
                    name={`sauce-${producto.id}`}
                    value={sauce.id}
                    checked={selectedSauce?.id === sauce.id}
                    onChange={(e) => handleSauceSelection(e, sauce)} // Usa el nuevo manejador
                    className="mr-2 hidden" // Oculta el radio button nativo
                  />
                  {sauce.name}
                  {!sauce.isFree && sauce.price > 0 && (
                    <span className="ml-1 text-xs font-bold opacity-80"> (+${sauce.price})</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Controles de cantidad y botón Añadir al Carrito */}
        <div className="flex items-center justify-between mt-auto">
          <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden shadow-sm">
            <button
              onClick={(e) => { e.stopPropagation(); handleDecrease(); }}
              className="p-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-l-xl transition-colors duration-200"
              aria-label="Disminuir cantidad"
              disabled={isOutOfStock || quantity <= (producto.stock > 0 ? 1 : 0)}
            >
              <Minus size={18} />
            </button>
            <span className="px-4 py-2 text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800 font-semibold">
              {quantity}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); handleIncrease(); }}
              className="p-2 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-r-xl transition-colors duration-200"
              aria-label="Aumentar cantidad"
              disabled={isOutOfStock || quantity >= producto.stock}
            >
              <Plus size={18} />
            </button>
          </div>
          <button
            onClick={handleAddToCartClick}
            className={`flex items-center justify-center gap-2 text-white text-base font-medium py-2 px-4 rounded-xl transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2
              ${isOutOfStock || quantity === 0 || (producto.category === 'Pastas' && !selectedSauce) // Deshabilita si agotado, cantidad es 0, o es pasta sin salsa seleccionada
                ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed'
                : 'bg-red-600 hover:bg-red-700 focus:ring-red-300 dark:focus:ring-red-800'}`
            }
            aria-label={isOutOfStock ? "Producto agotado" : (producto.category === 'Pastas' && !selectedSauce ? "Selecciona una salsa" : "Agregar al carrito")}
            disabled={isOutOfStock || quantity === 0 || (producto.category === 'Pastas' && !selectedSauce)}
          >
            <ShoppingCart size={24} /> {isOutOfStock ? 'Agotado' : (producto.category === 'Pastas' && !selectedSauce ? 'Elegir Salsa' : 'Añadir al Carrito')}
          </button>
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
