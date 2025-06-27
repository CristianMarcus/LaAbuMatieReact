import { useState, useEffect, useCallback, useMemo } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * Hook personalizado para gestionar la lista de productos favoritos de un usuario.
 * Persiste los favoritos en localStorage y los sincroniza con Firestore.
 *
 * @param {Object} db - Instancia de Firestore.
 * @param {string} appId - ID de la aplicación (para la ruta de Firestore).
 * @param {string|null} userId - ID del usuario actual.
 * @param {Function} showNotification - Función para mostrar notificaciones.
 * @param {Array} allProducts - Lista de todos los productos disponibles (para filtrar favoritos).
 * @returns {Object} Un objeto que contiene:
 * - {Array} favoriteProductIds: Array de IDs de productos marcados como favoritos.
 * - {Function} toggleFavorite: Función para añadir/quitar un producto de favoritos.
 * - {Array} favoriteProducts: Lista de objetos de productos que son favoritos.
 */
export const useFavorites = (db, appId, userId, showNotification, allProducts) => {
  const [favoriteProductIds, setFavoriteProductIds] = useState(() => {
    // Inicializa desde localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedFavorites = localStorage.getItem('favoriteProductIds');
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    }
    return [];
  });

  // Sincroniza favoriteProductIds con localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('favoriteProductIds', JSON.stringify(favoriteProductIds));
    }
  }, [favoriteProductIds]);

  // Sincroniza favoriteProductIds con Firestore
  useEffect(() => {
    if (!db || !userId) {
      // No hay DB o usuario, no se puede sincronizar con Firestore
      return;
    }

    const favoritesRef = doc(db, `artifacts/${appId}/users/${userId}/favorites/data`);
    const unsubscribe = onSnapshot(favoritesRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // Solo actualiza si los datos de Firestore son diferentes para evitar bucles
        if (JSON.stringify(data.productIds || []) !== JSON.stringify(favoriteProductIds)) {
          setFavoriteProductIds(data.productIds || []);
        }
      } else {
        // Si el documento no existe en Firestore, asegúrate de que el estado local sea vacío
        if (favoriteProductIds.length > 0) {
          setFavoriteProductIds([]);
        }
      }
    }, (error) => {
      console.error("Error al cargar favoritos desde Firestore:", error);
      showNotification("Error al cargar tus productos favoritos.", "error");
    });

    return () => unsubscribe(); // Limpiar el listener
  }, [db, appId, userId, showNotification]); // Dependencias para el efecto de Firestore

  // Función para añadir/quitar un producto de favoritos
  const toggleFavorite = useCallback(async (productId) => { 
    if (!db || !userId) {
      showNotification("Debes iniciar sesión o registrarte para guardar favoritos.", "info");
      return;
    }

    try {
      const favoritesRef = doc(db, `artifacts/${appId}/users/${userId}/favorites/data`);
      let updatedFavoriteIds;

      if (favoriteProductIds.includes(productId)) {
        updatedFavoriteIds = favoriteProductIds.filter(id => id !== productId);
        showNotification('Producto eliminado de favoritos.', 'info', 1500);
      } else {
        updatedFavoriteIds = [...favoriteProductIds, productId];
        showNotification('Producto añadido a favoritos.', 'success', 1500);
      }
      // Actualizar Firestore
      await setDoc(favoritesRef, { productIds: updatedFavoriteIds }, { merge: true });
      // El onSnapshot de arriba se encargará de actualizar el estado local
    } catch (error) {
      console.error("Error al actualizar favoritos:", error);
      showNotification("Error al actualizar favoritos.", "error");
    }
  }, [db, appId, userId, favoriteProductIds, showNotification]);

  // Filtra los productos que son favoritos
  const favoriteProducts = useMemo(() => {
    return allProducts.filter(p => favoriteProductIds.includes(p.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allProducts, favoriteProductIds]);

  return {
    favoriteProductIds,
    toggleFavorite,
    favoriteProducts,
  };
};
