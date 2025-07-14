import { useState, useCallback, useEffect } from 'react';
import { collection, addDoc, doc, updateDoc, writeBatch, onSnapshot, query, where, serverTimestamp } from 'firebase/firestore';

/**
 * Hook personalizado para gestionar el flujo de pedidos (modales de carrito, resumen, formulario)
 * y el envío del pedido a Firestore y WhatsApp.
 */
export const useOrderFlow = (
  db,
  appId,
  userId,
  cartItems,
  handleClearCart,
  showNotification,
  navigate,
  localProjectId
) => {
  const [isCartModalOpen, setIsCartModalOpen] = useState(false);
  const [isOrderFormModalOpen, setIsOrderFormModalOpen] = useState(false);
  const [isOrderSummaryModalOpen, setIsOrderSummaryModalOpen] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [existingOrdersCount, setExistingOrdersCount] = useState(0);

  const actualAppIdForFirestore =
    typeof __app_id !== 'undefined' && __app_id !== 'default-app-id'
      ? __app_id
      : localProjectId;

  // Efecto para cargar el conteo de pedidos activos
  useEffect(() => {
    if (!db) return;
    const ordersCollectionRef = collection(
      db,
      `artifacts/${actualAppIdForFirestore}/public/data/orders`
    );
    const q = query(
      ordersCollectionRef,
      where('status', 'in', ['pending', 'processing'])
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        setExistingOrdersCount(snapshot.docs.length);
      },
      (err) => {
        console.error("Error al cargar el conteo de pedidos activos desde Firestore:", err);
        showNotification("Error al obtener conteo de pedidos activos.", "warning", 3000);
      }
    );
    return () => unsubscribe();
  }, [db, actualAppIdForFirestore, showNotification]);

  // Manejador para ver el resumen desde el carrito
  const handleViewSummaryFromCart = useCallback((items) => {
    setIsCartModalOpen(false);
    const totalForSummary = items.reduce((sum, item) => {
      // Suma el precio base del producto más el precio de la salsa, el sabor y el TAMAÑO si existen
      const itemPrice = item.precio + (item.selectedSauce?.price || 0) + (item.selectedFlavor?.price || 0) + (item.selectedSize?.price || 0); // AHORA INCLUYE TAMAÑO
      return sum + itemPrice * item.quantity;
    }, 0);
    setCurrentOrder({
      cartItems: items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        precio: item.precio,
        imageUrl: item.image || item.imageUrl,
        selectedSauce: item.selectedSauce || null,
        selectedFlavor: item.selectedFlavor || null,
        selectedSize: item.selectedSize || null, // AHORA INCLUYE TAMAÑO
      })),
      total: totalForSummary,
    });
    setIsOrderSummaryModalOpen(true);
  }, []);

  // Manejador para continuar al formulario de pedido
  const handleContinueToForm = useCallback(() => {
    setIsOrderSummaryModalOpen(false);
    setIsOrderFormModalOpen(true);
  }, []);

  // Manejador para volver al carrito desde el resumen/formulario
  const handleGoBackToCart = useCallback(() => {
    setIsOrderSummaryModalOpen(false);
    setIsOrderFormModalOpen(false);
    setIsCartModalOpen(true);
    setCurrentOrder(null);
  }, []);

  // Manejador principal para enviar el pedido (a Firestore y WhatsApp)
  const handleSendOrder = useCallback(
    async ({
      name,
      address,
      phone,
      paymentMethod,
      cashAmount,
      deliveryMethod,
      orderType,
      orderTime,
      notes,
    }) => {
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

      const finalOrderTime = (orderType === 'immediate' || !orderTime) ? new Date().toISOString() : orderTime;
      
      // CALCULAR EL TOTAL DEL PEDIDO INCLUYENDO SALSAS, SABORES Y TAMAÑOS
      const totalCalculated = cartItems.reduce((sum, item) => {
        const itemPriceWithExtras = item.precio + (item.selectedSauce?.price || 0) + (item.selectedFlavor?.price || 0) + (item.selectedSize?.price || 0); // AHORA INCLUYE TAMAÑO
        return sum + itemPriceWithExtras * item.quantity;
      }, 0);
      const totalForDisplay = Math.floor(totalCalculated); // Redondeo final para mostrar

      let paymentInfoWhatsapp = '';
      let changeAmount = 0;
      let status = 'pending';

      if (paymentMethod === 'cash') {
        const parsedCashAmount = parseFloat(cashAmount);
        if (!isNaN(parsedCashAmount) && parsedCashAmount >= totalForDisplay) {
          changeAmount = Math.floor(parsedCashAmount - totalForDisplay);
        }
        paymentInfoWhatsapp = `*Método de Pago:* Efectivo\n*Abona con:* $${Math.floor(parsedCashAmount || 0)}\n*Vuelto:* $${changeAmount}`;
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
        const now = new Date();
        // Determina el tiempo de preparación base (30 minutos)
        let estimatedMinutes = 30;
        // Si hay más de 3 órdenes pendientes/en preparación, aumenta el tiempo estimado
        if (existingOrdersCount > 3) { // Puedes ajustar este umbral (ej: 3, 5, etc.)
          estimatedMinutes = 40;
        }
        const estimatedDeliveryTime = new Date(now.getTime() + estimatedMinutes * 60 * 1000);
        const formattedEstimatedTime = estimatedDeliveryTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        orderTimeInfoWhatsapp = `*Tipo de Pedido:* Inmediato (Listo aprox. ${formattedEstimatedTime} hs - ${estimatedMinutes} min)`;
      } else if (orderType === 'reserved') {
        const reservedDate = new Date(finalOrderTime);
        const formattedReservedTime = reservedDate.toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        orderTimeInfoWhatsapp = `*Tipo de Pedido:* Reserva para ${formattedReservedTime} hs`;
      }

      // CONSTRUCCIÓN DEL DETALLE DE PRODUCTOS PARA WHATSAPP
      const orderDetailsForWhatsapp = cartItems.map(item => {
        const itemBasePrice = item.precio;
        const saucePrice = item.selectedSauce?.price || 0;
        const flavorPrice = item.selectedFlavor?.price || 0;
        const sizePrice = item.selectedSize?.price || 0; // OBTENER PRECIO DEL TAMAÑO
        const itemTotalPrice = (itemBasePrice + saucePrice + flavorPrice + sizePrice) * item.quantity; // CALCULAR TOTAL CON TAMAÑO

        let detail = `- ${item.quantity}x ${item.name}`;
        if (item.selectedFlavor) {
            detail += ` (Sabor: ${item.selectedFlavor.name})`;
        }
        if (item.selectedSauce) {
          detail += ` (Salsa: ${item.selectedSauce.name}`;
          if (!item.selectedSauce.isFree && item.selectedSauce.price > 0) {
            detail += ` +$${Math.floor(item.selectedSauce.price)}`; // Redondeo aquí también
          }
          detail += `)`;
        }
        if (item.selectedSize) { // NUEVO: Añadir detalle del tamaño
          detail += ` (Tamaño: ${item.selectedSize.name}`;
          if (item.selectedSize.price > 0) {
            detail += ` +$${Math.floor(item.selectedSize.price)}`;
          }
          detail += `)`;
        }
        detail += ` = $${Math.floor(itemTotalPrice)}`; // Redondeo final del subtotal del ítem
        return detail;
      }).join('\n');

      // MENSAJE FINAL DE WHATSAPP
      let whatsappMessage = `
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
${notes ? `\n*Notas del Cliente:* ${notes}` : ''}
¡Gracias por tu pedido!
`.trim();

      const batch = writeBatch(db);
      const ordersCollectionRef = collection(db, `artifacts/${actualAppIdForFirestore}/public/data/orders`);
      const productsCollectionRef = collection(db, `artifacts/${actualAppIdForFirestore}/public/data/products`);

      try {
        for (const item of cartItems) {
          if (item.id) {
            const productDocRef = doc(productsCollectionRef, item.id);
            if (item.stock >= item.quantity) {
              batch.update(productDocRef, {
                stock: item.stock - item.quantity
              });
            } else {
              showNotification(`Advertencia: Stock insuficiente para ${item.name}.`, 'warning', 5000);
            }
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
            selectedSauce: item.selectedSauce || null,
            selectedFlavor: item.selectedFlavor || null,
            selectedSize: item.selectedSize || null, // AHORA INCLUYE TAMAÑO EN EL OBJETO DE LA ORDEN
          })),
          total: totalCalculated,
          customerInfo: { name, address, phone },
          paymentMethod: paymentMethod,
          cashAmount: parseFloat(cashAmount) || 0,
          change: changeAmount,
          deliveryMethod: deliveryMethod,
          orderType: orderType,
          orderTime: finalOrderTime,
          notes: notes,
          createdAt: serverTimestamp(),
          status: status,
          appId: actualAppIdForFirestore,
        };

        batch.set(orderDocRef, newOrder);
        await batch.commit();

        setCurrentOrder({ id: orderDocRef.id, ...newOrder });
        setIsOrderFormModalOpen(false);
        setIsOrderSummaryModalOpen(true);
        showNotification('Pedido guardado y stock actualizado. ¡Enviando a WhatsApp!', 'success', 3000);

      } catch (firebaseError) {
        let userErrorMessage = 'Error al procesar el pedido. Por favor, inténtalo de nuevo.';
        if (firebaseError.code === 'permission-denied') {
          userErrorMessage = 'Error: Permisos insuficientes para guardar el pedido. Revisa las reglas de seguridad de Firestore.';
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

      // ENVIAR MENSAJE A WHATSAPP
      const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER; // Asegúrate de que esta variable de entorno esté configurada
      if (!whatsappNumber) {
        showNotification('Número de WhatsApp no configurado. Por favor, contacta al administrador.', 'error', 5000);
        console.error('VITE_WHATSAPP_NUMBER no está definido en las variables de entorno.');
        return;
      }
      const encodedMessage = encodeURIComponent(whatsappMessage);
      const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');
      
      handleClearCart(); // Limpiar el carrito después de enviar el pedido
    },
    [cartItems, showNotification, db, userId, handleClearCart, localProjectId, actualAppIdForFirestore, existingOrdersCount] // Añadido existingOrdersCount a las dependencias
  );

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
