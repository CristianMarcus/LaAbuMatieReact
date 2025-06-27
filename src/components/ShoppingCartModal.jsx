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
    return Math.floor(cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0));
  }, [cartItems]);

  const handleIncrease = useCallback((item) => {
    if (item.quantity < item.stock) {
      onIncreaseQuantity(item.id);
    } else {
      if (showNotification) {
        showNotification(`¡Atención! No puedes añadir más unidades de "${item.name}". Solo quedan ${item.stock} disponibles.`, 'warning', 3000);
      }
    }
  }, [onIncreaseQuantity, showNotification]);

  const handleDecrease = useCallback((item) => {
    // Si la cantidad es 1 y se intenta disminuir, se elimina el producto
    if (item.quantity > 1) {
      onDecreaseQuantity(item.id);
    } else {
      onRemoveItem(item.id); // Elimina el producto si la cantidad llega a 0
    }
  }, [onDecreaseQuantity, onRemoveItem]);

  const handleRemove = useCallback((id) => {
    onRemoveItem(id);
  }, [onRemoveItem]);

  const handleClear = useCallback(() => {
    // Confirmación antes de vaciar el carrito
    if (window.confirm("¿Estás seguro de que quieres vaciar el carrito?")) {
        onClearCart();
    }
  }, [onClearCart]);

  const handlePlaceOrderClick = useCallback(() => {
    console.log("ShoppingCartModal: Botón 'Realizar Pedido' presionado. Llamando a onViewSummary (para ir al resumen inicial).");
    if (cartItems.length === 0) {
        showNotification("Tu carrito está vacío. Agrega productos antes de continuar.", "warning", 3000);
        return;
    }
    if (onViewSummary) {
      onViewSummary(); 
    } else {
      console.warn("ShoppingCartModal: La función onViewSummary no está definida.");
      showNotification("Error interno: La función para ver el resumen del pedido no está disponible.", "error", 4000);
    }
  }, [onViewSummary, showNotification, cartItems.length]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div id="shopping-cart-modal-content" className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-xl sm:max-w-2xl lg:max-w-3xl transform scale-95 animate-scale-in max-h-[90vh] flex flex-col">
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
            <div className="flex-grow overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
                  <div className="flex items-center flex-grow">
                    {/* --- INICIO DE LA SECCIÓN CLAVE PARA DEPURAR IMÁGENES --- */}
                    {/* Este console.log te mostrará la URL que se está intentando cargar */}
                    {console.log(`DEBUG IMAGEN: Intentando cargar imagen para "${item.name}". URL:`, item.image || item.imageUrl || "Placeholder (no URL) - https://placehold.co/60x60/cccccc/ffffff?text=No+Img")}
                    <img
                      src={item.image || item.imageUrl || "https://placehold.co/60x60/cccccc/ffffff?text=No+Img"} 
                      alt={item.name}
                      className="w-16 h-16 rounded-lg object-cover mr-4 shadow-sm"
                      onError={(e) => {
                        e.target.onerror = null; // Evita bucles infinitos si el fallback también falla
                        e.target.src = "https://placehold.co/60x60/cccccc/ffffff?text=No+Img"; // URL de imagen de placeholder
                        console.error(`ERROR DE CARGA DE IMAGEN: No se pudo cargar la imagen para "${item.name}". URL original: ${item.image || item.imageUrl || 'No proporcionada'}.`);
                        showNotification(`No se pudo cargar la imagen para "${item.name}".`, "error", 3000);
                      }}
                    />
                    {/* --- FIN DE LA SECCIÓN CLAVE PARA DEPURAR IMÁGENES --- */}

                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg truncate">{item.name}</h3>
                      <p className="text-gray-600 dark:text-gray-300 text-sm">
                        ${Math.floor(item.precio)} c/u
                      </p>
                      {item.stock <= 0 ? (
                        <p className="text-red-500 text-xs font-bold mt-1">¡Agotado!</p>
                      ) : (
                        item.quantity > item.stock && (
                          <p className="text-red-500 text-xs font-bold mt-1">Solo quedan {item.stock} unidades.</p>
                        )
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0 ml-4">
                    <button
                      onClick={() => handleDecrease(item)}
                      className="p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300"
                      aria-label={`Disminuir cantidad de ${item.name}`}
                    >
                      <Minus size={20} /> {/* Aumentado tamaño para mejor tactilidad */}
                    </button>
                    <span className="font-bold text-lg text-gray-900 dark:text-gray-100 w-8 text-center">{item.quantity}</span>
                    <button
                      onClick={() => handleIncrease(item)}
                      className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 
                        ${item.quantity >= item.stock
                          ? 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500 cursor-not-allowed focus:ring-gray-300'
                          : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-300'}`}
                      aria-label={`Aumentar cantidad de ${item.name}`}
                      disabled={item.quantity >= item.stock}
                    >
                      <Plus size={20} /> {/* Aumentado tamaño para mejor tactilidad */}
                    </button>
                  </div>
                  <button
                    onClick={() => handleRemove(item.id)}
                    className="p-2 bg-red-100 hover:bg-red-200 dark:bg-red-800 dark:hover:bg-red-700 text-red-600 dark:text-red-200 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-red-300 ml-4"
                    aria-label={`Eliminar ${item.name} del carrito`}
                  >
                    <Trash2 size={20} /> {/* Aumentado tamaño para mejor tactilidad */}
                  </button>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
              <div className="flex justify-between items-center text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                <span>Total:</span>
                <span>${total}</span>
              </div>

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
