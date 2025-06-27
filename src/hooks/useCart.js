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
  const handleAddToCart = useCallback((productToAdd, quantityToAdd = 1) => {
    setCartItems((prevItems) => {
      const existingItem = prevItems.find((item) => item.id === productToAdd.id);
      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;
        if (newQuantity <= productToAdd.stock) {
          showNotification(`${productToAdd.name} +${quantityToAdd} unidad(es)`, 'info', 1500);
          return prevItems.map((item) =>
            item.id === productToAdd.id ? { ...item, quantity: newQuantity } : item
          );
        } else {
          showNotification(`No se puede añadir más de "${productToAdd.name}". Stock disponible: ${productToAdd.stock - existingItem.quantity}`, 'warning', 3000);
          return prevItems;
        }
      } else {
        if (quantityToAdd <= productToAdd.stock) {
          showNotification(`"${productToAdd.name}" añadido al carrito`, 'success', 2000);
          return [...prevItems, { ...productToAdd, quantity: quantityToAdd }];
        } else {
          showNotification(`No se puede añadir "${productToAdd.name}". Stock disponible: ${productToAdd.stock}`, 'warning', 3000);
          return prevItems;
        }
      }
    });
  }, [showNotification]);

  // Aumentar cantidad de un ítem en el carrito
  const handleIncreaseQuantity = useCallback((productId) => {
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + 1;
          if (newQuantity <= item.stock) {
            return { ...item, quantity: newQuantity };
          } else {
            showNotification(`No hay más stock de "${item.name}" disponible.`, 'warning', 2000);
            return item;
          }
        }
        return item;
      })
    );
  }, [showNotification]);

  // Disminuir cantidad de un ítem en el carrito
  const handleDecreaseQuantity = useCallback((productId) => {
    setCartItems((prevItems) =>
      prevItems.map((item) =>
        item.id === productId
          ? { ...item, quantity: item.quantity > 1 ? item.quantity - 1 : 1 }
          : item
      ).filter(item => item.quantity > 0) // Elimina el ítem si la cantidad llega a 0
    );
  }, [showNotification]);

  // Eliminar un ítem del carrito
  const handleRemoveItem = useCallback((productId) => {
    setCartItems((prevItems) => prevItems.filter((item) => item.id !== productId));
    showNotification('Producto eliminado del carrito', 'error', 2000);
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
