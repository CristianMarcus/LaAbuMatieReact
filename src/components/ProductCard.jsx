// src/components/ProductCard.jsx
import React, { useState, useCallback, useMemo, useEffect } from 'react';
// Asegúrate de que todos los iconos necesarios estén importados, incluyendo ListPlus
import { ShoppingCart, ImageOff, Plus, Minus, Heart, Star, Pizza, ListPlus } from 'lucide-react';

// Componente funcional ProductCard: Muestra una tarjeta individual de producto.
// Props:
// - producto: Objeto con los datos del producto (id, name, precio, descripcion, imageUrl, stock, reviews, sauces, flavors, sizes, precioMediaDocena, precioDocena).
// - onAddToCart: Función para añadir el producto al carrito.
// - onOpenDetails: Función para abrir el modal de detalles del producto.
// - isFavorite: Booleano que indica si el producto es favorito.
// - onToggleFavorite: Nueva función para añadir/quitar de favoritos.
// - showNotification: Función para mostrar notificaciones (pasada desde App.jsx)
const ProductCard = React.memo(({ producto, onAddToCart, onOpenDetails, isFavorite, onToggleFavorite, showNotification }) => {
  // Estado local para la cantidad del producto a añadir al carrito (para unidades)
  const [quantity, setQuantity] = useState(producto.stock > 0 ? 1 : 0);
  // Estado para la salsa seleccionada (para Pastas)
  const [selectedSauce, setSelectedSauce] = useState(null);
  // Estado para el sabor seleccionado (para Pastas)
  const [selectedFlavor, setSelectedFlavor] = useState(null);
  // Estado para el tamaño seleccionado (para Papas Fritas)
  const [selectedSize, setSelectedSize] = useState(null);
  // Estado para el tipo de cantidad seleccionada para Empanadas/Canastitas
  const [selectedQuantityType, setSelectedQuantityType] = useState('unit'); // 'unit', 'half-dozen', 'dozen'


  // Efecto para inicializar la salsa, el sabor, el tamaño y el tipo de cantidad
  // Este efecto se ejecuta cada vez que el 'producto' cambia, asegurando que las opciones
  // se reinicien o se establezcan por defecto según la categoría del producto.
  useEffect(() => {
    // Lógica para Pastas (salsa y sabor)
    if (producto.category === 'Pastas') {
      if (producto.sauces && producto.sauces.length > 0) {
        // Selecciona la salsa 'De la Casa' por defecto si existe, de lo contrario la primera
        const defaultSauce = producto.sauces.find(s => s.name === 'De la Casa') || producto.sauces[0];
        setSelectedSauce(defaultSauce);
      } else {
        setSelectedSauce(null);
      }
      if (producto.flavors && producto.flavors.length > 0) {
        setSelectedFlavor(producto.flavors[0]); // Selecciona el primer sabor por defecto
      } else {
        setSelectedFlavor(null);
      }
      setSelectedSize(null); // Asegurarse de que el tamaño no esté seleccionado para Pastas
      setSelectedQuantityType('unit'); // El tipo de cantidad no aplica para pastas
    }
    // Lógica para Papas Fritas (tamaños)
    else if (producto.category === 'Papas Fritas') {
      if (producto.sizes && producto.sizes.length > 0) {
        setSelectedSize(producto.sizes[0]); // Selecciona el primer tamaño por defecto
      } else {
        setSelectedSize(null);
      }
      setSelectedSauce(null); // Asegurarse de que la salsa no esté seleccionada para Papas Fritas
      setSelectedFlavor(null); // Asegurarse de que el sabor no esté seleccionado para Papas Fritas
      setSelectedQuantityType('unit'); // El tipo de cantidad no aplica para papas
    }
    // Lógica para Empanadas y Canastitas (resetear tipo de cantidad al cambiar de producto)
    else if (producto.category === 'Empanadas y Canastitas') {
      setSelectedQuantityType('unit'); // Por defecto, seleccionar unidad
      setSelectedSauce(null);
      setSelectedFlavor(null);
      setSelectedSize(null);
    }
    // Para otras categorías, asegurar que no haya selecciones de extras
    else {
      setSelectedSauce(null);
      setSelectedFlavor(null);
      setSelectedSize(null);
      setSelectedQuantityType('unit');
    }

    // Resetear cantidad a 1 si hay stock, o 0 si no hay
    setQuantity(producto.stock > 0 ? 1 : 0);
  }, [producto]); // Dependencia del efecto: 'producto'

  // Determina si el producto está agotado
  const isOutOfStock = useMemo(() => producto.stock <= 0, [producto.stock]);

  // Calcula el precio a mostrar en la tarjeta.
  // Para empanadas/canastitas, muestra todas las opciones de precio (unidad, 1/2 docena, docena).
  // Para otros productos, muestra el precio base más el costo de extras seleccionados.
  const displayPrice = useMemo(() => {
    if (producto.category === 'Empanadas y Canastitas') {
      let priceString = [];
      if (producto.precio > 0) priceString.push(`$${Math.floor(producto.precio)} (Unid.)`);
      if (producto.precioMediaDocena > 0) priceString.push(`$${Math.floor(producto.precioMediaDocena)} (1/2 Doc.)`);
      if (producto.precioDocena > 0) priceString.push(`$${Math.floor(producto.precioDocena)} (Doc.)`);
      return priceString.join(' | '); // Une las opciones con un separador
    } else {
      let price = producto.precio || 0;
      if (producto.category === 'Pastas') {
        price += selectedSauce?.price || 0;
      } else if (producto.category === 'Papas Fritas') {
        price += selectedSize?.price || 0;
      }
      return `$${Math.floor(price)}`;
    }
  }, [producto, selectedSauce, selectedSize]);


  // Manejadores para aumentar/disminuir la cantidad.
  // Se detiene la propagación del evento para evitar que el clic en los botones +/-
  // abra el modal de detalles del producto.
  const handleIncrease = useCallback((e) => {
    e.stopPropagation();
    if (quantity < producto.stock) {
      setQuantity((prev) => prev + 1);
    } else {
      showNotification(`¡Atención! No hay más stock de ${producto.name}.`, 'warning', 2000);
    }
  }, [quantity, producto.stock, producto.name, showNotification]);

  const handleDecrease = useCallback((e) => {
    e.stopPropagation();
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  }, [quantity]);

  // Manejador para abrir el modal de combinación de pizzas o empanadas
  const handleOpenCombineModal = useCallback((e) => {
    e.stopPropagation();
    if (producto.category === 'Pizzas') {
      onOpenDetails(producto, { isCombinedPizzaSelection: true });
    } else if (producto.category === 'Empanadas y Canastitas' && (selectedQuantityType === 'half-dozen' || selectedQuantityType === 'dozen')) {
      onOpenDetails(producto, { isCombinedEmpanadaSelection: true, combinedType: selectedQuantityType });
    }
  }, [producto, onOpenDetails, selectedQuantityType]);

  // Manejador para añadir un producto (pizza completa, pasta, papa frita, empanada/canastita por unidad) al carrito
  const handleAddToCartDirectly = useCallback((e) => {
    e.stopPropagation();
    const requiresSauce = producto.category === 'Pastas' && producto.sauces && producto.sauces.length > 0;
    const requiresFlavor = producto.category === 'Pastas' && producto.flavors && producto.flavors.length > 0;
    const requiresSize = producto.category === 'Papas Fritas' && producto.sizes && producto.sizes.length > 0;

    if (quantity > 0 && !isOutOfStock) {
      if (requiresSauce && !selectedSauce) {
        showNotification('Por favor, selecciona una salsa para este producto.', 'warning');
        return;
      }
      if (requiresFlavor && !selectedFlavor) {
        showNotification('Por favor, selecciona un sabor para este producto.', 'warning');
        return;
      }
      if (requiresSize && !selectedSize) {
        showNotification('Por favor, selecciona un tamaño para este producto.', 'warning');
        return;
      }

      const itemToAdd = {
        ...producto,
        quantity: quantity,
        selectedSauce: selectedSauce || null,
        selectedFlavor: selectedFlavor || null,
        selectedSize: selectedSize || null,
        precio: producto.precio, // Precio base por unidad para estos casos
        selectedQuantityType: 'unit', // Siempre 'unit' para añadir directamente
      };
      onAddToCart(itemToAdd);
      setQuantity(1); // Resetear cantidad a 1 después de añadir al carrito
      showNotification(`"${producto.name}" añadido al carrito.`, 'success', 2000);
    } else if (isOutOfStock) {
      showNotification(`"${producto.name}" está agotado.`, 'error', 2000);
    } else if (quantity === 0) {
      showNotification(`Por favor, selecciona una cantidad para "${producto.name}".`, 'warning', 2000);
    }
  }, [producto, quantity, isOutOfStock, onAddToCart, selectedSauce, selectedFlavor, selectedSize, showNotification]);


  // Manejador para abrir detalles del producto (clic en la tarjeta o título).
  const handleOpenDetailsClick = useCallback(() => {
    onOpenDetails(producto);
  }, [onOpenDetails, producto]);

  // Manejadores para la selección de opciones (salsa, sabor, tamaño) que detienen la propagación.
  // Esto es crucial para que al hacer clic en una opción, no se abra el modal de detalles de la tarjeta.
  const handleSauceSelection = useCallback((e, sauce) => {
    e.stopPropagation();
    setSelectedSauce(sauce);
  }, []);

  const handleFlavorSelection = useCallback((e, flavor) => {
    e.stopPropagation();
    setSelectedFlavor(flavor);
  }, []);

  const handleSizeSelection = useCallback((e, size) => {
    e.stopPropagation();
    setSelectedSize(size);
  }, []);


  // Condición para deshabilitar el botón de añadir al carrito directo
  const disableAddToCartDirectlyButton = useMemo(() => {
    const requiresSauce = producto.category === 'Pastas' && producto.sauces && producto.sauces.length > 0;
    const requiresFlavor = producto.category === 'Pastas' && producto.flavors && producto.flavors.length > 0;
    const requiresSize = producto.category === 'Papas Fritas' && producto.sizes && producto.sizes.length > 0;

    return (
      isOutOfStock || // Si no hay stock
      quantity === 0 || // Si la cantidad es 0
      (requiresSauce && !selectedSauce) || // Si requiere salsa y no se seleccionó
      (requiresFlavor && !selectedFlavor) || // Si requiere sabor y no se seleccionó
      (requiresSize && !selectedSize) // Si requiere tamaño y no se seleccionó
    );
  }, [isOutOfStock, quantity, producto.category, producto.sauces, selectedSauce, producto.flavors, selectedFlavor, producto.sizes, selectedSize]);

  // Condición para deshabilitar el botón de combinar pizzas/empanadas
  const disableCombineButton = useMemo(() => {
    if (producto.category === 'Pizzas' || (producto.category === 'Empanadas y Canastitas' && (selectedQuantityType === 'half-dozen' || selectedQuantityType === 'dozen'))) {
      return isOutOfStock; // Solo deshabilitado si el producto "contenedor" está agotado
    }
    return true; // Por defecto, deshabilitado si no es una pizza o empanada combinable
  }, [isOutOfStock, producto.category, selectedQuantityType]);


  // Texto dinámico para el botón de añadir al carrito, basado en el estado del producto y las selecciones.
  const addToCartButtonText = useMemo(() => {
    if (isOutOfStock) return 'Agotado';
    if (producto.category === 'Pastas') {
      if (!selectedFlavor) return 'Elegir Sabor';
      if (!selectedSauce) return 'Elegir Salsa';
    }
    if (producto.category === 'Papas Fritas' && producto.sizes && producto.sizes.length > 0 && !selectedSize) {
      return 'Elegir Tamaño';
    }
    // Para empanadas/canastitas, el texto cambia según el tipo de cantidad seleccionado
    if (producto.category === 'Empanadas y Canastitas' && selectedQuantityType === 'unit') {
        return `Añadir ${quantity} ${quantity > 1 ? 'unidades' : 'unidad'}`;
    }
    return 'Añadir al Carrito';
  }, [isOutOfStock, producto.category, quantity, selectedFlavor, selectedSauce, selectedSize, selectedQuantityType]);


  // Calcula el promedio de reseñas aprobadas para mostrar en la tarjeta.
  const averageRating = useMemo(() => {
    if (!producto.reviews || producto.reviews.length === 0) return 0;
    const approvedReviews = producto.reviews.filter(review => review.approved);
    if (approvedReviews.length === 0) return 0;
    const totalRating = approvedReviews.reduce((sum, review) => sum + review.rating, 0);
    return (totalRating / approvedReviews.length).toFixed(1);
  }, [producto.reviews]);


  return (
    // Contenedor principal de la tarjeta: responsivo, con sombras y transiciones.
    // La opacidad y escala de grises se aplican si el producto está agotado.
    <div
      className={`relative bg-white dark:bg-gray-800 rounded-3xl shadow-xl hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-hidden
        ${isOutOfStock ? 'opacity-70 grayscale' : ''}`}
    >
      {/* Botón de Favoritos: Posicionado en la esquina superior derecha, con estilos dinámicos. */}
      {onToggleFavorite && (
        <button
          onClick={(e) => { e.stopPropagation(); onToggleFavorite(producto.id); }}
          className={`absolute top-4 right-4 p-2 rounded-full z-10 transition-colors duration-200 shadow-md
            ${isFavorite ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'}`}
          aria-label={isFavorite ? "Quitar de favoritos" : "Añadir a favoritos"}
        >
          <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
        </button>
      )}

      {/* Imagen del Producto: Ocupa el ancho completo, con altura fija y efecto hover. */}
      {/* El clic en la imagen también abre los detalles del producto. */}
      <div
        className="w-full h-56 bg-gray-200 dark:bg-gray-700 flex items-center justify-center overflow-hidden cursor-pointer rounded-t-2xl"
        onClick={handleOpenDetailsClick}
      >
        {producto.image ? (
          <img
            src={producto.image}
            alt={producto.name}
            className="w-full h-full object-cover transition-transform duration-500 ease-in-out hover:scale-110"
            // Fallback de imagen en caso de error de carga
            onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x300/A0522D/F0F8FF?text=${encodeURIComponent(producto.name.substring(0, 3))}`; }}
          />
        ) : (
          // Icono de imagen rota si no hay URL de imagen
          <ImageOff size={48} className="text-gray-500 dark:text-gray-400" />
        )}
      </div>

      {/* Información del Producto: Contenedor flexible para el contenido textual. */}
      <div className="p-4 sm:p-6 flex-grow flex flex-col">
        {/* Título del Producto: Negrita, con efecto hover y clic para abrir detalles. */}
        <h3
          className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1 cursor-pointer hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
          onClick={handleOpenDetailsClick}
        >
          {producto.name}
        </h3>
        {/* Descripción del Producto: Texto truncado a dos líneas para mantener la uniformidad. */}
        <p className="text-gray-600 dark:text-gray-300 text-sm sm:text-base flex-grow mb-3 line-clamp-2">
          {producto.descripcion}
        </p>

        {/* Precio y Reseñas: Mostrados en una fila con espacio entre ellos. */}
        <div className="flex justify-between items-center mb-4">
          <p className="text-xl sm:text-2xl font-extrabold text-red-600 dark:text-red-400">
            {displayPrice}
          </p>
          {averageRating > 0 && (
            <div className="flex items-center text-yellow-500 flex-shrink-0">
              <Star size={18} className="fill-current" />
              <span className="ml-1 text-gray-700 dark:text-gray-200 font-semibold text-sm">{averageRating}</span>
              <span className="text-gray-500 dark:text-gray-400 text-xs ml-1">({producto.reviews?.filter(r => r.approved).length || 0})</span>
            </div>
          )}
        </div>

        {/* Opciones de sabor (solo para Pastas): Muestra los sabores disponibles como botones seleccionables. */}
        {producto.category === 'Pastas' && producto.flavors && producto.flavors.length > 0 && (
          <div className="mb-4">
            <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Elige tu Sabor:</p>
            <div className="flex flex-wrap gap-2"> {/* `flex-wrap` para responsividad */}
              {producto.flavors.map((flavor) => (
                <label
                  key={flavor.id}
                  className={`flex items-center px-4 py-2 rounded-full border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md
                    ${selectedFlavor?.id === flavor.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-700'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  onClick={(e) => e.stopPropagation()} // Detiene la propagación en el label
                >
                  <input
                    type="radio"
                    name={`flavor-${producto.id}`}
                    value={flavor.id}
                    checked={selectedFlavor?.id === flavor.id}
                    onChange={(e) => handleFlavorSelection(e, flavor)} // Usa el nuevo manejador
                    className="mr-2 hidden" // Oculta el radio button nativo
                  />
                  {flavor.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Opciones de salsa (solo para Pastas): Muestra las salsas disponibles como botones seleccionables. */}
        {producto.category === 'Pastas' && producto.sauces && producto.sauces.length > 0 && (
          <div className="mb-4">
            <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Elige tu Salsa:</p>
            <div className="flex flex-wrap gap-2"> {/* `flex-wrap` para responsividad */}
              {producto.sauces.map((sauce) => (
                <label
                  key={sauce.id}
                  className={`flex items-center px-4 py-2 rounded-full border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md
                    ${selectedSauce?.id === sauce.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-700'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  onClick={(e) => e.stopPropagation()} // Detiene la propagación en el label
                >
                  <input
                    type="radio"
                    name={`sauce-${producto.id}`}
                    value={sauce.id}
                    checked={selectedSauce?.id === sauce.id}
                    onChange={(e) => handleSauceSelection(e, sauce)}
                    className="mr-2 hidden"
                  />
                  {sauce.name}
                  {!sauce.isFree && sauce.price > 0 && (
                    <span className="ml-1 text-xs font-bold opacity-80"> (+${Math.floor(sauce.price)})</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Opciones de tamaño (solo para Papas Fritas): Muestra los tamaños disponibles como botones seleccionables. */}
        {producto.category === 'Papas Fritas' && producto.sizes && producto.sizes.length > 0 && (
          <div className="mb-4">
            <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Elige tu Tamaño:</p>
            <div className="flex flex-wrap gap-2"> {/* `flex-wrap` para responsividad */}
              {producto.sizes.map((size) => (
                <label
                  key={size.id}
                  className={`flex items-center px-4 py-2 rounded-full border-2 cursor-pointer transition-all duration-200 shadow-sm hover:shadow-md
                    ${selectedSize?.id === size.id
                      ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white border-blue-700'
                      : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                  onClick={(e) => e.stopPropagation()} // Detiene la propagación en el label
                >
                  <input
                    type="radio"
                    name={`size-${producto.id}`}
                    value={size.id}
                    checked={selectedSize?.id === size.id}
                    onChange={(e) => handleSizeSelection(e, size)}
                    className="mr-2 hidden"
                  />
                  {size.name}
                  {size.price > 0 && (
                    <span className="ml-1 text-xs font-bold opacity-80"> (+${Math.floor(size.price)})</span>
                  )}
                </label>
              ))}
            </div>
          </div>
        )}

        {/* Controles de cantidad y botones de acción principal.
            Diseño flexible que se adapta a diferentes tamaños de pantalla. */}
        <div className="flex flex-col sm:flex-row items-center justify-between mt-auto gap-4 pt-4 border-t border-gray-100 dark:border-gray-700">
          {/* Lógica específica para Empanadas y Canastitas:
              Muestra botones para seleccionar tipo de cantidad (Unidad, 1/2 Docena, Docena)
              y un control de cantidad +/- si se selecciona 'Unidad'. */}
          {producto.category === 'Empanadas y Canastitas' ? (
            <div className="flex flex-col w-full gap-3">
              {/* Botones de selección de tipo de cantidad */}
              <div className="flex flex-wrap justify-center gap-2 w-full"> {/* `flex-wrap` para que los botones se envuelvan en pantallas pequeñas */}
                <button
                  onClick={(e) => { e.stopPropagation(); setSelectedQuantityType('unit'); setQuantity(1); }} // Resetear cantidad a 1 al cambiar tipo
                  className={`flex-1 min-w-[90px] px-3 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 border-2 shadow-sm
                    ${selectedQuantityType === 'unit'
                      ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-800'
                      : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                    } disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed`}
                  disabled={isOutOfStock}
                  aria-label="Seleccionar cantidad por unidad"
                >
                  Unidad
                </button>
                {producto.precioMediaDocena > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedQuantityType('half-dozen'); setQuantity(1); }} // Resetear cantidad a 1
                    className={`flex-1 min-w-[90px] px-3 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 border-2 shadow-sm
                      ${selectedQuantityType === 'half-dozen'
                        ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-800'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                      } disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed`}
                    disabled={isOutOfStock || producto.stock < 6} // Deshabilitar si no hay stock para media docena
                    aria-label="Seleccionar media docena"
                  >
                    1/2 Docena
                  </button>
                )}
                {producto.precioDocena > 0 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setSelectedQuantityType('dozen'); setQuantity(1); }} // Resetear cantidad a 1
                    className={`flex-1 min-w-[90px] px-3 py-2 rounded-lg text-sm sm:text-base font-medium transition-all duration-200 border-2 shadow-sm
                      ${selectedQuantityType === 'dozen'
                        ? 'bg-gradient-to-r from-red-600 to-red-800 text-white border-red-800'
                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                      } disabled:opacity-40 disabled:grayscale disabled:cursor-not-allowed`}
                    disabled={isOutOfStock || producto.stock < 12} // Deshabilitar si no hay stock para docena
                    aria-label="Seleccionar docena"
                  >
                    Docena
                  </button>
                )}
              </div>

              {/* Si se selecciona 'Unidad', mostrar el control de cantidad normal (+/-) */}
              {selectedQuantityType === 'unit' && (
                <div className="flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 rounded-full overflow-hidden shadow-md w-full sm:w-auto mx-auto mt-3">
                  <button
                    onClick={handleDecrease}
                    className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 rounded-l-full"
                    aria-label="Disminuir cantidad"
                    disabled={isOutOfStock || quantity <= 1}
                  >
                    <Minus size={20} />
                  </button>
                  <span className="px-5 py-3 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncrease}
                    className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 rounded-r-full"
                    aria-label="Aumentar cantidad"
                    disabled={isOutOfStock || quantity >= producto.stock}
                  >
                    <Plus size={20} />
                  </button>
                </div>
              )}

              {/* Botones de acción para Empanadas y Canastitas */}
              {(selectedQuantityType === 'half-dozen' || selectedQuantityType === 'dozen') ? (
                <button
                  onClick={handleOpenCombineModal} // Abre el modal de combinación de empanadas
                  className={`flex items-center justify-center gap-2 text-white text-base sm:text-lg font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 w-full mt-4 transform hover:scale-105
                    ${disableCombineButton
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed disabled:opacity-40 disabled:grayscale'
                      : 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 focus:ring-indigo-500'}`
                  }
                  aria-label={disableCombineButton ? "Agotado" : `Combinar ${selectedQuantityType === 'half-dozen' ? '1/2 Docena' : 'Docena'}`}
                  disabled={disableCombineButton}
                >
                  <ListPlus size={24} /> {disableCombineButton ? 'Agotado' : `Combinar ${selectedQuantityType === 'half-dozen' ? '1/2 Docena' : 'Docena'}`}
                </button>
              ) : (
                <button
                  onClick={handleAddToCartDirectly} // Añade la unidad al carrito
                  className={`flex items-center justify-center gap-2 text-white text-base sm:text-lg font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 w-full mt-4 transform hover:scale-105
                    ${disableAddToCartDirectlyButton
                      ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed disabled:opacity-40 disabled:grayscale'
                      : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 focus:ring-red-500'}`
                  }
                  aria-label={addToCartButtonText}
                  disabled={disableAddToCartDirectlyButton}
                >
                  <ShoppingCart size={24} /> {addToCartButtonText}
                </button>
              )}
            </div>
          ) : producto.category === 'Pizzas' ? (
            // Lógica para Pizzas: Controles de cantidad, botón de Añadir al Carrito y botón de Combinar
            <div className="flex flex-col w-full gap-3">
              {/* Controles de cantidad para pizzas */}
              <div className="flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 rounded-full overflow-hidden shadow-md w-full sm:w-auto mx-auto">
                <button
                  onClick={handleDecrease}
                  className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 rounded-l-full"
                  aria-label="Disminuir cantidad"
                  disabled={isOutOfStock || quantity <= 1}
                >
                  <Minus size={20} />
                </button>
                <span className="px-5 py-3 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrease}
                  className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 rounded-r-full"
                  aria-label="Aumentar cantidad"
                  disabled={isOutOfStock || quantity >= producto.stock}
                >
                  <Plus size={20} />
                </button>
              </div>
              {/* Botón Añadir al Carrito para Pizza completa */}
              <button
                onClick={handleAddToCartDirectly}
                className={`flex items-center justify-center gap-2 text-white text-base sm:text-lg font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 w-full mt-4 transform hover:scale-105
                  ${disableAddToCartDirectlyButton
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed disabled:opacity-40 disabled:grayscale'
                    : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 focus:ring-red-500'}`
                }
                aria-label={addToCartButtonText}
                disabled={disableAddToCartDirectlyButton}
              >
                <ShoppingCart size={24} /> {addToCartButtonText}
              </button>
              {/* Botón Combinar Pizza */}
              <button
                onClick={handleOpenCombineModal}
                className={`flex items-center justify-center gap-2 text-white text-base sm:text-lg font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 w-full mt-2 transform hover:scale-105
                  ${disableCombineButton
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed disabled:opacity-40 disabled:grayscale'
                    : 'bg-gradient-to-r from-indigo-600 to-indigo-800 hover:from-indigo-700 hover:to-indigo-900 focus:ring-indigo-500'}`
                }
                aria-label={disableCombineButton ? "Agotado" : "Combinar Pizza"}
                disabled={disableCombineButton}
              >
                <Pizza size={24} /> {disableCombineButton ? 'Agotado' : 'Combinar Pizza'}
              </button>
            </div>
          ) : (
            // Botón único para productos no-pizza ni empanadas/canastitas con opciones de docena
            <div className="flex flex-col w-full gap-3">
              {/* Controles de cantidad para productos individuales */}
              <div className="flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 rounded-full overflow-hidden shadow-md w-full sm:w-auto mx-auto">
                <button
                  onClick={handleDecrease}
                  className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 rounded-l-full"
                  aria-label="Disminuir cantidad"
                  disabled={isOutOfStock || quantity <= 1}
                >
                  <Minus size={20} />
                </button>
                <span className="px-5 py-3 text-2xl font-bold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                  {quantity}
                </span>
                <button
                  onClick={handleIncrease}
                  className="p-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 rounded-r-full"
                  aria-label="Aumentar cantidad"
                  disabled={isOutOfStock || quantity >= producto.stock}
                >
                  <Plus size={20} />
                </button>
              </div>
              {/* Botón Añadir al Carrito para otros productos */}
              <button
                onClick={handleAddToCartDirectly}
                className={`flex items-center justify-center gap-2 text-white text-base sm:text-lg font-bold py-3 px-6 rounded-full transition-all duration-300 shadow-xl hover:shadow-2xl focus:outline-none focus:ring-4 w-full mt-4 transform hover:scale-105
                  ${disableAddToCartDirectlyButton
                    ? 'bg-gray-400 dark:bg-gray-600 cursor-not-allowed disabled:opacity-40 disabled:grayscale'
                    : 'bg-gradient-to-r from-red-600 to-red-800 hover:from-red-700 hover:to-red-900 focus:ring-red-500'}`
                }
                aria-label={addToCartButtonText}
                disabled={disableAddToCartDirectlyButton}
              >
                <ShoppingCart size={24} /> {addToCartButtonText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default ProductCard;
