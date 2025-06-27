import { useState, useCallback, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, writeBatch, onSnapshot, query, where } from 'firebase/firestore';

/**
 * Hook personalizado para gestionar el flujo de pedidos (modales de carrito, resumen, formulario)
 * y el envío del pedido a Firestore y WhatsApp.
 *
 * @param {Object} db - Instancia de Firestore.
 * @param {string} appId - ID de la aplicación (para la ruta de Firestore).
 * @param {string|null} userId - ID del usuario actual.
 * @param {Array} cartItems - Array de ítems en el carrito (desde useCart).
 * @param {Function} handleClearCart - Función para vaciar el carrito (desde useCart).
 * @param {Function} showNotification - Función para mostrar notificaciones.
 * @param {Function} navigate - Función de navegación de React Router.
 * @param {string} localProjectId - El projectId de la configuración local de Firebase.
 * @returns {Object} Un objeto que contiene:
 * - {boolean} isCartModalOpen: Estado de visibilidad del modal del carrito.
 * - {Function} setIsCartModalOpen: Setter para el modal del carrito.
 * - {boolean} isOrderFormModalOpen: Estado de visibilidad del modal del formulario de pedido.
 * - {Function} setIsOrderFormModalOpen: Setter para el modal del formulario.
 * - {boolean} isOrderSummaryModalOpen: Estado de visibilidad del modal de resumen del pedido.
 * - {Function} setIsOrderSummaryModalOpen: Setter para el modal de resumen.
 * - {Object|null} currentOrder: Objeto del pedido actual en proceso.
 * - {Function} setCurrentOrder: Setter para el pedido actual.
 * - {Function} handleViewSummaryFromCart: Inicia el flujo de pedido desde el carrito.
 * - {Function} handleContinueToForm: Pasa del resumen al formulario.
 * - {Function} handleGoBackToCart: Vuelve al carrito desde el resumen/formulario.
 * - {Function} handleSendOrder: Envía el pedido.
 * - {number} existingOrdersCount: Conteo de pedidos activos.
 */
