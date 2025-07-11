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

  // Añadir producto al carrito
  // productToAdd ahora puede incluir un campo selectedSauce
  const handleAddToCart = useCallback((productToAdd, quantityToAdd = 1) => {
    setCartItems((prevItems) => {
      // Genera un ID único para el ítem del carrito basado en el producto y la salsa
      const itemKey = productToAdd.id + (productToAdd.selectedSauce ? `-${productToAdd.selectedSauce.id}` : '');

      const existingItem = prevItems.find((item) => {
        const existingItemKey = item.id + (item.selectedSauce ? `-${item.selectedSauce.id}` : '');
        return existingItemKey === itemKey;
      });

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;
        if (newQuantity <= productToAdd.stock) {
          showNotification(`${productToAdd.name} ${productToAdd.selectedSauce ? `con ${productToAdd.selectedSauce.name}` : ''} +${quantityToAdd} unidad(es)`, 'info', 1500);
          return prevItems.map((item) =>
            (item.id + (item.selectedSauce ? `-${item.selectedSauce.id}` : '')) === itemKey
              ? { ...item, quantity: newQuantity }
              : item
          );
        } else {
          showNotification(`No se puede añadir más de "${productToAdd.name} ${productToAdd.selectedSauce ? `con ${productToAdd.selectedSauce.name}` : ''}". Stock disponible: ${productToAdd.stock - existingItem.quantity}`, 'warning', 3000);
          return prevItems;
        }
      } else {
        if (quantityToAdd <= productToAdd.stock) {
          showNotification(`"${productToAdd.name} ${productToAdd.selectedSauce ? `con ${productToAdd.selectedSauce.name}` : ''}" añadido al carrito`, 'success', 2000);
          return [...prevItems, { ...productToAdd, quantity: quantityToAdd }];
        } else {
          showNotification(`No se puede añadir "${productToAdd.name} ${productToAdd.selectedSauce ? `con ${productToAdd.selectedSauce.name}` : ''}". Stock disponible: ${productToAdd.stock}`, 'warning', 3000);
          return prevItems;
        }
      }
    });
  }, [showNotification]);

  // Aumentar cantidad de un ítem en el carrito (ahora con sauceId)
  const handleIncreaseQuantity = useCallback((productId, sauceId = null) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const itemKey = item.id + (item.selectedSauce ? `-${item.selectedSauce.id}` : '');
        const targetKey = productId + (sauceId ? `-${sauceId}` : '');

        if (itemKey === targetKey) {
          const newQuantity = item.quantity + 1;
          if (newQuantity <= item.stock) {
            return { ...item, quantity: newQuantity };
          } else {
            showNotification(`No hay más stock de "${item.name} ${item.selectedSauce ? `con ${item.selectedSauce.name}` : ''}" disponible.`, 'warning', 2000);
            return item;
          }
        }
        return item;
      })
    );
  }, [showNotification]);

  // Disminuir cantidad de un ítem en el carrito (ahora con sauceId)
  const handleDecreaseQuantity = useCallback((productId, sauceId = null) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        const itemKey = item.id + (item.selectedSauce ? `-${item.selectedSauce.id}` : '');
        const targetKey = productId + (sauceId ? `-${sauceId}` : '');

        if (itemKey === targetKey) {
          return { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 0 }; // Set to 0 to be filtered out
        }
        return item;
      }).filter(item => item.quantity > 0) // Elimina el ítem si la cantidad llega a 0
    );
  }, [showNotification]);

  // Eliminar un ítem del carrito (ahora con sauceId)
  const handleRemoveItem = useCallback((productId, sauceId = null) => {
    setCartItems((prevItems) => {
      const targetKey = productId + (sauceId ? `-${sauceId}` : '');
      const removedItem = prevItems.find(item => (item.id + (item.selectedSauce ? `-${item.selectedSauce.id}` : '')) === targetKey);
      if (removedItem) {
        showNotification(`"${removedItem.name} ${removedItem.selectedSauce ? `con ${removedItem.selectedSauce.name}` : ''}" eliminado del carrito`, 'error', 2000);
      }
      return prevItems.filter((item) => (item.id + (item.selectedSauce ? `-${item.selectedSauce.id}` : '')) !== targetKey);
    });
  }, [showNotification]);

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
