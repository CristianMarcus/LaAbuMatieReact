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
import { ShoppingCart, Search, Sun, Moon, ArrowUp, Heart, UserCheck, LogOut, LayoutDashboard, Loader2 } from 'lucide-react'; 

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
import { Helmet } from 'react-helmet-async'; 

function App() {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isProductDetailsModalOpen, setIsProductDetailsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState('home');
  const navigate = useNavigate();

  // Configuración de Firebase (ahora obtenida de las variables de entorno)
  const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
  const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' && __firebase_config !== ''
    ? JSON.parse(__firebase_config)
    : {};
  const canvasInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

  // Usa las variables de entorno para la configuración de Firebase
  const localFirebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY, 
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
  };

  const firebaseConfig = Object.keys(canvasFirebaseConfig).length > 0 ? canvasFirebaseConfig : localFirebaseConfig;
  const initialAuthToken = canvasInitialAuthToken;
  const actualFirebaseProjectId = localFirebaseConfig.projectId; 


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
    error,
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
    handleAddToCart,
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

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600 dark:text-red-400">
        <p className="text-xl font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8">
      {/* Helmet para SEO global */}
     <Helmet>
        {/* Título: Más específico, incluyendo ubicación y tipo de negocio */}
        <title>La Abu Matie - Rotisería y Pizzería en Villa La Florida, Quilmes | Comida Casera Delivery</title>
        
        {/* Descripción: Incluye servicios clave y ubicación */}
        <meta name="description" content="Pide las mejores milanesas, empanadas, pastas y pizzas caseras en La Abu Matie App. Delivery en Villa La Florida, San Francisco Solano, Quilmes y alrededores. ¡Sabor casero a tu puerta!" />
        
        {/* Keywords: Añade variaciones locales y tipos de comida */}
        <meta name="keywords" content="comida casera, milanesas, empanadas, pastas, pizzas, delivery, La Abu Matie, Villa La Florida, Quilmes, San Francisco Solano, rotisería, pizzería, comida a domicilio, zona sur" />
        
        {/* Canonical: Tu URL de hosting real */}
        <link rel="canonical" href="https://la-abu-matie-app.web.app/" /> 
        
        {/* Open Graph / Redes Sociales (ajusta títulos y descripciones para redes) */}
        <meta property="og:title" content="La Abu Matie - Rotisería y Pizzería en Villa La Florida, Quilmes" />
        <meta property="og:description" content="Pide las mejores milanesas, empanadas, pastas y pizzas caseras en La Abu Matie App. Delivery en Villa La Florida, San Francisco Solano, Quilmes y alrededores." />
        <meta property="og:image" content="https://la-abu-matie-app.web.app/LaAbuMatieLogo.jpeg" /> {/* URL absoluta de tu logo */}
        <meta property="og:url" content="https://la-abu-matie-app.web.app/" /> 
        <meta property="og:type" content="website" />

        {/* Twitter Card (ajusta títulos y descripciones para Twitter) */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="La Abu Matie - Rotisería y Pizzería en Villa La Florida, Quilmes" />
        <meta name="twitter:description" content="Pide las mejores milanesas, empanadas, pastas y pizzas caseras en La Abu Matie App. Delivery en Villa La Florida, San Francisco Solano, Quilmes y alrededores." />
        <meta name="twitter:image" content="https://la-abu-matie-app.web.app/LaAbuMatieLogo.jpeg" /> {/* URL absoluta de tu logo */}
      </Helmet>

      <Routes>
        <Route path="/" element={
          <>
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

            <button
              onClick={() => setIsCartModalOpen(true)}
              className="fixed bottom-24 right-6 bg-emerald-600 hover:bg-emerald-700 text-white p-3 rounded-full shadow-lg text-xl font-bold flex items-center gap-2 z-40 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-emerald-300" 
              aria-label="Abrir carrito"
            >
              <ShoppingCart size={24} /> 
              <span className="hidden sm:inline">({cartItems.length})</span>
              <span className="sm:hidden">{cartItems.length}</span>
            </button>

            {showScrollToTopButton && (
              <button
                onClick={scrollToTop}
                className="fixed bottom-40 right-6 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg z-40 transition-all duration-300 transform hover:scale-110 focus:outline-none focus:ring-4 focus:ring-blue-300"
                aria-label="Desplazarse hacia arriba"
              >
                <ArrowUp size={24} />
              </button>
            )}

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

            <div className="max-w-xl mx-auto mb-10 relative">
              <input
                type="text"
                id="app-search-input" 
                name="search"    
                placeholder="Busca tu milanesa, empanada o pasta favorita..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-4 pl-12 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-400 shadow-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all" 
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
                    className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-emerald-500 to-emerald-600 dark:from-emerald-700 dark:to-emerald-800 hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-800 dark:hover:to-emerald-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-emerald-300 dark:focus:ring-900" 
                    aria-expanded={categoriasAbiertas['Favoritos']}
                  >
                    <span className="capitalize flex items-center gap-2">
                      <Heart size={28} className="text-emerald-300 fill-current" /> Favoritos
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
                      className="w-full flex justify-between items-center px-6 sm:px-8 py-5 text-left text-3xl font-bold bg-gradient-to-r from-amber-500 to-amber-600 dark:from-amber-700 dark:to-amber-800 hover:from-amber-600 hover:to-amber-700 dark:hover:from-amber-800 dark:hover:to-amber-900 transition-all duration-300 rounded-t-3xl text-white shadow-md focus:outline-none focus:ring-4 focus:ring-amber-300 dark:focus:ring-900" 
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
        } />

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
  );
}

export default App;
