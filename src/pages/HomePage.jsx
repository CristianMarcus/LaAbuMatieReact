// src/pages/HomePage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import ProductCard from '../components/ProductCard';
import ProductCardSkeleton from '../components/ProductCardSkeleton';
import FeaturedProductsSection from '../components/FeaturedProductsSection';
import ToastNotification from '../components/ToastNotification';
// Importaciones de Firebase (si HomePage necesita acceder directamente a Firestore)
import { collection, onSnapshot, query } from 'firebase/firestore';

// Lucide React Icons (asumimos que los necesitas aquí para el search bar)
import { Search, Heart } from 'lucide-react';

// Si necesitas db, appId, userId, showNotification, userProfile, etc. aquí en HomePage,
// deberías pasarlos como props desde Layout o App, o a través de un Context.
// Por simplicidad, los asumiré disponibles si HomePage los necesita,
// como si vinieran de un contexto o de props.
// Por ejemplo:
// import { useAuth } from '../context/AuthContext';
// import { useFirebase } from '../context/FirebaseContext'; // Un contexto que provea db, appId, etc.

const HomePage = ({ db, appId, userId, showNotification, userProfile }) => {
  // Estos estados y funciones (productos, carrito, favoritos, etc.)
  // probablemente vendrían de contextos o de un estado más global en Layout/App
  // para que sean compartidos entre páginas. Los incluyo aquí solo como ejemplo
  // de lo que HomePage podría necesitar.

  const [productos, setProductos] = useState([]);
  const [categoriasAbiertas, setCategoriasAbiertas] = useState({});
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [favoriteProductIds, setFavoriteProductIds] = useState(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      const savedFavorites = localStorage.getItem('favoriteProductIds');
      return savedFavorites ? JSON.parse(savedFavorites) : [];
    }
    return [];
  });
  const [cartItems, setCartItems] = useState([]); // Placeholder, should come from CarritoContext


  // Lógica para cargar productos desde Firestore (Adaptada para HomePage)
  useEffect(() => {
    // Si HomePage necesita db, appId, etc. directamente, asegúrate de que se pasen.
    // Esto es un placeholder. La forma más robusta sería usar un contexto para `db` y `appId`.
    if (!db || !appId) { // Aquí podrías añadir !isAuthReady si db depende del estado de autenticación
      // console.warn("HomePage: db or appId not available for product fetching.");
      setLoadingProducts(false); // Detener la carga si no hay db o appId
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

      const initialCategoriesState = productsData.reduce((acc, p) => {
        if (p.category) {
          acc[p.category] = false;
        }
        return acc;
      }, {});
      setCategoriasAbiertas(initialCategoriesState);
      setLoadingProducts(false);
    }, (err) => {
      setError("No se pudieron cargar los productos. Por favor, inténtalo de nuevo más tarde.");
      setLoadingProducts(false);
    });

    return () => unsubscribe();
  }, [db, appId]); // Dependencias: db y appId

  useEffect(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem('favoriteProductIds', JSON.stringify(favoriteProductIds));
    }
  }, [favoriteProductIds]);

  const toggleCategoria = useCallback((categoria) => {
    setCategoriasAbiertas((prev) => ({
      ...prev,
      [categoria]: !prev[categoria],
    }));
  }, []);

  const toggleFavorite = useCallback((productId) => {
    setFavoriteProductIds(prevIds => {
      if (prevIds.includes(productId)) {
        showNotification('Producto removido de favoritos', 'error', 1500);
        return prevIds.filter(id => id !== productId);
      } else {
        showNotification('Producto añadido a favoritos', 'success', 1500);
        return [...prevIds, productId];
      }
    });
  }, [showNotification]);


  const allProducts = useMemo(() => {
    return productos.filter(producto =>
      producto.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (producto.descripcion && producto.descripcion.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [productos, searchTerm]);

  const productosPorCategoria = useMemo(() => {
    const grouped = allProducts.reduce((acc, producto) => {
      const categoria = producto.category || 'Sin categoría';
      if (!acc[categoria]) acc[categoria] = [];
      acc[categoria].push(producto);
      return acc;
    }, {});
    return grouped;
  }, [allProducts]);

  const sortedProductosPorCategoria = useMemo(() => {
    const categoriesArray = Object.entries(productosPorCategoria);
    categoriesArray.forEach(([categoria, productosArray]) => {
      productosArray.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    });
    return categoriesArray;
  }, [productosPorCategoria]);

  const favoriteProducts = useMemo(() => {
    return allProducts.filter(p => favoriteProductIds.includes(p.id))
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [allProducts, favoriteProductIds]);

  const featuredProducts = useMemo(() => {
    // Asumiendo que quieres los primeros 5 como destacados
    return productos.slice(0, 5)
      .sort((a, b) => (a.name || '').localeCompare(b.name || ''));
  }, [productos]);

  // Placeholder functions for cart, assuming they come from CarritoContext
  const handleAddToCart = useCallback((productToAdd, quantityToAdd = 1) => {
    setCartItems((prevItems) => {
        const existingItem = prevItems.find((item) => item.id === productToAdd.id);
        if (existingItem) {
            showNotification(`${productToAdd.name} +${quantityToAdd} unidad(es)`, 'info', 1500);
            return prevItems.map((item) =>
                item.id === productToAdd.id ? { ...item, quantity: item.quantity + quantityToAdd } : item
            );
        } else {
            showNotification(`"${productToAdd.name}" añadido al carrito`, 'success', 2000);
            return [...prevItems, { ...productToAdd, quantity: quantityToAdd }];
        }
    });
  }, [showNotification]);

  const handleOpenProductDetails = useCallback((product) => {
    // This function would typically trigger a modal in App.jsx or Layout
    // For HomePage, it might just log or navigate.
    console.log("Open product details for:", product.name);
    showNotification(`Detalles de ${product.name}`, 'info');
    // Implement actual modal opening logic here if HomePage is responsible
  }, [showNotification]);

  if (loadingProducts) {
    return (
      // Eliminadas las clases de fondo y min-h-screen de este div
      // Se añade style={{minHeight: '100vh'}} para asegurar que ocupe la altura completa
      <div className="flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8" style={{minHeight: '100vh'}}>
        {/* Título de carga: Centrado y más grande */}
        <div className="w-full mb-12 mt-24 flex justify-center">
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold drop-shadow-2xl">
            <span className="inline-flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-br from-red-700 via-orange-600 to-yellow-400 dark:from-red-500 dark:via-orange-400 dark:to-yellow-200">
              Capriccio de Pizza
            </span>
          </h1>
        </div>
        <div className="max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
          {[...Array(8)].map((_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
        <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-8 animate-pulse">
          Cargando delicias...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      // Eliminadas las clases de fondo y min-h-screen de este div
      // Se añade style={{minHeight: '100vh'}} para asegurar que ocupe la altura completa
      <div className="flex items-center justify-center text-red-600 dark:text-red-400" style={{minHeight: '100vh'}}>
        <p className="text-xl font-semibold">{error}</p>
      </div>
    );
  }


  return (
    // Eliminadas las clases de fondo. El fondo global ahora lo maneja App.jsx / index.html.
    // También se eliminó min-h-screen ya que App.jsx ya lo aplica al contenedor principal.
    <div className="p-4 sm:p-6 lg:p-8"> 
      {/* Título principal de la aplicación: Centrado y con margen superior para empujar el contenido fijo */}
      {/* Añadido 'ml-0 sm:ml-12 md:ml-16' para empujar el título si los botones fijos están muy pegados a la izquierda */}
      <div className="w-full mt-24 sm:mt-28 md:mt-32 mb-12 flex flex-col sm:flex-row justify-center items-center gap-4"> 
        {/* Usamos flex-col y luego sm:flex-row para que en móviles el logo y título estén uno encima del otro,
            y en sm y mayores estén uno al lado del otro. */}
        <img
          src="/logo-capriccio2.jpeg" // Asegúrate de que esta ruta sea correcta y el archivo esté en /public
          alt="Capriccio de Pizza Logo"
          className="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-28 lg:w-28 xl:h-32 xl:w-32 object-contain animate-pizza-jiggle"
        />
        <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-extrabold drop-shadow-2xl text-center"> {/* Agregado text-center */}
          <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-br from-red-700 via-orange-600 to-yellow-400 dark:from-red-500 dark:via-orange-400 dark:to-yellow-200">
            Capriccio de Pizza
          </span>
        </h1>
      </div>

      <div className="max-w-xl mx-auto mb-10 relative">
        <input
          type="text"
          id="search-input" 
          name="search"    
          placeholder="Busca tu empanada, pizza o plato favorito..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full p-4 pl-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-400 shadow-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
        />
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={24} />
      </div>

      <div className="space-y-10 max-w-7xl mx-auto">
        <FeaturedProductsSection
          featuredProducts={featuredProducts}
          onAddToCart={handleAddToCart}
          onOpenDetails={handleOpenProductDetails}
          favoriteProductIds={favoriteProductIds}
          onToggleFavorite={toggleFavorite}
        />

        {favoriteProducts.length > 0 && (
          <div
            key="Favoritos"
            className="rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden transform transition-all duration-300 hover:scale-[1.005] hover:shadow-2xl"
          >
            <button
              onClick={() => toggleCategoria('Favoritos')}
              className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800 hover:from-red-600 hover:to-red-700 dark:hover:from-red-800 dark:hover:to-red-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-900"
              aria-expanded={categoriasAbiertas['Favoritos']}
            >
              <span className="capitalize flex items-center gap-2">
                <Heart size={28} className="text-red-300 fill-current" /> Favoritos
              </span>
              <span className="text-3xl transition-transform duration-300 transform">
                {categoriasAbiertas['Favoritos'] ? '−' : '+'}
              </span>
            </button>

            {categoriasAbiertas['Favoritos'] && (
              <div className="p-6 sm:p-8 animate-fade-in-down">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                  {favoriteProducts.map(producto => (
                    <ProductCard
                      key={producto.id}
                      producto={producto}
                      onAddToCart={handleAddToCart}
                      onOpenDetails={handleOpenProductDetails}
                      isFavorite={favoriteProductIds.includes(producto.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {sortedProductosPorCategoria.map(([categoria, productos]) => (
          productos.length > 0 ? (
            <div
              key={categoria}
              className="rounded-3xl shadow-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-800 overflow-hidden transform transition-all duration-300 hover:scale-[1.005] hover:shadow-2xl"
            >
              <button
                onClick={() => toggleCategoria(categoria)}
                className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-red-500 to-red-600 dark:from-red-700 dark:to-red-800 hover:from-red-600 hover:to-red-700 dark:hover:from-red-800 dark:hover:to-red-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-red-300 dark:focus:ring-900"
                aria-expanded={categoriasAbiertas[categoria]}
              >
                <span className="capitalize flex items-center gap-2">
                  {categoria}
                </span>
                <span className="text-3xl transition-transform duration-300 transform">
                  {categoriasAbiertas[categoria] ? '−' : '+'}
                </span>
              </button>

              {categoriasAbiertas[categoria] && (
                <div className="p-6 sm:p-8 animate-fade-in-down">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 sm:gap-8">
                    {productos.map(producto => (
                      <ProductCard
                        key={producto.id}
                        producto={producto}
                        onAddToCart={handleAddToCart}
                        onOpenDetails={handleOpenProductDetails}
                        isFavorite={favoriteProductIds.includes(producto.id)}
                        onToggleFavorite={toggleFavorite}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : null
        ))}
      </div>
    </div>
  );
};

export default HomePage;
