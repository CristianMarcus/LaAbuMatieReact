import React, { useCallback, useMemo } from 'react';
import { XCircle, ShoppingCart, Minus, Plus, Trash2, ArrowRight, ShoppingBag, FileText } from 'lucide-react';

function ShoppingCartModal({
  cartItems,
  onClose,
  onIncreaseQuantity,
  onDecreaseQuantity,
  onRemoveItem,
  onClearCart,
  onViewSummary,
  showNotification,
}) {
  const total = useMemo(() => {
    return Math.floor(cartItems.reduce((sum, item) => {
      let itemBasePrice = item.precio || 0;

      // Si es empanada/canastita, el precio base depende del tipo de cantidad
      if (['Empanadas y Canastitas'].includes(item.category) && item.selectedQuantityType) {
        if (item.selectedQuantityType === 'docena') {
          itemBasePrice = item.precioDocena || (item.precio * 12);
        } else if (item.selectedQuantityType === 'mediaDocena') {
          itemBasePrice = item.precioMediaDocena || (item.precio * 6);
        } else { // 'unidad'
          itemBasePrice = item.precio || 0;
        }
      } else if (item.category === 'Pizzas' && item.selectedCombinedPizza) {
        // Si es una pizza combinada, toma el precio más alto
        itemBasePrice = Math.max(item.precio || 0, item.selectedCombinedPizza.precio || 0);
      }

      const itemPrice = itemBasePrice + (item.selectedSauce?.price || 0) + (item.selectedFlavor?.price || 0) + (item.selectedSize?.price || 0);
      return sum + itemPrice * item.quantity;
    }, 0));
  }, [cartItems]);

  const handleIncrease = useCallback((item) => {
    // Pass item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, and item.combinedEmpanadaFlavors to identify unique cart item
    // Calcular la cantidad total de unidades para la validación de stock
    let unitsPerItem = 1;
    if (['Empanadas y Canastitas'].includes(item.category)) {
      if (item.selectedQuantityType === 'mediaDocena') {
        unitsPerItem = 6;
      } else if (item.selectedQuantityType === 'docena') {
        unitsPerItem = 12;
      }
    }
    const currentTotalUnits = item.quantity * unitsPerItem;
    const newTotalUnitsIfIncreased = (item.quantity + 1) * unitsPerItem;

    // Para combinaciones de empanadas, el stock se refiere al número de "paquetes" (media docena/docena)
    if (item.combinedEmpanadaFlavors) {
        if (item.quantity + 1 <= item.stock) { // Validar contra el stock del "paquete"
            onIncreaseQuantity(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors);
        } else {
            if (showNotification) {
                showNotification(`¡Atención! No puedes añadir más ${item.selectedQuantityType === 'docena' ? 'docenas' : 'medias docenas'} de "${item.name}". Solo quedan ${item.stock - item.quantity} disponibles.`, 'warning', 3000);
            }
        }
    } else {
        // Lógica de stock para productos normales (unidades)
        if (newTotalUnitsIfIncreased <= item.stock) {
            onIncreaseQuantity(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors);
        } else {
            if (showNotification) {
                showNotification(`¡Atención! No puedes añadir más unidades de "${item.name}". Solo quedan ${item.stock - currentTotalUnits} disponibles.`, 'warning', 3000);
            }
        }
    }
  }, [onIncreaseQuantity, showNotification]);

  const handleDecrease = useCallback((item) => {
    // Pass item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, and item.combinedEmpanadaFlavors to identify unique cart item
    // If quantity is 1 and trying to decrease, remove the product
    if (item.quantity > 1) {
      onDecreaseQuantity(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors);
    } else {
      onRemoveItem(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors);
    }
  }, [onDecreaseQuantity, onRemoveItem]);

  const handleRemove = useCallback((id, sauceId = null, flavorId = null, sizeId = null, combinedPizzaId = null, quantityType = null, combinedEmpanadaFlavors = {}) => {
    onRemoveItem(id, sauceId, flavorId, sizeId, combinedPizzaId, quantityType, combinedEmpanadaFlavors);
  }, [onRemoveItem]);

  const handleClear = useCallback(() => {
    showNotification("Para vaciar el carrito, por favor, confirma la acción.", "info", 3000);
    onClearCart(); // For immediate action as per original logic, but consider a modal.
  }, [onClearCart, showNotification]);

  const handlePlaceOrderClick = useCallback(() => {
    console.log("ShoppingCartModal: Botón 'Realizar Pedido' presionado. Llamando a onViewSummary (para ir al resumen inicial).");
    if (cartItems.length === 0) {
        showNotification("Tu carrito está vacío. Agrega productos antes de continuar.", "warning", 3000);
        return;
    }
    if (onViewSummary) {
      onViewSummary(cartItems); // Pass cartItems to onViewSummary
    } else {
      console.warn("ShoppingCartModal: La función onViewSummary no está definida.");
      showNotification("Error interno: La función para ver el resumen del pedido no está disponible.", "error", 4000);
    }
  }, [onViewSummary, showNotification, cartItems]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      {/* Contenedor principal del modal: Ancho máximo adaptable y altura máxima */}
      <div id="shopping-cart-modal-content" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-xl sm:max-w-2xl lg:max-w-3xl transform scale-95 animate-scale-in max-h-[90vh] flex flex-col">
        {/* Encabezado del carrito */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <ShoppingCart size={32} className="text-red-600" /> Tu Carrito
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar carrito"
          >
            <XCircle size={28} />
          </button>
        </div>

        {/* Contenido del carrito (vacío o con ítems) */}
        {cartItems.length === 0 ? (
          <div className="text-center py-10 flex-grow flex flex-col items-center justify-center">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">Tu carrito está vacío. ¡Añade algunos productos!</p>
            <button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl text-lg shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
              aria-label="Ir de compras"
            >
              Ir de compras
            </button>
          </div>
        ) : (
          <>
            {/* Lista de ítems del carrito: adaptable con flex-wrap y espaciado */}
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {cartItems.map((item) => {
                let itemBasePrice = item.precio || 0;

                // Si es empanada/canastita, el precio base depende del tipo de cantidad
                if (['Empanadas y Canastitas'].includes(item.category) && item.selectedQuantityType) {
                  if (item.selectedQuantityType === 'docena') {
                    itemBasePrice = item.precioDocena || (item.precio * 12);
                  } else if (item.selectedQuantityType === 'mediaDocena') {
                    itemBasePrice = item.precioMediaDocena || (item.precio * 6);
                  } else { // 'unidad'
                    itemBasePrice = item.precio || 0;
                  }
                } else if (item.category === 'Pizzas' && item.selectedCombinedPizza) {
                  // Si es una pizza combinada, toma el precio más alto
                  itemBasePrice = Math.max(item.precio || 0, item.selectedCombinedPizza.precio || 0);
                }

                const itemPrice = itemBasePrice + (item.selectedSauce?.price || 0) + (item.selectedFlavor?.price || 0) + (item.selectedSize?.price || 0);
                const itemSubtotal = Math.floor(itemPrice * item.quantity);
                return (
                  // Añadido item.selectedCombinedPizza?.id, item.selectedQuantityType y combinedEmpanadaFlavors a la key para unicidad
                  <div key={item.id + (item.selectedSauce?.id || '') + (item.selectedFlavor?.id || '') + (item.selectedSize?.id || '') + (item.selectedCombinedPizza?.id || '') + (item.selectedQuantityType || '') + JSON.stringify(item.combinedEmpanadaFlavors || {})} className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                    {/* Contenido del ítem: imagen y detalles */}
                    <div className="flex items-center flex-grow w-full sm:w-auto mb-4 sm:mb-0">
                      <img
                        src={item.image || item.imageUrl || "https://placehold.co/60x60/cccccc/ffffff?text=No+Img"}
                        alt={item.name}
                        className="w-16 h-16 rounded-lg object-cover mr-4 shadow-sm flex-shrink-0"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = "https://placehold.co/60x60/cccccc/ffffff?text=No+Img";
                          console.error(`ERROR DE CARGA DE IMAGEN: No se pudo cargar la imagen para "${item.name}". URL original: ${item.image || item.imageUrl || 'No proporcionada'}.`);
                          showNotification(`No se pudo cargar la imagen para "${item.name}".`, "error", 3000);
                        }}
                      />

                      <div className="flex-1 min-w-0"> {/* min-w-0 es crucial para que el contenido se encoja */}
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg"> {/* Eliminado 'truncate' aquí para permitir que se envuelva */}
                          {item.name}
                          {item.selectedCombinedPizza && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 block sm:inline-block sm:ml-2">
                              (Mitad {item.name} + Mitad {item.selectedCombinedPizza.name})
                            </span>
                          )}
                          {['Empanadas y Canastitas'].includes(item.category) && item.selectedQuantityType && (
                            <span className="text-sm text-gray-500 dark:text-gray-400 block sm:inline-block sm:ml-2">
                              ({item.selectedQuantityType === 'docena' ? 'Docena' : item.selectedQuantityType === 'mediaDocena' ? 'Media Docena' : 'Unidad'})
                            </span>
                          )}
                        </h3>
                        {item.combinedEmpanadaFlavors && Object.keys(item.combinedEmpanadaFlavors).length > 0 && (
                            <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                <p className="font-medium">Sabores:</p>
                                <ul className="list-disc list-inside ml-2">
                                    {Object.keys(item.combinedEmpanadaFlavors).map(flavorId => {
                                        // Aquí necesitarías tener acceso al nombre del producto individual por su ID
                                        // Para simplificar, asumiremos que el nombre del producto individual está disponible en item.allProducts (si lo pasas)
                                        // O que puedes buscarlo en tu lista global de productos.
                                        // Por ahora, mostraré el ID y la cantidad.
                                        // Si necesitas el nombre real, el item de carrito debería contenerlo o el modal debería tener acceso a `allProducts`
                                        const individualFlavorProduct = item.allProducts?.find(p => p.id === flavorId); // Asumiendo que item.allProducts se pasa
                                        return (
                                            <li key={flavorId}>
                                                {individualFlavorProduct ? individualFlavorProduct.name : `ID: ${flavorId}`} x{item.combinedEmpanadaFlavors[flavorId]}
                                            </li>
                                        );
                                    })}
                                </ul>
                            </div>
                        )}
                        <p className="text-gray-600 dark:text-gray-300 text-sm">
                          Precio base: ${Math.floor(item.precio)}
                        </p>
                        {item.selectedFlavor && ( // Mostrar sabor si existe
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            Sabor: {item.selectedFlavor.name}
                          </p>
                        )}
                        {item.selectedSauce && ( // Muestra la salsa si existe
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            Salsa: {item.selectedSauce.name} {item.selectedSauce.isFree ? '(Gratis)' : `(+$${Math.floor(item.selectedSauce.price)})`}
                          </p>
                        )}
                        {item.selectedSize && ( // Muestra el tamaño si existe
                          <p className="text-gray-600 dark:text-gray-300 text-sm">
                            Tamaño: {item.selectedSize.name} {item.selectedSize.price > 0 ? `(+$${Math.floor(item.selectedSize.price)})` : ''}
                          </p>
                        )}
                        <p className="text-gray-700 dark:text-gray-200 font-bold text-md mt-1">
                          Subtotal: ${itemSubtotal}
                        </p>
                        {item.stock <= 0 ? (
                          <p className="text-red-500 text-xs font-bold mt-1">¡Agotado!</p>
                        ) : (
                          item.quantity > item.stock && ( // Esto es para el stock del "paquete" (media docena/docena)
                            <p className="text-red-500 text-xs font-bold mt-1">Solo quedan {item.stock} paquetes.</p>
                          )
                        )}
                      </div>
                    </div>
                    {/* Controles de cantidad y botón de eliminar: adaptable para móviles */}
                    <div className="flex items-center space-x-2 w-full sm:w-auto justify-end sm:justify-start mt-4 sm:mt-0"> {/* Ajuste de margen y justificación */}
                      <button
                        onClick={() => handleDecrease(item)}
                        className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                        aria-label={`Disminuir cantidad de ${item.name}`}
                      >
                        <Minus size={20} />
                      </button>
                      <span className="font-bold text-lg text-gray-900 dark:text-gray-100 w-8 text-center">{item.quantity}</span>
                      <button
                        onClick={() => handleIncrease(item)}
                        className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2
                          ${item.quantity >= item.stock // Validar contra el stock del "paquete"
                            ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed focus:ring-gray-300'
                            : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-300'}`}
                        aria-label={`Aumentar cantidad de ${item.name}`}
                        disabled={item.quantity >= item.stock}
                      >
                        <Plus size={20} />
                      </button>
                      <button
                        onClick={() => handleRemove(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors)}
                        className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-600 dark:text-red-200 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 ml-4"
                        aria-label={`Eliminar ${item.name} del carrito`}
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pie de página del carrito: Total y botones de acción */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex justify-between items-center text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                <span>Total:</span>
                <span>${total}</span>
              </div>

              {/* Botones de acción: Flex-col en móvil, flex-row en sm y superiores */}
              <div className="mt-8 flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4">
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
                  aria-label="Seguir Comprando"
                >
                  <ShoppingBag size={20} /> Seguir Comprando
                </button>

                <button
                  onClick={handleClear}
                  disabled={cartItems.length === 0}
                  className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Vaciar Carrito"
                >
                  Vaciar Carrito
                </button>

                <button
                  onClick={handlePlaceOrderClick}
                  disabled={cartItems.length === 0}
                  className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Realizar Pedido"
                >
                  <FileText size={20} /> Realizar Pedido
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default ShoppingCartModal;
