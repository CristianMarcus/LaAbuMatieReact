import { useState, useEffect, useCallback, useMemo } from 'react';
import ProductCard from './components/ProductCard';
import ShoppingCartModal from './components/ShoppingCartModal';
import OrderFormModal from './components/OrderFormModal';
import OrderSummaryModal from './components/OrderSummaryModal';
import ProductDetailsModal from './components/ProductDetailsModal';
import ToastNotification from './components/ToastNotification';
import FeaturedProductsSection from './components/FeaturedProductsSection';
import Footer from './components/Footer';
import PowaContactForm from './components/PowaContactForm';
import './App.css';
// Importa AlertTriangle aquí para la pantalla de error
// Añadidos MousePointerClick y FileText para las instrucciones, y Star, MessageSquare para reseñas
import { ShoppingCart, Search, Sun, Moon, ArrowUp, Heart, UserCheck, LogOut, LayoutDashboard, Loader2, AlertTriangle, MousePointerClick, FileText, CheckCircle, Star, MessageSquare } from 'lucide-react';

// Importar los nuevos hooks personalizados
import { useToast } from './hooks/useToast';
import { useTheme } from './hooks/useTheme';
import { useScrollToTop } from './hooks/useScrollToTop';
import { useFirebase } from './hooks/useFirebase';
import { useProducts } from './hooks/useProducts';
import { useFavorites } from './hooks/useFavorites';
import { useFeaturedProducts } from './hooks/useFeaturedProducts';
import { useCart } from './hooks/useCart';
import { useOrderFlow } from './hooks/useOrderFlow';
import { useAdminWelcome } from './hooks/useAdminWelcome';

import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';

import { Routes, Route, useNavigate } from 'react-router-dom';
import { Helmet, HelmetProvider } from 'react-helmet-async';

