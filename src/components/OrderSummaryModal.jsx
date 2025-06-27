import React, { useMemo } from 'react';
import { XCircle, CheckCircle, ArrowLeft, Send } from 'lucide-react'; // Send para "Continuar al formulario"

function OrderSummaryModal({ order, onClose, onBack, onContinue, showNotification }) {
  const itemsInOrder = order?.cartItems || []; 
  const hasCustomerInfo = !!order?.customerInfo; 

  const total = useMemo(() => {
    return Math.floor(itemsInOrder.reduce((sum, item) => sum + item.precio * item.quantity, 0));
  }, [itemsInOrder]);

  if (!order) {
    console.error("OrderSummaryModal: El objeto 'order' es inválido.");
    showNotification("No se pudo cargar el resumen del pedido. Por favor, inténtalo de nuevo.", "error", 4000); 
    return null; 
  }

  const { customerInfo = {}, paymentMethod, cashAmount, change, deliveryMethod } = order; // <-- Añadido deliveryMethod

  const deliveryMethodText = useMemo(() => {
    if (deliveryMethod === 'pickup') {
      return 'Retiro en el local (Calle 881 N° 5003, Villa la Florida)';
    } else if (deliveryMethod === 'delivery') {
      return 'Delivery a domicilio (sin cargo)';
    }
    return 'No especificado';
  }, [deliveryMethod]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-xl sm:max-w-2xl lg:max-w-3xl max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        {/* Encabezado */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <CheckCircle size={32} className={hasCustomerInfo ? "text-green-600" : "text-blue-600"} /> 
            {hasCustomerInfo ? '¡Pedido Realizado!' : 'Resumen de tu Carrito'}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar resumen"
          >
            <XCircle size={28} />
          </button>
        </div>

        {/* Detalles del pedido */}
        <div className="space-y-6 mb-8 text-gray-800 dark:text-gray-200">
          <h3 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-700 pb-2">Detalle de tu Compra:</h3>
          <ul className="space-y-3">
            {itemsInOrder.length > 0 ? (
              itemsInOrder.map((item, index) => (
                <li key={item.id || index} className="flex justify-between items-center bg-gray-50 dark:bg-gray-700 p-3 rounded-lg shadow-sm">
                  <div className="flex items-center">
                    <img
                      src={item.imageUrl || item.image || "https://placehold.co/40x40/cccccc/ffffff?text=No+Img"}
                      alt={item.name}
                      className="w-10 h-10 rounded-md object-cover mr-3"
                      onError={(e) => e.target.src = "https://placehold.co/40x40/cccccc/ffffff?text=No+Img"}
                    />
                    <span className="font-medium">{item.quantity}x {item.name}</span>
                  </div>
                  <span className="font-semibold">${Math.floor(item.precio * item.quantity)}</span>
                </li>
              ))
            ) : (
              <p className="text-gray-600 dark:text-gray-400 text-center">No hay productos en el resumen.</p>
            )}
          </ul>
          <div className="flex justify-between items-center text-2xl font-bold mt-4 border-t border-gray-300 dark:border-gray-600 pt-4">
            <span>Total:</span>
            <span>${total}</span>
          </div>

          {/* Sección de Datos de Contacto y Pago (solo visible en el resumen FINAL) */}
          {hasCustomerInfo && (
            <>
              <h3 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mt-6">Tus Datos:</h3>
              <p><strong>Nombre:</strong> {customerInfo.name}</p>
              <p><strong>Teléfono:</strong> {customerInfo.phone}</p>
              {/* NUEVO: Mostrar el método de envío y la dirección si aplica */}
              <p><strong>Método de Envío:</strong> {deliveryMethodText}</p>
              {deliveryMethod === 'delivery' && (
                <p><strong>Dirección:</strong> {customerInfo.address}</p>
              )}


              <h3 className="text-xl font-semibold border-b border-gray-200 dark:border-gray-700 pb-2 mt-6">Forma de Pago:</h3>
              <p><strong>Método:</strong> {paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'}</p>
              {paymentMethod === 'cash' && (
                <>
                  <p><strong>Abonaste con:</strong> ${Math.floor(cashAmount)}</p>
                  <p className="font-bold text-green-700 dark:text-green-300"><strong>Tu Vuelto:</strong> ${Math.floor(change)}</p>
                </>
              )}
              {paymentMethod === 'mercadopago' && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  *Recuerda que se requerirá comprobante de pago al recibir tu pedido.
                </p>
              )}
            </>
          )}
        </div>

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
            className="w-full sm:w-auto bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
            aria-label={hasCustomerInfo ? "Volver al inicio" : "Continuar al formulario"}
          >
            {hasCustomerInfo ? (<>¡Entendido!</>) : (<><Send size={20} /> Continuar al formulario</>)}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OrderSummaryModal;
