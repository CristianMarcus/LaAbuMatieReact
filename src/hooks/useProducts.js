import { useState, useEffect, useCallback, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';

/**
 * Hook personalizado para gestionar la carga, búsqueda y categorización de productos.
 *
 * @param {Object} db - Instancia de Firestore.
 * @param {string} appId - ID de la aplicación (para la ruta de Firestore).
 * @param {boolean} isAuthReady - Indica si la autenticación está lista (para iniciar la carga).
 * @param {Function} showNotification - Función para mostrar notificaciones.
 * @returns {Object} Un objeto que contiene:
 * - {Array} productos: Lista de todos los productos cargados.
 * - {boolean} loadingProducts: Verdadero si los productos están cargándose.
 * - {string|null} error: Mensaje de error si ocurre un problema.
 * - {string} searchTerm: Término de búsqueda actual.
 * - {Function} setSearchTerm: Función para actualizar el término de búsqueda.
 * - {Object} productosPorCategoria: Productos agrupados por categoría.
 * - {Array} sortedProductosPorCategoria: Productos agrupados por categoría y ordenados.
 * - {Function} toggleCategoria: Función para alternar la visibilidad de una categoría.
 * - {Object} categoriasAbiertas: Estado de apertura/cierre de cada categoría.
 */
export const useProducts = (db, appId, isAuthReady, showNotification) => {
  const [productos, setProductos] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});

  useEffect(() => {
    if (!db || !isAuthReady) {
      return;
    }

    setLoadingProducts(true); 
    const productsCollectionRef = collection(db, `artifacts/${appId}/public/data/products`);
    const q = query(productsCollectionRef);

    const unsubscribe = onSnapshot(q, (snapshot) => { 
      const productsData = snapshot.docs.map(doc => {
        const { id, ...dataWithoutId } = doc.data();
        return {
          id: doc.id,
          ...dataWithoutId,
        };
      });
      setProductos(productsData); 

      // Inicializa el estado de apertura de categorías
      const initialCategoriesState = productsData.reduce((acc, p) => {
        if (p.category) {
          acc[p.category] = false; // Todas cerradas por defecto
        }
        return acc;
      }, {});
      setCategoriasAbiertas(initialCategoriesState);

      setLoadingProducts(false); 
    }, (err) => {
      console.error("Error al cargar productos desde Firestore:", err);
      setError("No se pudieron cargar los productos. Por favor, inténtalo de nuevo más tarde.");
      setLoadingProducts(false);
      showNotification("Error al cargar productos.", "error");
    });

    return () => {
      unsubscribe(); // Limpiar el listener al desmontar
    };
  }, [db, appId, isAuthReady, showNotification]);

  // Filtra los productos según el término de búsqueda
  const allProducts = useMemo(() => {
    return productos.filter(producto =>
      producto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [productos, searchTerm]);

  // Agrupa los productos filtrados por categoría
  const productosPorCategoria = useMemo(() => {
    const grouped = allProducts.reduce((acc, producto) => {
      const categoria = producto.category || 'Sin categoría';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(producto);
      return acc;
    }, {});
    return grouped;
  }, [allProducts]);

  // Ordena los productos dentro de cada categoría alfabéticamente por nombre
  const sortedProductosPorCategoria = useMemo(() => {
    const categoriesArray = Object.entries(productosPorCategoria);
    categoriesArray.forEach(([categoria, productosArray]) => {
      productosArray.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    return categoriesArray;
  }, [productosPorCategoria]);

  // Función para alternar la visibilidad de una categoría
  const toggleCategoria = useCallback((categoria) => {
    setCategoriasAbiertas((prev) => ({
      ...prev,
      [categoria]: !prev[categoria],
    }));
  }, []);

  return {
    productos,
    loadingProducts,
    error,
    searchTerm,
    setSearchTerm,
    productosPorCategoria, // Aunque no se usa directamente en App.jsx, se mantiene por si se necesita
    sortedProductosPorCategoria,
    toggleCategoria,
    categoriasAbiertas,
    allProducts, // Devuelve también allProducts para otros hooks que puedan necesitar los productos filtrados
  };
};