function App() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDetailsModalOpen, setIsProductDetailsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const navigate = useNavigate();

  // Configuración de Firebase (ahora obtenida de las variables de entorno)
  const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : null;
  const canvasFirebaseConfigRaw = typeof __firebase_config !== 'undefined' ? __firebase_config : null;
  const canvasInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  let finalFirebaseConfig = {};
  let finalAppId = 'default-app-id'; // Fallback

  // Priorizar la configuración de Canvas si está disponible y es válida
  if (canvasFirebaseConfigRaw && canvasFirebaseConfigRaw !== '') {
    try {
      finalFirebaseConfig = JSON.parse(canvasFirebaseConfigRaw);
      // Usar canvasAppId si está disponible, de lo contrario el projectId de la config de Canvas
      finalAppId = canvasAppId || finalFirebaseConfig.projectId || 'default-app-id';
    } catch (e) {
      console.error("Error parsing __firebase_config from Canvas:", e);
      // Si hay un error de parseo, se intentará con la configuración local
    }
  }

  // Si la configuración de Canvas no es válida o no está disponible, usar la configuración local .env
  if (Object.keys(finalFirebaseConfig).length === 0 || !finalFirebaseConfig.projectId) {
    finalFirebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
      appId: import.meta.env.VITE_FIREBASE_APP_ID,
      measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
    };
    finalAppId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'default-app-id';
  }

  const firebaseConfig = finalFirebaseConfig;
  // El initialAuthToken solo se usa en el entorno Canvas
  const initialAuthToken = canvasInitialAuthToken;
  const actualFirebaseProjectId = finalAppId; // Usar el ID derivado de la lógica anterior


  // --- Uso de los hooks personalizados ---
  const [toast, showNotification] = useToast();
  const [isDarkMode, toggleDarkMode] = useTheme();
  const [showScrollToTopButton, scrollToTop] = useScrollToTop();
  const [hasShownAdminWelcome, setHasShownAdminWelcome] = useAdminWelcome();

  const {
    db,
    auth,
    userId,
    userProfile,
    isAuthReady,
    isLoadingAuth,
    handleAdminLogin: firebaseAdminLogin,
    handleAdminLogout: firebaseAdminLogout,
  } = useFirebase(firebaseConfig, initialAuthToken, showNotification, currentPage, actualFirebaseProjectId);

  const {
    productos,
    loadingProducts,
    error, // Este error es para la carga de productos, no de Firebase inicial
    searchTerm,
    setSearchTerm,
    sortedProductosPorCategoria,
    toggleCategoria,
    categoriasAbiertas,
    allProducts,
  } = useProducts(db, actualFirebaseProjectId, isAuthReady, showNotification);

  const {
    favoriteProductIds,
    toggleFavorite,
    favoriteProducts,
  } = useFavorites(db, actualFirebaseProjectId, userId, showNotification, allProducts);

  const {
    manualFeaturedProductIds,
    featuredProducts,
  } = useFeaturedProducts(db, actualFirebaseProjectId, productos);

  const {
    cartItems,
    setCartItems,
    handleAddToCart, // <-- Usaremos handleAddToCart directamente
    handleIncreaseQuantity,
    handleDecreaseQuantity,
    handleRemoveItem,
    handleClearCart,
  } = useCart(showNotification);

  const {
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
  } = useOrderFlow(db, actualFirebaseProjectId, userId, cartItems, handleClearCart, showNotification, navigate, actualFirebaseProjectId);

  // --- Lógica de redirección y manejo de estado de administración ---
  useEffect(() => {
    if (currentPage === 'dashboard-admin' && (!userProfile || userProfile.role !== 'admin')) {
      setCurrentPage('home');
      setHasShownAdminWelcome(false);
      navigate('/');
    }
  }, [currentPage, userProfile, setCurrentPage, navigate, setHasShownAdminWelcome]);

  const handleAdminLogin = useCallback(async (email, password) => {
    const result = await firebaseAdminLogin(email, password);
    if (result.success) {
      setHasShownAdminWelcome(true);
      setCurrentPage('dashboard-admin');
      navigate('/dashboard-admin');
    } else {
      setCurrentPage('login-admin');
      navigate('/login-admin');
    }
  }, [firebaseAdminLogin, setHasShownAdminWelcome, navigate]);

  const handleAdminLogout = useCallback(async () => {
    const result = await firebaseAdminLogout();
    if (result.success) {
      setHasShownAdminWelcome(false);
      setCurrentPage('home');
      navigate('/');
    }
  }, [firebaseAdminLogout, setHasShownAdminWelcome, navigate]);


  // --- Lógica para el modal de detalles del producto ---
  const handleOpenProductDetails = useCallback((product) => {
    setSelectedProduct(product);
    setIsProductDetailsModalOpen(true);
  }, []);

  const handleCloseProductDetails = useCallback(() => {
    setIsProductDetailsModalOpen(false);
    setSelectedProduct(null);
  }, []);

  // --- Funciones de navegación del footer ---
  const handleOpenPowaContactForm = useCallback(() => {
    setCurrentPage('contact');
    navigate('/contact');
  }, [navigate]);

  const handleClosePowaContactForm = useCallback(() => {
    setCurrentPage('home');
    navigate('/');
  }, [navigate]);

  const handleOpenAdminLoginFromFooter = useCallback(() => {
    setCurrentPage('login-admin');
    navigate('/login-admin');
  }, [navigate]);

  const handleGoToHome = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleGoToProducts = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleGoToBranches = useCallback(() => {
    showNotification("Funcionalidad de 'Nuestras Sucursales' aún no implementada.", "info");
  }, [showNotification]);

  const handleGoToFAQ = useCallback(() => {
    showNotification("Funcionalidad de 'Preguntas Frecuentes' aún no implementada.", "info");
  }, [showNotification]);

  // Estado de carga general de la aplicación
  const isLoadingApp = loadingProducts || isLoadingAuth;

  if (isLoadingApp) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
        <div className="w-full mb-12 mt-24 flex justify-center">
          <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-9xl font-extrabold drop-shadow-2xl text-center">
            <span className="inline-flex items-center gap-4 text-transparent bg-clip-text bg-gradient-to-br from-amber-700 via-orange-600 to-yellow-500 dark:from-amber-500 dark:via-orange-400 dark:to-yellow-300">
              La Abu Matie App
            </span>
          </h1>
        </div>
        <div className="flex items-center justify-center mt-8">
          <Loader2 className="animate-spin text-amber-500 dark:text-amber-300" size={64} />
        </div>
        <p className="text-xl font-semibold text-gray-700 dark:text-gray-300 mt-8 animate-pulse">
          Cargando los sabores caseros de La Abu Matie...
        </p>
      </div>
    );
  }

  // Este 'error' viene de useProducts, no de la inicialización de Firebase
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 dark:text-red-400">
        <p className="text-xl font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <HelmetProvider> {/* HelmetProvider debe envolver el componente App en main.jsx, pero aquí está bien si se usa solo Helmet */}
      <div className="min-h-screen p-4 sm:p-6 lg:p-8">
        {/* Helmet para SEO global */}
        <Helmet>
          {/* Título: Más específico, incluyendo ubicación y tipo de negocio */}
          <title>La Abu Matie - Rotisería, Pizzería y Comida Casera en Villa La Florida, Quilmes | Delivery</title>
          <meta name="google-site-verification" content="ioSAJYeZVo6gFB7LYe3EuoTKp1d7nlEZ3XZzcwfx55s" />

          {/* Descripción: Incluye servicios clave, ubicación y palabras clave de cola larga */}
          <meta name="description" content="Pide las mejores milanesas, empanadas, pastas y pizzas caseras en La Abu Matie App. Ofrecemos delivery rápido y confiable en Villa La Florida, San Francisco Solano, Quilmes Oeste y Bernal Oeste. ¡Tu rotisería y pizzería de confianza con sabor casero a tu puerta!" />

          {/* Keywords: Amplía las variaciones locales y tipos de comida, incluyendo sinónimos y ubicaciones específicas */}
          <meta name="keywords" content="comida casera, milanesas, empanadas, pastas, pizzas, delivery, La Abu Matie, Villa La Florida, Quilmes, San Francisco Solano, rotisería, pizzería, comida a domicilio, zona sur, Bernal Oeste, Quilmes Oeste, viandas caseras, menú diario, platos elaborados" />

          {/* Canonical: Tu URL de hosting real y principal */}
          <link rel="canonical" href="https://la-abu-matie-app.web.app/" />

          {/* Open Graph / Redes Sociales (ajusta títulos y descripciones para redes) */}
          <meta property="og:title" content="La Abu Matie - Rotisería, Pizzería y Comida Casera en Villa La Florida, Quilmes" />
          <meta property="og:description" content="Pide las mejores milanesas, empanadas, pastas y pizzas caseras en La Abu Matie App. Delivery en Villa La Florida, San Francisco Solano, Quilmes y alrededores. ¡Sabor casero a tu puerta!" />
          <meta property="og:image" content="https://la-abu-matie-app.web.app/LaAbuMatieLogo.jpeg" /> {/* URL absoluta de tu logo */}
          <meta property="og:url" content="https://la-abu-matie-app.web.app/" />
          <meta property="og:type" content="website" />

          {/* Twitter Card (ajusta títulos y descripciones para Twitter) */}
          <meta name="twitter:card" content="summary_large_image" />
          <meta name="twitter:title" content="La Abu Matie - Rotisería, Pizzería y Comida Casera en Villa La Florida, Quilmes" />
          <meta name="twitter:description" content="Pide las mejores milanesas, empanadas, pastas y pizzas caseras en La Abu Matie App. Delivery en Villa La Florida, San Francisco Solano, Quilmes y alrededores. ¡Sabor casero a tu puerta!" />
          <meta name="twitter:image" content="https://la-abu-matie-app.web.app/LaAbuMatieLogo.jpeg" /> {/* URL absoluta de tu logo */}
        </Helmet>

        <Routes>
          <Route path="/" element={
            <>
              {/* Botones flotantes de Dark Mode, Admin Dashboard y Logout */}
              <div className="fixed top-6 left-6 flex space-x-4 sm:space-x-8 z-50">
                <button
                  onClick={toggleDarkMode}
                  className="bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 p-3 rounded-full shadow-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 dark:focus:ring-600"
                  aria-label="Alternar modo oscuro"
                >
                  {isDarkMode ? <Sun size={24} /> : <Moon size={24} />}
                </button>
                {userProfile?.role === 'admin' && (
                  <button
                    onClick={() => { setCurrentPage('dashboard-admin'); navigate('/dashboard-admin'); }}
                    className="bg-green-600 hover:bg-green-700 text-white p-3 rounded-full shadow-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300"
                    aria-label="Ir al Panel de Administración"
                  >
                    <LayoutDashboard size={24} />
                  </button>
                )}
                {userProfile?.role === 'admin' && (
                  <button
                    onClick={handleAdminLogout}
                    className="bg-red-500 hover:bg-red-600 text-white p-3 rounded-full shadow-lg transition-colors duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
                    aria-label="Cerrar sesión de administrador"
                  >
                    <LogOut size={24} />
                  </button>
                )}
              </div>

              {/* Botón del carrito flotante */}
              <button
                onClick={() => setIsCartModalOpen(true)}
                className={`fixed bottom-24 right-6 text-white p-3 rounded-full shadow-lg text-xl font-bold flex items-center gap-2 z-40 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4
                  ${cartItems.length > 0
                    ? 'bg-red-600 hover:bg-red-700 focus:ring-red-300 animate-jiggle'
                    : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-300'
                  }
                `}
                aria-label={`Abrir carrito, ${cartItems.length} productos`}
              >
                <ShoppingCart size={24} />
                <span className="hidden sm:inline">({cartItems.length})</span>
                <span className="sm:hidden">{cartItems.length}</span>
              </button>


              {/* Botón de Scroll to Top */}
              {showScrollToTopButton && (
                <button
                  onClick={scrollToTop}
                  className="fixed bottom-40 right-6 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-40 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
                  aria-label="Desplazarse hacia arriba"
                >
                  <ArrowUp size={24} />
                </button>
              )}

              {/* Contenido principal de la página de inicio */}
              <div className="w-full mt-24 sm:mt-28 md:mt-32 mb-12 flex flex-col sm:flex-row justify-center items-center gap-4">
                <img
                  src="/LaAbuMatieLogo.jpeg"
                  alt="Logo de La Abu Matie App"
                  className="h-24 w-24 sm:h-28 sm:w-28 md:h-32 md:w-32 lg:h-36 lg:w-36 xl:h-46 xl:w-46 object-cover animate-pizza-jiggle rounded-full border-4 border-orange-500 dark:border-orange-300 shadow-lg"
                  onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/100x100/A0522D/F0F8FF?text=Logo+La+Abu+Matie"; }}
                />
                <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-9xl xl:text-9xl font-extrabold drop-shadow-2xl text-center">
                  <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-br from-amber-700 via-orange-600 to-yellow-500 dark:from-amber-500 dark:via-orange-400 dark:to-yellow-300">
                    La Abu Matie App
                  </span>
                </h1>
              </div>

              {/* Sección de Instrucciones de Pedido */}
              <section className="max-w-4xl mx-auto my-16 p-8 bg-gradient-to-br from-yellow-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl shadow-xl border border-yellow-200 dark:border-gray-600 animate-fade-in-down">
                <h2 className="text-4xl font-bold text-center text-orange-700 dark:text-orange-300 mb-8 drop-shadow-md">
                  ¡Así de Fácil es Pedir!
                </h2>
                <p className="text-lg text-gray-700 dark:text-gray-300 text-center mb-10">
                  Sigue estos simples pasos para disfrutar de nuestros deliciosos sabores caseros:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
                  {/* Paso 1 */}
                  <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transform hover:scale-105 transition-transform duration-300">
                    <div className="bg-red-500 text-white p-4 rounded-full mb-4 shadow-md">
                      <MousePointerClick size={36} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">1. Elige tus Favoritos</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Explora nuestro menú y presiona el botón "Añadir al Carrito" en los productos que más te gusten.
                    </p>
                  </div>
                  {/* Paso 2 */}
                  <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transform hover:scale-105 transition-transform duration-300">
                    <div className="bg-emerald-500 text-white p-4 rounded-full mb-4 shadow-md">
                      <ShoppingCart size={36} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">2. Revisa tu Carrito</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Cuando estés listo, haz clic en el icono del carrito (<ShoppingCart size={20} className="inline-block" />) en la esquina inferior derecha para ver tu selección.
                    </p>
                  </div>
                  {/* Paso 3 */}
                  <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transform hover:scale-105 transition-transform duration-300">
                    <div className="bg-purple-500 text-white p-4 rounded-full mb-4 shadow-md">
                      <FileText size={36} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">3. Confirma y Envía</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Desde el carrito, presiona "Realizar Pedido" y sigue las sencillas instrucciones para completar tu compra. ¡Listo!
                    </p>
                  </div>
                </div>
                <div className="mt-10 text-center text-gray-800 dark:text-gray-200 text-lg font-medium flex items-center justify-center gap-2">
                  <CheckCircle size={24} className="text-green-500" />
                  ¡Prepara tu paladar para el sabor casero de La Abu Matie!
                </div>
              </section>

              {/* Sección de Información sobre Reseñas y Calificaciones */}
              <section className="max-w-4xl mx-auto my-16 p-8 bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 rounded-3xl shadow-xl border border-blue-200 dark:border-gray-600 animate-fade-in-down">
                <h2 className="text-4xl font-bold text-center text-blue-700 dark:text-blue-300 mb-8 drop-shadow-md">
                  ¡Tu Opinión Cuenta!
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-center items-center">
                  {/* Cómo dejar una reseña */}
                  <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transform hover:scale-105 transition-transform duration-300">
                    <div className="bg-indigo-500 text-white p-4 rounded-full mb-4 shadow-md">
                      <Star size={36} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Califica y Comenta</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Haz clic en cualquier producto para ver sus detalles. Allí, encontrarás una sección para dejar tu calificación con estrellas y un comentario. ¡Ayúdanos a mejorar!
                    </p>
                  </div>
                  {/* Proceso de aprobación */}
                  <div className="flex flex-col items-center p-6 bg-white dark:bg-gray-900 rounded-2xl shadow-lg border border-gray-100 dark:border-gray-700 transform hover:scale-105 transition-transform duration-300">
                    <div className="bg-green-500 text-white p-4 rounded-full mb-4 shadow-md">
                      <CheckCircle size={36} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Reseñas Aprobadas</h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Todas las reseñas son importantes para nosotros. Para mantener la calidad, serán revisadas por nuestro equipo y se publicarán una vez aprobadas. ¡Gracias por tu paciencia!
                    </p>
                  </div>
                </div>
              </section>

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
                      className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-700 dark:to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-800 dark:hover:to-emerald-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300 dark:focus:ring-900"
                      aria-expanded={categoriasAbiertas['Favoritos']}
                    >
                      <span className="capitalize flex items-center gap-2">
                        <Heart size={28} className="text-emerald-300 fill-current" /> Favoritos ({favoriteProducts.length})
                      </span>
                      <span className="text-3xl transition-transform duration-300 transform">
                        {categoriasAbiertas['Favoritos'] ? '−' : '+'}
                      </span>
                    </button>

                    {categoriasAbiertas['Favoritos'] && (
                      <div className="p-6 sm:p-8 animate-fade-in-down">
                        {/* Buscador de productos dentro del acordeón de Favoritos */}
                        <div className="max-w-xl mx-auto mb-6 relative">
                          <input
                            type="text"
                            id="app-search-input-favorites"
                            name="search"
                            placeholder="Busca en tus favoritos..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full p-4 pl-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-400 shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                          />
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={24} />
                        </div>
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
                        className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-700 dark:to-amber-800 hover:from-amber-600 hover:to-amber-700 dark:hover:from-amber-800 dark:hover:to-amber-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-900"
                        aria-expanded={categoriasAbiertas[categoria]}
                      >
                        <span className="capitalize flex items-center gap-2">
                          {categoria} ({productos.length})
                        </span>
                        <span className="text-3xl transition-transform duration-300 transform">
                          {categoriasAbiertas[categoria] ? '−' : '+'}
                        </span>
                      </button>

                      {categoriasAbiertas[categoria] && (
                        <div className="p-6 sm:p-8 animate-fade-in-down">
                          {/* Buscador de productos dentro del acordeón de la categoría */}
                          <div className="max-w-xl mx-auto mb-6 relative">
                            <input
                              type="text"
                              id={`app-search-input-${categoria.replace(/\s+/g, '-')}`}
                              name="search"
                              placeholder={`Busca en ${categoria}...`}
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full p-4 pl-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-400 shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                            />
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400" size={24} />
                          </div>
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

              {/* Modales */}
              {isCartModalOpen && (
                <ShoppingCartModal
                  cartItems={cartItems}
                  onClose={() => setIsCartModalOpen(false)}
                  onIncreaseQuantity={handleIncreaseQuantity}
                  onDecreaseQuantity={handleDecreaseQuantity}
                  onRemoveItem={handleRemoveItem}
                  onClearCart={handleClearCart}
                  onViewSummary={handleViewSummaryFromCart}
                  showNotification={showNotification}
                />
              )}

              {isOrderSummaryModalOpen && currentOrder && (
                <OrderSummaryModal
                  order={currentOrder}
                  onClose={() => {
                    setIsOrderSummaryModalOpen(false);
                    setCurrentOrder(null);
                  }}
                  onBack={handleGoBackToCart}
                  onContinue={currentOrder?.customerInfo ? () => {
                    setIsOrderSummaryModalOpen(false);
                    setCurrentOrder(null);
                    navigate('/');
                  } : handleContinueToForm}
                  showNotification={showNotification}
                />
              )}

              {isOrderFormModalOpen && (
                <OrderFormModal
                  cartItems={cartItems}
                  onClose={() => setIsOrderFormModalOpen(false)}
                  onBack={handleGoBackToCart}
                  onSendOrder={(data) => {
                    handleSendOrder(data);
                  }}
                  showNotification={showNotification}
                  existingOrdersCount={existingOrdersCount}
                />
              )}

              {isProductDetailsModalOpen && selectedProduct && (
                <ProductDetailsModal
                  product={selectedProduct}
                  onClose={handleCloseProductDetails}
                  onAddToCart={handleAddToCart}
                  db={db}
                  appId={actualFirebaseProjectId}
                  userId={userId}
                  showNotification={showNotification}
                  userProfile={userProfile}
                />
              )}

              <ToastNotification
                key={toast.id}
                message={toast.message}
                type={toast.type}
                duration={toast.duration}
              />

              <Footer
                onOpenPowaContactForm={handleOpenPowaContactForm}
                onOpenAdminLogin={handleOpenAdminLoginFromFooter}
                userProfile={userProfile}
                onGoToHome={handleGoToHome}
                onGoToProducts={handleGoToProducts}
                onGoToBranches={handleGoToBranches}
                onGoToFAQ={handleGoToFAQ}
              />
            </>
          }
          />

          <Route
            path="/login-admin"
            element={<AdminLogin onLogin={handleAdminLogin} onClose={() => navigate('/')} />}
          />

          <Route
            path="/dashboard-admin"
            element={
              userProfile?.role === 'admin' ? (
                <AdminDashboard
                  db={db}
                  appId={actualFirebaseProjectId}
                  onLogout={handleAdminLogout}
                  showNotification={showNotification}
                  onGoToHome={() => navigate('/')}
                  hasShownAdminWelcome={hasShownAdminWelcome}
                  setHasShownAdminWelcome={setHasShownAdminWelcome}
                  firebaseConfig={firebaseConfig} // AÑADIDO: Pasando firebaseConfig
                />
              ) : (
                <AdminLogin
                  onLogin={handleAdminLogin}
                  onClose={() => { showNotification('Acceso denegado: No eres administrador.', 'error'); navigate('/'); }}
                />
              )
            }
          />

          <Route
            path="/contact"
            element={<PowaContactForm onClose={() => navigate('/')} showNotification={showNotification} />}
          />

          <Route path="*" element={<h2 className="text-3xl font-bold text-center mt-10">404 - Página No Encontrada</h2>} />
        </Routes>
      </div>
    </HelmetProvider>
  );
}

export default App;