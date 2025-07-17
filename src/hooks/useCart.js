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
  // Ahora considera la salsa, el sabor, el TAMAÑO, la PIZZA COMBINADA, el TIPO DE CANTIDAD y los SABORES DE EMPANADA COMBINADOS
  const generateItemKey = useCallback((productId, sauceId = null, flavorId = null, sizeId = null, combinedPizzaId = null, quantityType = null, combinedEmpanadaFlavors = {}) => {
    // Para combinedEmpanadaFlavors, convierte el objeto a una cadena JSON ordenada para asegurar una clave consistente
    const sortedEmpanadaFlavors = Object.keys(combinedEmpanadaFlavors)
      .sort()
      .map(key => `${key}:${combinedEmpanadaFlavors[key]}`)
      .join(',');
    return `${productId}-${sauceId || 'no-sauce'}-${flavorId || 'no-flavor'}-${sizeId || 'no-size'}-${combinedPizzaId || 'no-combined-pizza'}-${quantityType || 'no-type'}-${sortedEmpanadaFlavors || 'no-empanada-combo'}`;
  }, []);

  // Añadir producto al carrito
  // productToAdd ahora puede incluir selectedSauce, selectedFlavor, selectedSize, selectedCombinedPizza, selectedQuantityType y combinedEmpanadaFlavors
  const handleAddToCart = useCallback((productToAdd, quantityToAdd = 1) => {
    setCartItems((prevItems) => {
      // Genera un ID único para el ítem del carrito basado en el producto, la salsa, el sabor, el tamaño, la pizza combinada y el tipo de cantidad
      const itemKey = generateItemKey(
        productToAdd.id,
        productToAdd.selectedSauce?.id,
        productToAdd.selectedFlavor?.id,
        productToAdd.selectedSize?.id,
        productToAdd.selectedCombinedPizza?.id,
        productToAdd.selectedQuantityType,
        productToAdd.combinedEmpanadaFlavors // NUEVO: Incluye los sabores de empanada combinados
      );

      const existingItem = prevItems.find((item) => {
        const existingItemKey = generateItemKey(
          item.id,
          item.selectedSauce?.id,
          item.selectedFlavor?.id,
          item.selectedSize?.id,
          item.selectedCombinedPizza?.id,
          item.selectedQuantityType,
          item.combinedEmpanadaFlavors // NUEVO: Incluye los sabores de empanada combinados
        );
        return existingItemKey === itemKey;
      });

      // Función auxiliar para construir el nombre del producto en las notificaciones
      // Intenta resolver el nombre si availableEmpanadaFlavors está presente en productToAdd
      const getNotificationName = (product, sauce, flavor, size, combinedPizza, quantityType, combinedEmpanadaFlavors) => {
        let name = product.name;
        if (combinedPizza) { // Si es una pizza combinada, ajusta el nombre
          name = `${product.name} + ${combinedPizza.name}`;
        }
        if (flavor) {
          name += ` (Sabor: ${flavor.name})`;
        }
        if (sauce) {
          name += ` (Salsa: ${sauce.name})`;
        }
        if (size) {
          name += ` (Tamaño: ${size.name})`;
        }
        if (quantityType) { // Añade el tipo de cantidad para empanadas/canastitas
          if (quantityType === 'mediaDocena') {
            name += ` (1/2 Doc.)`;
          } else if (quantityType === 'docena') {
            name += ` (Docena)`;
          }
        }
        // Si es una combinación de empanadas, añade un resumen de los sabores
        if (combinedEmpanadaFlavors && Object.keys(combinedEmpanadaFlavors).length > 0) {
            const flavorSummary = Object.keys(combinedEmpanadaFlavors)
                .map(id => {
                    // Aquí, productToAdd.allProducts (si se pasa) sería ideal para resolver el nombre.
                    // Por ahora, si no se puede resolver, muestra el ID.
                    const foundFlavor = productToAdd.allProducts?.find(f => f.id === id);
                    return foundFlavor ? `${foundFlavor.name} x${combinedEmpanadaFlavors[id]}` : `ID:${id} x${combinedEmpanadaFlavors[id]}`;
                })
                .join(', ');
            name += ` [Sabores: ${flavorSummary}]`;
        }
        return name;
      };

      if (existingItem) {
        const newQuantity = existingItem.quantity + quantityToAdd;
        // Calcular la cantidad total de unidades para la validación de stock
        let unitsPerItem = 1;
        if (['Empanadas y Canastitas'].includes(productToAdd.category)) {
          if (productToAdd.selectedQuantityType === 'mediaDocena') {
            unitsPerItem = 6;
          } else if (productToAdd.selectedQuantityType === 'docena') {
            unitsPerItem = 12;
          }
        }
        // Si es una combinación de empanadas, el stock se valida por el stock del "paquete"
        // y por el stock de cada empanada individual en el momento de añadir.
        // Aquí, en el carrito, solo validamos el stock del "paquete" si aplica.
        if (productToAdd.combinedEmpanadaFlavors) {
            // Para combinaciones de empanadas, el stock se refiere al número de paquetes disponibles
            if (newQuantity > productToAdd.stock) {
                showNotification(
                    `No se puede añadir más de "${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor, productToAdd.selectedSize, productToAdd.selectedCombinedPizza, productToAdd.selectedQuantityType, productToAdd.combinedEmpanadaFlavors)}". Solo quedan ${productToAdd.stock - existingItem.quantity} paquetes disponibles.`,
                    'warning',
                    3000
                );
                return prevItems;
            }
        } else {
            // Lógica de stock para productos normales (unidades)
            const currentTotalUnits = existingItem.quantity * unitsPerItem;
            const newTotalUnitsIfIncreased = newQuantity * unitsPerItem;
            if (newTotalUnitsIfIncreased > productToAdd.stock) {
                showNotification(
                    `No se puede añadir más de "${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor, productToAdd.selectedSize, productToAdd.selectedCombinedPizza, productToAdd.selectedQuantityType, productToAdd.combinedEmpanadaFlavors)}". Stock disponible: ${productToAdd.stock - currentTotalUnits}`,
                    'warning',
                    3000
                );
                return prevItems;
            }
        }

        showNotification(
          `${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor, productToAdd.selectedSize, productToAdd.selectedCombinedPizza, productToAdd.selectedQuantityType, productToAdd.combinedEmpanadaFlavors)} +${quantityToAdd} unidad(es)`,
          'info',
          1500
        );
        return prevItems.map((item) => generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors) === itemKey ? { ...item, quantity: newQuantity } : item );

      } else {
        // Calcular la cantidad total de unidades para la validación de stock del nuevo ítem
        let unitsForNewItem = quantityToAdd;
        if (['Empanadas y Canastitas'].includes(productToAdd.category)) {
          if (productToAdd.selectedQuantityType === 'mediaDocena') {
            unitsForNewItem = quantityToAdd * 6;
          } else if (productToAdd.selectedQuantityType === 'docena') {
            unitsForNewItem = quantityToAdd * 12;
          }
        }
        // Si es una combinación de empanadas, el stock se valida por el stock del "paquete"
        if (productToAdd.combinedEmpanadaFlavors) {
            // Para combinaciones de empanadas, el stock se refiere al número de paquetes disponibles
            if (quantityToAdd > productToAdd.stock) {
                showNotification(
                    `No hay suficiente stock de "${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor, productToAdd.selectedSize, productToAdd.selectedCombinedPizza, productToAdd.selectedQuantityType, productToAdd.combinedEmpanadaFlavors)}". Solo quedan ${productToAdd.stock} paquetes disponibles.`,
                    'error',
                    3000
                );
                return prevItems;
            }
        } else {
            // Lógica de stock para productos normales (unidades)
            if (unitsForNewItem > productToAdd.stock) {
                showNotification(
                    `No hay suficiente stock para añadir "${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor, productToAdd.selectedSize, productToAdd.selectedCombinedPizza, productToAdd.selectedQuantityType, productToAdd.combinedEmpanadaFlavors)}". Solo quedan ${productToAdd.stock} disponibles.`,
                    'error',
                    3000
                );
                return prevItems;
            }
        }

        showNotification(
          `"${getNotificationName(productToAdd, productToAdd.selectedSauce, productToAdd.selectedFlavor, productToAdd.selectedSize, productToAdd.selectedCombinedPizza, productToAdd.selectedQuantityType, productToAdd.combinedEmpanadaFlavors)}" añadido al carrito`,
          'success',
          2000
        );
        // Asegúrate de que el objeto productToAdd ya contenga selectedSauce, selectedFlavor, selectedSize, selectedCombinedPizza, selectedQuantityType y combinedEmpanadaFlavors
        return [...prevItems, { ...productToAdd, quantity: quantityToAdd }];
      }
    });
  }, [showNotification, generateItemKey]);

  // Aumentar la cantidad de un ítem existente en el carrito
  const handleIncreaseQuantity = useCallback((productId, sauceId = null, flavorId = null, sizeId = null, combinedPizzaId = null, quantityType = null, combinedEmpanadaFlavors = {}) => {
    setCartItems((prevItems) => {
      const itemKey = generateItemKey(productId, sauceId, flavorId, sizeId, combinedPizzaId, quantityType, combinedEmpanadaFlavors);
      return prevItems.map((item) => {
        const currentItemKey = generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors);
        if (currentItemKey === itemKey) {
          let unitsPerItem = 1;
          if (['Empanadas y Canastitas'].includes(item.category)) {
            if (item.selectedQuantityType === 'mediaDocena') {
              unitsPerItem = 6;
            } else if (item.selectedQuantityType === 'docena') {
              unitsPerItem = 12;
            }
          }

          // Para combinaciones de empanadas, el stock se refiere al número de paquetes disponibles
          if (item.combinedEmpanadaFlavors) {
              if (item.quantity + 1 <= item.stock) {
                  showNotification(
                      `"${item.name}${item.selectedQuantityType ? ` (${item.selectedQuantityType === 'mediaDocena' ? '1/2 Doc.' : item.selectedQuantityType === 'docena' ? 'Docena' : 'Unidad'})` : ''}" +1`,
                      'info',
                      1500
                  );
                  return { ...item, quantity: item.quantity + 1 };
              } else {
                  showNotification(
                      `No se puede añadir más de "${item.name}${item.selectedQuantityType ? ` (${item.selectedQuantityType === 'mediaDocena' ? '1/2 Doc.' : item.selectedQuantityType === 'docena' ? 'Docena' : 'Unidad'})` : ''}". Stock disponible: ${item.stock - item.quantity} paquetes.`,
                      'warning',
                      3000
                  );
                  return item;
              }
          } else {
              // Lógica de stock para productos normales (unidades)
              const newTotalUnits = (item.quantity + 1) * unitsPerItem;
              if (newTotalUnits <= item.stock) {
                showNotification(
                  `"${item.name}${item.selectedCombinedPizza ? ` + ${item.selectedCombinedPizza.name}` : ''}${item.selectedQuantityType ? ` (${item.selectedQuantityType === 'mediaDocena' ? '1/2 Doc.' : item.selectedQuantityType === 'docena' ? 'Docena' : 'Unidad'})` : ''}" +1`,
                  'info',
                  1500
                );
                return { ...item, quantity: item.quantity + 1 };
              } else {
                showNotification(
                  `No se puede añadir más de "${item.name}${item.selectedCombinedPizza ? ` + ${item.selectedCombinedPizza.name}` : ''}${item.selectedQuantityType ? ` (${item.selectedQuantityType === 'mediaDocena' ? '1/2 Doc.' : item.selectedQuantityType === 'docena' ? 'Docena' : 'Unidad'})` : ''}". Stock disponible: ${item.stock - (item.quantity * unitsPerItem)}`,
                  'warning',
                  3000
                );
                return item;
              }
          }
        }
        return item;
      });
    });
  }, [showNotification, generateItemKey]);

  // Disminuir la cantidad de un ítem existente en el carrito
  const handleDecreaseQuantity = useCallback((productId, sauceId = null, flavorId = null, sizeId = null, combinedPizzaId = null, quantityType = null, combinedEmpanadaFlavors = {}) => {
    setCartItems((prevItems) => {
      const itemKey = generateItemKey(productId, sauceId, flavorId, sizeId, combinedPizzaId, quantityType, combinedEmpanadaFlavors);
      return prevItems.map((item) => {
        const currentItemKey = generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors);
        if (currentItemKey === itemKey) {
          const newQuantity = item.quantity - 1;
          if (newQuantity >= 1) {
            showNotification(
              `"${item.name}${item.selectedCombinedPizza ? ` + ${item.selectedCombinedPizza.name}` : ''}${item.selectedQuantityType ? ` (${item.selectedQuantityType === 'mediaDocena' ? '1/2 Doc.' : item.selectedQuantityType === 'docena' ? 'Docena' : 'Unidad'})` : ''}" -1`,
              'info',
              1500
            );
            return { ...item, quantity: newQuantity };
          } else {
            // Si la cantidad llega a 0, se elimina el producto
            let notificationMessage = `"${item.name}`;
            if (item.selectedSauce) notificationMessage += ` con ${item.selectedSauce.name}`;
            if (item.selectedFlavor) notificationMessage += ` sabor ${item.selectedFlavor.name}`;
            if (item.selectedSize) notificationMessage += ` tamaño ${item.selectedSize.name}`;
            if (item.selectedCombinedPizza) notificationMessage += ` + ${item.selectedCombinedPizza.name}`;
            if (item.selectedQuantityType) {
              if (item.selectedQuantityType === 'mediaDocena') notificationMessage += ` (1/2 Doc.)`;
              else if (item.selectedQuantityType === 'docena') notificationMessage += ` (Docena)`;
            }
            // Si es una combinación de empanadas, añade un resumen de los sabores
            if (item.combinedEmpanadaFlavors && Object.keys(item.combinedEmpanadaFlavors).length > 0) {
                const flavorSummary = Object.keys(item.combinedEmpanadaFlavors)
                    .map(id => `${id} x${item.combinedEmpanadaFlavors[id]}`) // Aquí no tenemos el nombre del sabor, solo el ID
                    .join(', ');
                notificationMessage += ` [Sabores: ${flavorSummary}]`;
            }
            notificationMessage += `" eliminado del carrito`;
            showNotification(notificationMessage, 'error', 2000);
            return null; // Marcar para filtrar
          }
        }
        return item;
      }).filter(Boolean); // Filtrar ítems que sean null (eliminados)
    });
  }, [showNotification, generateItemKey]);

  // Eliminar un ítem del carrito (ahora con sauceId, flavorId, sizeId, combinedPizzaId, quantityType y combinedEmpanadaFlavors)
  const handleRemoveItem = useCallback((productId, sauceId = null, flavorId = null, sizeId = null, combinedPizzaId = null, quantityType = null, combinedEmpanadaFlavors = {}) => {
    setCartItems((prevItems) => {
      const targetKey = generateItemKey(productId, sauceId, flavorId, sizeId, combinedPizzaId, quantityType, combinedEmpanadaFlavors);
      const removedItem = prevItems.find(item => generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors) === targetKey);
      if (removedItem) {
        let notificationMessage = `"${removedItem.name}`;
        if (removedItem.selectedSauce) notificationMessage += ` con ${removedItem.selectedSauce.name}`;
        if (removedItem.selectedFlavor) notificationMessage += ` sabor ${removedItem.selectedFlavor.name}`;
        if (removedItem.selectedSize) notificationMessage += ` tamaño ${removedItem.selectedSize.name}`;
        if (removedItem.selectedCombinedPizza) notificationMessage += ` + ${removedItem.selectedCombinedPizza.name}`;
        if (removedItem.selectedQuantityType) {
          if (removedItem.selectedQuantityType === 'mediaDocena') notificationMessage += ` (1/2 Doc.)`;
          else if (removedItem.selectedQuantityType === 'docena') notificationMessage += ` (Docena)`;
        }
        // Si es una combinación de empanadas, añade un resumen de los sabores
        if (removedItem.combinedEmpanadaFlavors && Object.keys(removedItem.combinedEmpanadaFlavors).length > 0) {
            const flavorSummary = Object.keys(removedItem.combinedEmpanadaFlavors)
                .map(id => `${id} x${removedItem.combinedEmpanadaFlavors[id]}`) // Aquí no tenemos el nombre del sabor, solo el ID
                .join(', ');
            notificationMessage += ` [Sabores: ${flavorSummary}]`;
        }
        notificationMessage += `" eliminado del carrito`;
        showNotification(notificationMessage, 'error', 2000); // Notificación con todos los detalles
      }
      return prevItems.filter((item) => generateItemKey(item.id, item.selectedSauce?.id, item.selectedFlavor?.id, item.selectedSize?.id, item.selectedCombinedPizza?.id, item.selectedQuantityType, item.combinedEmpanadaFlavors) !== targetKey); // Filtra con todos los parámetros
    });
  }, [showNotification, generateItemKey]);

  // Vaciar completamente el carrito
  const handleClearCart = useCallback(() => {
    setCartItems([]);
    showNotification('Carrito vaciado', 'error', 2000);
  }, [showNotification]);

  return {
    cartItems,
    setCartItems, // Se expone el setter para casos específicos como la inicialización
    handleAddToCart,
    handleIncreaseQuantity,
    handleDecreaseQuantity,
    handleRemoveItem,
    handleClearCart,
  };
};
