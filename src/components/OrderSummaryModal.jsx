// src/components/OrderSummaryModal.jsx
import React, { useMemo } from 'react';
import { XCircle, CheckCircle, ArrowLeft, Send } from 'lucide-react'; // Send para "Continuar al formulario"

function OrderSummaryModal({ order, onClose, onBack, onContinue, showNotification }) {
  const itemsInOrder = order?.cartItems || [];
  const hasCustomerInfo = !!order?.customerInfo;

  const total = useMemo(() => {
    return Math.floor(itemsInOrder.reduce((sum, item) => {
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
  }, [itemsInOrder]);

  if (!order) {
    console.error("OrderSummaryModal: El objeto 'order' es inválido.");
    showNotification("No se pudo cargar el resumen del pedido. Por favor, inténtalo de nuevo.", "error", 4000);
    return null;
  }

  const { customerInfo = {}, paymentMethod, cashAmount, change, deliveryMethod } = order;

  const deliveryMethodText = useMemo(() => {
    if (deliveryMethod === 'pickup') {
      return 'Retiro en el local (Calle 881 N° 5003, Villa la Florida)';
    } else if (deliveryMethod === 'delivery') {
      return 'Delivery a domicilio (sin cargo)';
    }
    return 'No especificado';
  }, [deliveryMethod]);

  // Formatear la hora del pedido para mostrar en el resumen
  const formattedOrderTime = useMemo(() => {
    if (customerInfo.orderTime) {
      const date = new Date(customerInfo.orderTime);
      if (customerInfo.orderType === 'immediate') {
        return `Inmediato (Listo aprox. ${date.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })} hs)`;
      } else if (customerInfo.orderType === 'reserved') {
        return `Reservado para las ${date.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })} hs`;
      }
    }
    return 'No especificado';
  }, [customerInfo.orderTime, customerInfo.orderType]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50 animate-fade-in custom-scrollbar overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl p-6 sm:p-8 w-full max-w-2xl transform animate-slide-in-up relative my-8 overflow-y-auto max-h-[90vh]">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-2"
          aria-label="Cerrar resumen del pedido"
        >
          <XCircle size={24} />
        </button>

        <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
          {hasCustomerInfo ? '¡Pedido Confirmado!' : 'Resumen de tu Pedido'}
        </h2>

        {hasCustomerInfo && (
          <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-800 dark:text-green-200 p-4 rounded-lg mb-6 shadow-inner flex items-center gap-3">
            <CheckCircle size={24} className="flex-shrink-0" />
            <p className="font-semibold">Tu pedido ha sido enviado. ¡Gracias por tu compra!</p>
          </div>
        )}

        {/* Detalles del cliente (si ya se ingresaron) */}
        {hasCustomerInfo && (
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Datos del Cliente</h3>
            <p className="text-gray-700 dark:text-gray-300"><strong>Nombre:</strong> {customerInfo.name}</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>Teléfono:</strong> {customerInfo.phone}</p>
            <p className="text-gray-700 dark:text-gray-300"><strong>Método de Entrega:</strong> {deliveryMethodText}</p>
            {customerInfo.deliveryMethod === 'delivery' && (
              <p className="text-gray-700 dark:text-gray-300"><strong>Dirección:</strong> {customerInfo.address}</p>
            )}
            <p className="text-gray-700 dark:text-gray-300">
              <strong>Tipo de Pedido:</strong>{' '}
              {formattedOrderTime}
            </p>
            <p className="text-gray-700 dark:text-gray-300"><strong>Método de Pago:</strong> {customerInfo.paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'}</p>
            {customerInfo.paymentMethod === 'cash' && customerInfo.cashAmount && (
              <>
                <p className="text-gray-700 dark:text-gray-300"><strong>Paga con:</strong> ${customerInfo.cashAmount}</p>
                <p className="text-gray-700 dark:text-gray-300"><strong>Vuelto:</strong> ${customerInfo.change}</p>
              </>
            )}
            {customerInfo.notes && (
              <p className="text-gray-700 dark:text-gray-300"><strong>Notas:</strong> {customerInfo.notes}</p>
            )}
          </div>
        )}

        {/* Lista de productos en el pedido */}
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-sm border border-gray-100 dark:border-gray-600">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Productos</h3>
          <ul className="space-y-2">
            {itemsInOrder.map((item, index) => {
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

              return (
                // Añadido item.selectedCombinedPizza?.id, item.selectedQuantityType y combinedEmpanadaFlavors a la key para unicidad
                <li key={item.id + (item.selectedSauce?.id || '') + (item.selectedFlavor?.id || '') + (item.selectedSize?.id || '') + (item.selectedCombinedPizza?.id || '') + (item.selectedQuantityType || '') + JSON.stringify(item.combinedEmpanadaFlavors || {}) + index} className="flex justify-between items-center text-gray-700 dark:text-gray-300 flex-wrap">
                  <div className="flex-1 min-w-0">
                    {item.name}
                    {item.selectedCombinedPizza && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 block sm:inline-block sm:ml-2">
                        (Mitad {item.name} + Mitad {item.selectedCombinedPizza.name})
                      </span>
                    )}
                    {['Empanadas y Canastitas'].includes(item.category) && item.selectedQuantityType && (
                      <span className="text-sm text-gray-600 dark:text-gray-400 block sm:inline-block sm:ml-2">
                        ({item.quantity} {item.selectedQuantityType === 'docena' ? 'Docena(s)' : item.selectedQuantityType === 'mediaDocena' ? 'Media(s) Docena(s)' : 'Unidad(es)'})
                      </span>
                    )}
                    {!item.selectedCombinedPizza && !['Empanadas y Canastitas'].includes(item.category) && ` x ${item.quantity}`} {/* Solo muestra "x cantidad" si no es pizza combinada ni empanada/canastita combinada */}
                    {item.selectedFlavor && ( // Muestra el sabor si existe
                      <span className="text-sm text-gray-600 dark:text-gray-400 block sm:inline-block sm:ml-2">
                        (Sabor: {item.selectedFlavor.name})
                      </span>
                    )}
                    {item.selectedSauce && ( // Muestra la salsa si existe
                      <span className="text-sm text-gray-600 dark:text-gray-400 block sm:inline-block sm:ml-2">
                        (Salsa: {item.selectedSauce.name}
                        {!item.selectedSauce.isFree && item.selectedSauce.price > 0 && ` +$${Math.floor(item.selectedSauce.price)}`}
                        )
                      </span>
                    )}
                    {item.selectedSize && ( // Muestra el tamaño si existe
                      <span className="text-sm text-gray-600 dark:text-gray-400 block sm:inline-block sm:ml-2">
                        (Tamaño: {item.selectedSize.name}
                        {item.selectedSize.price > 0 && ` +$${Math.floor(item.selectedSize.price)}`}
                        )
                      </span>
                    )}
                    {item.combinedEmpanadaFlavors && Object.keys(item.combinedEmpanadaFlavors).length > 0 && (
                        <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 w-full">
                            <p className="font-medium">Sabores seleccionados:</p>
                            <ul className="list-disc list-inside ml-2">
                                {Object.keys(item.combinedEmpanadaFlavors).map(flavorId => {
                                    // Utiliza item.allProducts para encontrar el nombre real del sabor
                                    const foundFlavor = item.allProducts?.find(p => p.id === flavorId);
                                    return (
                                        <li key={flavorId}>
                                            {foundFlavor ? foundFlavor.name : `ID: ${flavorId}`} x{item.combinedEmpanadaFlavors[flavorId]}
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}
                  </div>
                  <span className="font-semibold mt-2 sm:mt-0">${Math.floor(itemPrice * item.quantity)}</span>
                </li>
              );
            })}
          </ul>
          <div className="border-t border-gray-200 dark:border-gray-600 pt-3 mt-3 flex justify-between items-center text-xl font-bold text-gray-900 dark:text-gray-100">
            <span>Total:</span>
            <span>${total}</span>
          </div>
        </div>

        {paymentMethod === 'mercadopago' && !hasCustomerInfo && (
          <>
            <p className="text-center text-blue-600 dark:text-blue-400 font-medium mb-4">
              Serás redirigido a Mercado Pago para completar tu pago.
            </p>
            <p className="text-center text-gray-600 dark:text-gray-400">
              *Recuerda que se requerirá comprobante de pago al recibir tu pedido.
            </p>
          </>
        )}

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 mt-8">
          <button
            onClick={onBack}
            className="w-full sm:w-auto bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold py-3 px-6 rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300"
            aria-label="Volver"
          >
            <ArrowLeft size={20} className="inline-block mr-2" /> {hasCustomerInfo ? 'Seguir Comprando' : 'Volver al Carrito'}
          </button>

          <button
            onClick={onContinue}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label="Continuar"
            disabled={itemsInOrder.length === 0}
          >
            {hasCustomerInfo ? 'Cerrar' : 'Continuar al Pedido'} <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryModal;