export const useOrderFlow = (db, appId, userId, cartItems, handleClearCart, showNotification, navigate, localProjectId) => {
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isOrderFormModalOpen, setIsOrderFormModalOpen] = useState(false);
  const [isOrderSummaryModalOpen, setIsOrderSummaryModalOpen] = useState(false); 
  const [currentOrder, setCurrentOrder] = useState(null); 
  const [existingOrdersCount, setExistingOrdersCount] = useState(0);

  // Efecto para contar pedidos activos (Pendiente o En preparación)
  useEffect(() => {
    if (!db) { 
        return;
    }
    const actualAppIdForFirestore = (typeof __app_id !== 'undefined' && __app_id !== 'default-app-id') ? __app_id : localProjectId;
    const ordersCollectionRef = collection(db, `artifacts/${actualAppIdForFirestore}/public/data/orders`);
    
    const q = query(
        ordersCollectionRef,
        where('status', 'in', ['Pendiente', 'En preparación']) 
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
        setExistingOrdersCount(snapshot.docs.length);
        console.log(`Firestore: Cantidad actual de pedidos activos: ${snapshot.docs.length}`);
    }, (err) => {
        console.error("Error al cargar el conteo de pedidos activos desde Firestore:", err);
        showNotification("Error al obtener conteo de pedidos activos.", "warning", 3000);
    });

    return () => unsubscribe();
  }, [db, appId, showNotification, localProjectId]);


  // 1. Del Carrito al Resumen INICIAL (productos y total del carrito)
  const handleViewSummaryFromCart = useCallback(() => {
    console.log("useOrderFlow: Llamado a handleViewSummaryFromCart. Preparando OrderSummaryModal con datos del carrito.");
    setIsCartModalOpen(false); // Cierra el carrito
    
    // Prepara el objeto de pedido para el resumen INICIAL
    const totalForSummary = cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0);
    setCurrentOrder({ 
      cartItems: cartItems.map(item => ({ 
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        precio: item.precio,
        imageUrl: item.image || item.imageUrl, 
      })),
      total: totalForSummary,
    });
    
    setIsOrderSummaryModalOpen(true); // Abre el resumen del pedido
  }, [cartItems]); 

  // 2. Del Resumen INICIAL al Formulario de Pedido
  const handleContinueToForm = useCallback(() => {
    console.log("useOrderFlow: Llamado a handleContinueToForm. Abriendo OrderFormModal.");
    setIsOrderSummaryModalOpen(false); // Cierra el resumen inicial
    setIsOrderFormModalOpen(true); // Abre el formulario
  }, []);

  // 3. Para volver al Carrito desde el Resumen INICIAL o el Formulario
  const handleGoBackToCart = useCallback(() => {
    console.log("useOrderFlow: Llamado a handleGoBackToCart. Volviendo al carrito.");
    setIsOrderSummaryModalOpen(false); // Cierra resumen si está abierto
    setIsOrderFormModalOpen(false); // Cierra formulario si está abierto
    setIsCartModalOpen(true); // Abre el carrito
    setCurrentOrder(null); // Limpia el pedido actual si se vuelve tan atrás
  }, []);

  // Función para enviar el pedido a Firestore y WhatsApp
  const handleSendOrder = useCallback(async ({ name, address, phone, paymentMethod, cashAmount, deliveryMethod, orderType, orderTime }) => { 
    if (!db) {
      showNotification('Error: Base de datos no disponible para guardar el pedido. Intenta recargar la página.', 'error', 5000);
      return;
    }
    if (!userId) {
        showNotification('Error: ID de usuario no disponible. Asegúrate de que la autenticación se ha completado.', 'error', 5000);
        return;
    }
    if (cartItems.length === 0) {
        showNotification('El carrito está vacío. Agrega productos antes de hacer un pedido.', 'error', 3000);
        return;
    }

    const orderDetailsForWhatsapp = cartItems.map(item =>
      `${item.quantity}x ${item.name} ($${Math.floor(item.precio)} c/u)`
    ).join('\n');

    const totalCalculated = cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0);
    const totalForDisplay = Math.floor(totalCalculated);

    let paymentInfoWhatsapp = '';
    let status = 'Pendiente'; // Estado inicial del pedido en Firebase

    if (paymentMethod === 'cash') {
      const parsedCashAmount = parseFloat(cashAmount);
      const change = (parsedCashAmount >= totalForDisplay) ? Math.floor(parsedCashAmount - totalForDisplay) : 0;
      paymentInfoWhatsapp = `*Método de Pago:* Efectivo\n*Abona con:* $${Math.floor(parsedCashAmount)}\n*Vuelto:* $${change}`;
    } else if (paymentMethod === 'mercadopago') {
      paymentInfoWhatsapp = `*Método de Pago:* Mercado Pago\n*Alias:* laabuelamatie\n(Requiere comprobante de pago)`;
    }

    let deliveryInfoWhatsapp = '';
    if (deliveryMethod === 'pickup') {
      deliveryInfoWhatsapp = '*Método de Envío:* Retiro en el local (Calle 881 N° 5003, Villa la Florida)';
    } else if (deliveryMethod === 'delivery') {
      deliveryInfoWhatsapp = '*Método de Envío:* Delivery a domicilio (sin cargo)';
    }

    let orderTimeInfoWhatsapp = '';
    if (orderType === 'immediate') {
        orderTimeInfoWhatsapp = `*Tipo de Pedido:* Inmediato (Estimado: ${orderTime})`; 
    } else if (orderType === 'reserved') {
        const reservedDate = new Date(orderTime);
        const formattedReservedTime = reservedDate.toLocaleDateString('es-AR', {
            day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        orderTimeInfoWhatsapp = `*Tipo de Pedido:* Reserva para ${formattedReservedTime} hs`;
    }


    const whatsappMessage = `
*--- LA ABU MATIE APP ---*

*Datos del Cliente:*
Nombre: ${name}
Teléfono: ${phone}
${deliveryMethod === 'delivery' ? `Dirección: ${address}` : ''}

*${deliveryInfoWhatsapp}*
*${orderTimeInfoWhatsapp}*

*Detalle del Pedido:*
${orderDetailsForWhatsapp}

*Total a Pagar:* $${totalForDisplay}

${paymentInfoWhatsapp}

¡Gracias por tu pedido!
`.trim();

    const batch = writeBatch(db);
    const actualAppIdForFirestore = (typeof __app_id !== 'undefined' && __app_id !== 'default-app-id') ? __app_id : localProjectId;
    const productsCollectionRef = collection(db, `artifacts/${actualAppIdForFirestore}/public/data/products`);
    const ordersCollectionRef = collection(db, `artifacts/${actualAppIdForFirestore}/public/data/orders`);

    try {
      for (const item of cartItems) {
        if (item.id) {
          const productDocRef = doc(productsCollectionRef, item.id);
          batch.update(productDocRef, {
            stock: item.stock - item.quantity 
          });
        }
      }

      const orderDocRef = doc(ordersCollectionRef); 
      const newOrder = { 
        userId: userId || 'anonimo',
        cartItems: cartItems.map(item => ({
          id: item.id,
          name: item.name,
          quantity: item.quantity,
          precio: item.precio,
          imageUrl: item.image || item.imageUrl, 
        })),
        total: totalCalculated,
        customerInfo: { name, address, phone }, 
        paymentMethod: paymentMethod,
        cashAmount: parseFloat(cashAmount) || 0,
        change: Math.floor(parseFloat(cashAmount) - totalCalculated),
        deliveryMethod: deliveryMethod, 
        orderType: orderType,      
        orderTime: orderTime,      
        createdAt: new Date().toISOString(),
        status: status, // Siempre 'Pendiente' al crear
      };
      batch.set(orderDocRef, newOrder);

      await batch.commit();

      setCurrentOrder({ id: orderDocRef.id, ...newOrder }); 
      setIsOrderFormModalOpen(false); // Cierra el formulario
      setIsOrderSummaryModalOpen(true); // Abre el modal de resumen FINAL
      showNotification('Pedido guardado y stock actualizado. ¡Enviando a WhatsApp!', 'success', 3000);

    } catch (firebaseError) {
      let userErrorMessage = 'Error al procesar el pedido. Por favor, inténtalo de nuevo.';
      console.error("Error al commitear lote (guardar pedido/actualizar stock):", firebaseError);

      if (firebaseError.code === 'permission-denied') {
          userErrorMessage = 'Error: Permisos insuficientes para guardar el pedido o actualizar stock. Revisa las reglas de seguridad de Firestore.'; 
      } else if (firebaseError.code === 'unavailable' || firebaseError.code === 'internal') {
          userErrorMessage = 'Error de conexión con la base de datos. Revisa tu conexión e inténtalo de nuevo.';
      } else if (firebaseError.code === 'resource-exhausted') { 
          userErrorMessage = 'Error: Límite de cuota excedido. Por favor, inténtalo de nuevo más tarde.';
      } else if (firebaseError.code === 'not-found') {
          userErrorMessage = 'Error: Algunos productos no se encontraron en la base de datos al actualizar el stock. El pedido no se procesó.';
      } else {
        userErrorMessage = `Error desconocido al procesar el pedido: ${firebaseError.message}`;
      }
      showNotification(userErrorMessage, 'error', 7000); 
      return; 
    }

    // Usa la variable de entorno para el número de WhatsApp
    const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER; 
    const encodedMessage = encodeURIComponent(whatsappMessage);

    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;

    window.open(whatsappUrl, '_blank');

    handleClearCart(); // Vaciar el carrito DESPUÉS de enviar el pedido
  }, [cartItems, showNotification, db, userId, handleClearCart, localProjectId]);

  return {
    isCartModalOpen,
    setIsCartModalOpen,
    isOrderFormModalOpen,
    setIsOrderFormModalOpen,
    isOrderSummaryModalOpen,
    setIsOrderSummaryModalOpen,
    currentOrder,
    setCurrentOrder,
    handleViewSummaryFromCart,
    handleContinueToForm,
    handleGoBackToCart,
    handleSendOrder,
    existingOrdersCount,
  };
};
