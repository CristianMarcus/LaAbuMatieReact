import { useState, useEffect, useCallback } from 'react';

/**
 * Hook personalizado para gestionar el carrito de compras.
 * Proporciona funciones para añadir, aumentar, disminuir, eliminar y vaciar ítems del carrito,
 * con persistencia en localStorage.
 *
 * @param {Function} showNotification - Función para mostrar notificaciones.
 * @returns {Object} Un objeto que contiene:
 * - {Array} cartItems: Array de ítems en el carrito.
 * - {Function} setCartItems: Setter para el estado del carrito (útil para inicialización/limpieza).
 * - {Function} handleAddToCart: Función para añadir un producto al carrito.
 * - {Function} handleIncreaseQuantity: Función para aumentar la cantidad de un ítem.
 * - {Function} handleDecreaseQuantity: Función para disminuir la cantidad de un ítem.
 * - {Function} handleRemoveItem: Función para eliminar un ítem del carrito.
 * - {Function} handleClearCart: Función para vaciar completamente el carrito.
 */
export const useCart = (showNotification) => {
  // Inicializa cartItems leyendo desde localStorage o con un array vacío
  const [cartItems, setCartItems] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedCart = localStorage.getItem('cartItems');
      try {
        return savedCart ? JSON.parse(savedCart) : [];
      } catch (e) {
        console.error("Error parsing cartItems from localStorage:", e);
        return []; // Fallback a un carrito vacío si hay un error de parseo
      }
    }
    return [];
  });

  // Guarda cartItems en localStorage cada vez que cambian
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('cartItems', JSON.stringify(cartItems));
    }
  }, [cartItems]);

  // Función auxiliar para generar una clave única para un ítem del carrito
  // Ahora considera tanto la salsa como el sabor
  const generateItemKey = useCallback((productId, sauceId = null, flavorId = null) => {
    return `${productId}-${sauceId || 'no-sauce'}-${flavorId || 'no-flavor'}`;
  }, []);

  // Añadir producto al carrito
  // productToAdd ahora puede incluir selectedSauce y selectedFlavor
  const handleAddToCart = useCallback((productToAdd, quantityToAdd = 1) => {
    setCartItems((prevItems) => {
      // Genera un ID único para el ítem del carrito basado en el producto, la salsa y el sabor
      const itemKey = generateItemKey(
        productToAdd.id,
        productToAdd.selectedSauce?.id,
        productToAdd.selectedFlavor?.id // AHORA INCLUYE EL ID DEL SABOR
      );

      const existingItem = prevItems.find((item) => {
        const existingItemKey = generateItemKey(
          item.id,
          item.selectedSauce?.id,
          item.selectedFlavor?.id // AHORA INCLUYE EL ID DEL SABOR
        );
        return existingItemKey === itemKey;
      });

      // Función auxiliar para construir el nombre del producto en las notificaciones
      const getNotificationName = (product, sauce, flavor) => {
        let name = product.name;
        if (flavor) {
          name += ` (Sabor: ${flavor.name})`;
        }
        if (sauce) {
          name += ` (Salsa: ${sauce.name})`;
        }
        return name;
      };

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;
        if (newQuantity <= productToAdd.stock) {
          showNotification(
            `${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor)} +${quantityToAdd} unidad(es)`,
            'info',
            1500
          );
          return prevItems.map((item) =>
            generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id) === itemKey
              ? { ...item, quantity: newQuantity }
              : item
          );
        } else {
          showNotification(
            `No se puede añadir más de "${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor)}". Stock disponible: ${productToAdd.stock - existingItem.quantity}`,
            'warning',
            3000
          );
          return prevItems;
        }
      } else {
        if (quantityToAdd <= productToAdd.stock) {
          showNotification(
            `"${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor)}" añadido al carrito`,
            'success',
            2000
          );
          // Asegúrate de que el objeto productToAdd ya contenga selectedSauce y selectedFlavor
          return [...prevItems, { ...productToAdd, quantity: quantityToAdd }];
        } else {
          showNotification(
            `No se puede añadir "${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor)}". Stock disponible: ${productToAdd.stock}`,
            'warning',
            3000
          );
          return prevItems;
        }
      }
    });
  }, [showNotification, generateItemKey]);

  // Aumentar cantidad de un ítem en el carrito (ahora con sauceId y flavorId)
  const handleIncreaseQuantity = useCallback((productId, sauceId = null, flavorId = null) => { // AHORA RECIBE FLAVORID
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const itemKey = generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id);
        const targetKey = generateItemKey(productId, sauceId, flavorId); // AHORA INCLUYE FLAVORID

        if (itemKey === targetKey) {
          const newQuantity = item.quantity + 1;
          if (newQuantity <= item.stock) {
            return { ...item, quantity: newQuantity };
          } else {
            showNotification(`No hay más stock de "${item.name} ${item.selectedSauce ? `con ${item.selectedSauce.name}` : ''} ${item.selectedFlavor ? `sabor ${item.selectedFlavor.name}` : ''}" disponible.`, 'warning', 2000); // Notificación con sabor
            return item;
          }
        }
        return item;
      })
    );
  }, [showNotification, generateItemKey]);

  // Disminuir cantidad de un ítem en el carrito (ahora con sauceId y flavorId)
  const handleDecreaseQuantity = useCallback((productId, sauceId = null, flavorId = null) => { // AHORA RECIBE FLAVORID
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const itemKey = generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id);
        const targetKey = generateItemKey(productId, sauceId, flavorId); // AHORA INCLUYE FLAVORID

        if (itemKey === targetKey) {
          return { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 0 }; // Set to 0 to be filtered out
        }
        return item;
      }).filter(item => item.quantity > 0) // Elimina el ítem si la cantidad llega a 0
    );
  }, [generateItemKey]);

  // Eliminar un ítem del carrito (ahora con sauceId y flavorId)
  const handleRemoveItem = useCallback((productId, sauceId = null, flavorId = null) => { // AHORA RECIBE FLAVORID
    setCartItems((prevItems) => {
      const targetKey = generateItemKey(productId, sauceId, flavorId); // AHORA INCLUYE FLAVORID
      const removedItem = prevItems.find(item => generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id) === targetKey); // Busca con sabor
      if (removedItem) {
        showNotification(`"${removedItem.name} ${removedItem.selectedSauce ? `con ${removedItem.selectedSauce.name}` : ''} ${removedItem.selectedFlavor ? `sabor ${removedItem.selectedFlavor.name}` : ''}" eliminado del carrito`, 'error', 2000); // Notificación con sabor
      }
      return prevItems.filter((item) => generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id) !== targetKey); // Filtra con sabor
    });
  }, [showNotification, generateItemKey]);

  // Vaciar completamente el carrito
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    showNotification('Carrito vaciado', 'error', 2000);
  }, [showNotification]);

  return {
    cartItems,
    setCartItems, // Se expone el setter por si es necesario para limpiar el carrito después de un pedido
    handleAddToCart,
    handleIncreaseQuantity,
    handleDecreaseQuantity,
    handleRemoveItem,
    handleClearCart,
  };
};
