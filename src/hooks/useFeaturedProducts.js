import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';

/**
 * Hook personalizado para gestionar la carga de productos destacados.
 * Carga los IDs de productos destacados de Firestore y devuelve los objetos de productos completos.
 *
 * @param {Object} db - Instancia de Firestore.
 * @param {string} appId - ID de la aplicación (para la ruta de Firestore).
 * @param {Array} productos - Lista completa de todos los productos disponibles.
 * @returns {Object} Un objeto que contiene:
 * - {Array} manualFeaturedProductIds: Array de IDs de productos destacados configurados manualmente.
 * - {Array} featuredProducts: Lista de objetos de productos destacados.
 */
export const useFeaturedProducts = (db, appId, productos) => {
  const [manualFeaturedProductIds, setManualFeaturedProductIds] = useState([]);

  useEffect(() => {
    if (!db) return;

    const featuredConfigDocRef = doc(db, `artifacts/${appId}/public/data/featured_products_config/manual_selection`);
    const unsubscribe = onSnapshot(featuredConfigDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setManualFeaturedProductIds(data.productIds || []);
      } else {
        setManualFeaturedProductIds([]);
      }
    }, (err) => {
      console.error("Error al cargar IDs de productos destacados manualmente:", err);
      // No se usa showNotification aquí para evitar spam si hay un error constante
    });

    return unsubscribe;
  }, [db, appId]);

  // Filtra los productos para obtener solo los destacados
  const featuredProducts = useMemo(() => {
    const filtered = productos.filter(product => manualFeaturedProductIds.includes(product.id));
    // Si no hay productos destacados configurados, muestra los primeros 3 productos disponibles
    if (filtered.length === 0 && productos.length > 0) {
      return productos.slice(0, 3); 
    }
    return filtered;
  }, [productos, manualFeaturedProductIds]); 

  return {
    manualFeaturedProductIds, // Se devuelve por si el AdminDashboard necesita manipularlo
    featuredProducts,
  };
};
