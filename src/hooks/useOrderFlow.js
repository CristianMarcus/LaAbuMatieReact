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
  localProjectId,
  allProducts // NUEVO: Necesario para obtener nombres de sabores de empanadas combinadas
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
    }, 0);
    setCurrentOrder({
      cartItems: items.map(item => ({
        id: item.id,
        name: item.name,
        quantity: item.quantity,
        precio: item.precio,
        precioMediaDocena: item.precioMediaDocena || null, // NUEVO
        precioDocena: item.precioDocena || null, // NUEVO
        imageUrl: item.image || item.imageUrl,
        selectedSauce: item.selectedSauce || null,
        selectedFlavor: item.selectedFlavor || null,
        selectedSize: item.selectedSize || null,
        selectedCombinedPizza: item.selectedCombinedPizza || null,
        selectedQuantityType: item.selectedQuantityType || null, // NUEVO
        combinedEmpanadaFlavors: item.combinedEmpanadaFlavors || null, // NUEVO: Pasar los sabores combinados
        category: item.category, // Asegurarse de pasar la categoría
        allProducts: allProducts, // Pasar allProducts para que OrderSummaryModal pueda resolver nombres
      })),
      total: totalForSummary,
    });
    setIsOrderSummaryModalOpen(true);
  }, [allProducts]); // Añadido allProducts a las dependencias

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

      let finalOrderTime;
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
        finalOrderTime = estimatedDeliveryTime.toISOString(); // Guardar como ISO string
        const formattedEstimatedTime = estimatedDeliveryTime.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
        orderTimeInfoWhatsapp = `*Tipo de Pedido:* Inmediato (Listo aprox. ${formattedEstimatedTime} hs - ${estimatedMinutes} min)`;
      } else if (orderType === 'reserved') {
        finalOrderTime = orderTime; // Ya debería ser un ISO string o un formato compatible
        const reservedDate = new Date(finalOrderTime);
        const formattedReservedTime = reservedDate.toLocaleDateString('es-AR', {
          day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
        });
        orderTimeInfoWhatsapp = `*Tipo de Pedido:* Reserva para ${formattedReservedTime} hs`;
      } else {
        // Fallback si orderType no es ni 'immediate' ni 'reserved'
        finalOrderTime = new Date().toISOString();
        orderTimeInfoWhatsapp = '*Tipo de Pedido:* No especificado';
      }

      // CALCULAR EL TOTAL DEL PEDIDO INCLUYENDO SALSAS, SABORES, TAMAÑOS Y COMBINACIONES Y TIPO DE CANTIDAD
      const totalCalculated = cartItems.reduce((sum, item) => {
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
          itemBasePrice = Math.max(item.precio || 0, item.selectedCombinedPizza.precio || 0);
        }

        const itemPriceWithExtras = itemBasePrice + (item.selectedSauce?.price || 0) + (item.selectedFlavor?.price || 0) + (item.selectedSize?.price || 0);
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

      // CONSTRUCCIÓN DEL DETALLE DE PRODUCTOS PARA WHATSAPP
      const orderDetailsForWhatsapp = cartItems.map(item => {
        let itemDisplayName = item.name;
        let itemBasePrice = item.precio || 0;
        let quantityLabel = `${item.quantity}x`; // Etiqueta de cantidad por defecto

        // Si es una pizza combinada, ajusta el nombre y el precio base para el mensaje
        if (item.category === 'Pizzas' && item.selectedCombinedPizza) {
          itemDisplayName = `Pizza (Mitad ${item.name} + Mitad ${item.selectedCombinedPizza.name})`;
          itemBasePrice = Math.max(item.precio || 0, item.selectedCombinedPizza.precio || 0); // Precio de la pizza de mayor valor
        } else if (['Empanadas y Canastitas'].includes(item.category) && item.selectedQuantityType) {
          // Si es empanada/canastita, ajusta el nombre y el precio base según el tipo de cantidad
          if (item.selectedQuantityType === 'docena') {
            itemBasePrice = item.precioDocena || (item.precio * 12);
            quantityLabel = `${item.quantity}x Docena`;
          } else if (item.selectedQuantityType === 'mediaDocena') {
            itemBasePrice = item.precioMediaDocena || (item.precio * 6);
            quantityLabel = `${item.quantity}x Media Docena`;
          } else { // 'unidad'
            itemBasePrice = item.precio || 0;
            quantityLabel = `${item.quantity}x Unidad`;
          }
        }

        const saucePrice = item.selectedSauce?.price || 0;
        const flavorPrice = item.selectedFlavor?.price || 0;
        const sizePrice = item.selectedSize?.price || 0;
        const itemTotalPrice = (itemBasePrice + saucePrice + flavorPrice + sizePrice) * item.quantity;

        let detail = `- ${quantityLabel} ${itemDisplayName}`;
        if (item.selectedFlavor) {
            detail += ` (Sabor: ${item.selectedFlavor.name})`;
        }
        if (item.selectedSauce) {
          detail += ` (Salsa: ${item.selectedSauce.name}`;
          if (!item.selectedSauce.isFree && item.selectedSauce.price > 0) {
            detail += ` +$${Math.floor(item.selectedSauce.price)}`;
          }
          detail += `)`;
        }
        if (item.selectedSize) {
          detail += ` (Tamaño: ${item.selectedSize.name}`;
          if (item.selectedSize.price > 0) {
            detail += ` +$${Math.floor(item.selectedSize.price)}`;
          }
          detail += `)`;
        }
        // NUEVO: Añadir detalles de sabores de empanadas combinadas
        if (item.combinedEmpanadaFlavors && Object.keys(item.combinedEmpanadaFlavors).length > 0) {
            const flavorDetails = Object.keys(item.combinedEmpanadaFlavors).map(flavorId => {
                // Obtener el nombre del producto individual de allProducts
                const individualProduct = allProducts?.find(p => p.id === flavorId);
                return `${individualProduct ? individualProduct.name : `ID:${flavorId}`} x${item.combinedEmpanadaFlavors[flavorId]}`;
            }).join(', ');
            detail += ` [Sabores: ${flavorDetails}]`;
        }
        detail += ` = $${Math.floor(itemTotalPrice)}`;
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
          // Si es una combinación de empanadas, actualiza el stock de los productos individuales
          if (item.combinedEmpanadaFlavors && Object.keys(item.combinedEmpanadaFlavors).length > 0) {
            for (const flavorId in item.combinedEmpanadaFlavors) {
              const selectedCount = item.combinedEmpanadaFlavors[flavorId];
              const individualProductRef = doc(productsCollectionRef, flavorId);
              const individualProduct = allProducts.find(p => p.id === flavorId); // Buscar el producto individual en allProducts

              // Asegurarse de que el producto individual existe y tiene suficiente stock
              if (individualProduct && individualProduct.stock !== undefined && individualProduct.stock >= selectedCount * item.quantity) {
                batch.update(individualProductRef, {
                  stock: individualProduct.stock - (selectedCount * item.quantity) // Restar la cantidad total de unidades individuales
                });
              } else {
                // Si el stock es insuficiente o el producto no se encuentra, notificar y no procesar el pedido
                showNotification(`Error: Stock insuficiente para el sabor de empanada "${individualProduct?.name || 'ID:' + flavorId}". Pedido no procesado.`, 'error', 7000);
                // Si hay un error de stock, se debe lanzar un error para abortar el batch
                throw new Error(`Stock insuficiente para el sabor de empanada "${individualProduct?.name || 'ID:' + flavorId}".`);
              }
            }
            // También se debe restar del stock del producto "contenedor" (ej. "Media Docena de Empanadas")
            const containerProductRef = doc(productsCollectionRef, item.id);
            const containerProduct = allProducts.find(p => p.id === item.id);
            if (containerProduct && containerProduct.stock !== undefined && containerProduct.stock >= item.quantity) {
                batch.update(containerProductRef, {
                    stock: containerProduct.stock - item.quantity // Restar la cantidad de paquetes
                });
            } else {
                showNotification(`Error: Stock insuficiente para el paquete "${containerProduct?.name || item.name}". Pedido no procesado.`, 'error', 7000);
                throw new Error(`Stock insuficiente para el paquete "${containerProduct?.name || item.name}".`);
            }
          } else {
            // Lógica de stock existente para otros productos (unidades, pizzas, pastas, etc.)
            if (item.id) {
              const productDocRef = doc(productsCollectionRef, item.id);
              // Calcular la cantidad real de unidades que se restarán del stock
              let unitsToSubtract = item.quantity;
              if (['Empanadas y Canastitas'].includes(item.category) && item.selectedQuantityType) {
                if (item.selectedQuantityType === 'mediaDocena') {
                  unitsToSubtract = item.quantity * 6;
                } else if (item.selectedQuantityType === 'docena') {
                  unitsToSubtract = item.quantity * 12;
                }
              }

              const currentProductInAllProducts = allProducts.find(p => p.id === item.id); // Obtener el producto actual para su stock
              if (currentProductInAllProducts && currentProductInAllProducts.stock !== undefined && currentProductInAllProducts.stock >= unitsToSubtract) {
                batch.update(productDocRef, {
                  stock: currentProductInAllProducts.stock - unitsToSubtract
                });
              } else {
                showNotification(`Error: Stock insuficiente para ${item.name}. Pedido no procesado.`, 'error', 7000);
                throw new Error(`Stock insuficiente para ${item.name}.`);
              }
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
            precioMediaDocena: item.precioMediaDocena || null, // NUEVO
            precioDocena: item.precioDocena || null, // NUEVO
            imageUrl: item.image || item.imageUrl,
            selectedSauce: item.selectedSauce || null,
            selectedFlavor: item.selectedFlavor || null,
            selectedSize: item.selectedSize || null,
            selectedCombinedPizza: item.selectedCombinedPizza || null,
            selectedQuantityType: item.selectedQuantityType || null, // NUEVO
            combinedEmpanadaFlavors: item.combinedEmpanadaFlavors || null, // NUEVO: Guardar los sabores combinados
            category: item.category, // Asegurarse de pasar la categoría
          })),
          total: totalCalculated,
          customerInfo: { name, address, phone, orderType, orderTime: finalOrderTime, deliveryMethod, cashAmount: parseFloat(cashAmount) || 0, change: changeAmount, notes }, // Pasa orderType y el finalOrderTime
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
          // Si el error fue lanzado por stock insuficiente, el mensaje ya es informativo
          userErrorMessage = firebaseError.message.includes("Stock insuficiente") ? firebaseError.message : `Error desconocido al procesar el pedido: ${firebaseError.message}`;
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
    [cartItems, showNotification, db, userId, handleClearCart, localProjectId, actualAppIdForFirestore, existingOrdersCount, allProducts] // Añadido allProducts a las dependencias
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
