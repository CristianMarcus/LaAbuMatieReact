import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDocs, writeBatch, where, setDoc } from 'firebase/firestore';
import ProductForm from './ProductForm';
// Importaciones de iconos de Lucide React: Añadidos AlertTriangle, BadgeAlert, CheckCheck, Loader2, List, ImageOff, Search
import { Edit, Trash2, PlusCircle, ShoppingBag, Box, LogOut, Filter, Home, MessageSquare, BarChart2, DollarSign, ListOrdered, TrendingUp, Eraser, UploadCloud, AlertTriangle, BadgeAlert, Star, Loader2, CheckCheck, List, ImageOff, Search } from 'lucide-react';


// Componente para el modal de confirmación genérico
const ConfirmationModal = ({ isOpen, message, onConfirm, onCancel, confirmText = "Confirmar", cancelText = "Cancelar" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-[100]"> {/* Z-index alto */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm text-center">
        <p className="text-gray-900 dark:text-gray-100 text-lg mb-6">{message}</p>
        <div className="flex justify-center space-x-4">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 rounded-md transition-colors duration-200"
          >
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition-colors duration-200"
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};


// Componente para el modal de importación JSON
const JsonImportModal = ({ onClose, onImport, showNotification, isImporting }) => {
  const fileInputRef = useRef(null);
  const [fileName, setFileName] = useState('');

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFileName(file.name);
    } else {
      setFileName('');
    }
  };

  const handleUploadClick = () => {
    if (!fileInputRef.current?.files[0]) {
      showNotification("Por favor, selecciona un archivo JSON primero.", "warning");
      return;
    }
    const file = fileInputRef.current.files[0];
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result);
        onImport(json);
      } catch (error) {
        showNotification("Error al parsear el archivo JSON. Asegúrate de que es un JSON válido.", "error");
        console.error("Error parsing JSON file:", error);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
          aria-label="Cerrar modal de importación"
        >
          <XCircle size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Importar Productos (JSON)</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          Sube un archivo JSON con tus productos. El formato debe ser un array de objetos de producto.
        </p>
        <input
          type="file"
          accept=".json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="w-full text-gray-700 dark:text-gray-50 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800"
        />
        {fileName && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Archivo seleccionado: {fileName}</p>}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleUploadClick}
            disabled={isImporting}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isImporting && <Loader2 size={20} className="animate-spin mr-2" />}
            {isImporting ? 'Importando...' : 'Importar'}
          </button>
        </div>
      </div>
    </div>
  );
};


const AdminDashboard = ({ db, appId, onLogout, showNotification, onGoToHome, hasShownAdminWelcome, setHasShownAdminWelcome, firebaseConfig }) => { // firebaseConfig es necesario aquí
  const [activeTab, setActiveTab] = useState('products'); // 'products', 'orders', 'reviews', 'metrics'
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProductFormOpen, setIsProductFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  // Estados para los modales de confirmación
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(() => () => {}); // Función a ejecutar al confirmar

  // Estado para filtros de órdenes
  const [orderFilterStatus, setOrderFilterStatus] = useState('all'); // 'all', 'pending', 'processing', 'completed', 'cancelled'
  const [orderFilterDelivery, setOrderFilterDelivery] = useState('all'); // 'all', 'pickup', 'delivery'

  // Estado para filtros de reseñas
  const [reviewFilterRating, setReviewFilterRating] = useState('all'); // 'all', '1', '2', '3', '4', '5'
  const [reviewFilterStatus, setReviewFilterStatus] = useState('all'); // 'all', 'pending', 'approved'

  // Estado para productos destacados manualmente
  const [manualFeaturedProductIds, setManualFeaturedProductIds] = useState([]);

  // NUEVOS ESTADOS PARA FILTROS DE PRODUCTOS
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [productCategoryFilter, setProductCategoryFilter] = useState('all');


  // Mensaje de bienvenida para el administrador
  useEffect(() => {
    if (!hasShownAdminWelcome) {
      showNotification('¡Bienvenido al Panel de Administración!', 'info', 5000);
      setHasShownAdminWelcome(true);
    }
  }, [hasShownAdminWelcome, setHasShownAdminWelcome, showNotification]);


  // Cargar productos
  useEffect(() => {
    if (!db) return;
    setLoading(true);
    const productsColRef = collection(db, `artifacts/${appId}/public/data/products`);
    const unsubscribe = onSnapshot(productsColRef, (snapshot) => {
      const productsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(productsData);
      setLoading(false);
    }, (err) => {
      console.error("Error al cargar productos:", err);
      setError("Error al cargar productos.");
      setLoading(false);
      showNotification("Error al cargar productos.", "error");
    });
    return () => unsubscribe();
  }, [db, appId, showNotification]);

  // Cargar órdenes
  useEffect(() => {
    if (!db) return;
    const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
    let q = query(ordersColRef);

    if (orderFilterStatus !== 'all') {
      q = query(q, where('status', '==', orderFilterStatus));
    }
    if (orderFilterDelivery !== 'all') {
      q = query(q, where('deliveryMethod', '==', orderFilterDelivery));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(ordersData.sort((a, b) => (b.createdAt?.toDate() || 0) - (a.createdAt?.toDate() || 0))); // Order by createdAt
    }, (err) => {
      console.error("Error al cargar órdenes:", err);
      showNotification("Error al cargar órdenes.", "error");
    });
    return () => unsubscribe();
  }, [db, appId, orderFilterStatus, orderFilterDelivery, showNotification]);

  // Cargar reseñas
  useEffect(() => {
    if (!db) return;
    const reviewsColRef = collection(db, `artifacts/${appId}/public/data/product_reviews`);
    let q = query(reviewsColRef);

    if (reviewFilterRating !== 'all') {
      q = query(q, where('rating', '==', parseInt(reviewFilterRating)));
    }
    if (reviewFilterStatus === 'pending') {
      q = query(q, where('approved', '==', false));
    } else if (reviewFilterStatus === 'approved') {
      q = query(q, where('approved', '==', true));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setReviews(reviewsData.sort((a, b) => (b.timestamp?.toDate() || 0) - (a.timestamp?.toDate() || 0))); // Order by timestamp
    }, (err) => {
      console.error("Error al cargar reseñas:", err);
      showNotification("Error al cargar reseñas.", "error");
    });
    return () => unsubscribe();
  }, [db, appId, reviewFilterRating, reviewFilterStatus, showNotification]);

  // Cargar IDs de productos destacados manualmente
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
    });
    return unsubscribe;
  }, [db, appId]);


  // CRUD de Productos
  const handleAddProduct = useCallback(() => {
    setEditingProduct(null);
    setIsProductFormOpen(true);
  }, []);

  const handleEditProduct = useCallback((product) => {
    setEditingProduct(product);
    setIsProductFormOpen(true);
  }, []);

  const handleSaveProduct = useCallback(async (productData) => {
    try {
      if (editingProduct) {
        const productRef = doc(db, `artifacts/${appId}/public/data/products`, editingProduct.id);
        await updateDoc(productRef, productData);
        showNotification('Producto actualizado con éxito.', 'success');
      } else {
        const productsColRef = collection(db, `artifacts/${appId}/public/data/products`);
        await addDoc(productsColRef, productData);
        showNotification('Producto añadido con éxito.', 'success');
      }
      setIsProductFormOpen(false);
      setEditingProduct(null);
    } catch (e) {
      console.error("Error al guardar producto:", e);
      showNotification(`Error al guardar producto: ${e.message}`, 'error');
    }
  }, [db, appId, editingProduct, showNotification]);

  const handleDeleteProduct = useCallback((productId) => {
    setConfirmMessage('¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.');
    setConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/products`, productId));
        showNotification('Producto eliminado con éxito.', 'success');
      } catch (e) {
        console.error("Error al eliminar producto:", e);
        showNotification(`Error al eliminar producto: ${e.message}`, 'error');
      } finally {
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  }, [db, appId, showNotification]);

  // CRUD de Órdenes
  const handleUpdateOrderStatus = useCallback(async (orderId, newStatus) => {
    try {
      const orderRef = doc(db, `artifacts/${appId}/public/data/orders`, orderId);
      await updateDoc(orderRef, { status: newStatus });
      showNotification(`Estado de la orden ${orderId.substring(0, 5)}... actualizado a "${newStatus}".`, 'success');
    } catch (e) {
      console.error("Error al actualizar estado de orden:", e);
      showNotification(`Error al actualizar estado de orden: ${e.message}`, 'error');
    }
  }, [db, appId, showNotification]);

  const handleClearAllOrders = useCallback(() => {
    setConfirmMessage('¿Estás seguro de que quieres eliminar TODAS las órdenes completadas y canceladas?');
    setConfirmAction(() => async () => {
      try {
        const ordersColRef = collection(db, `artifacts/${appId}/public/data/orders`);
        const q = query(ordersColRef, where('status', 'in', ['completed', 'cancelled']));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        snapshot.docs.forEach(doc => {
          batch.delete(doc.ref);
        });
        await batch.commit();
        showNotification('Órdenes completadas y canceladas eliminadas.', 'success');
      } catch (e) {
        console.error("Error al limpiar órdenes:", e);
        showNotification(`Error al limpiar órdenes: ${e.message}`, 'error');
      } finally {
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  }, [db, appId, showNotification]);

  // Gestión de Reseñas
  const handleApproveReview = useCallback(async (reviewId) => {
    try {
      const reviewRef = doc(db, `artifacts/${appId}/public/data/product_reviews`, reviewId);
      await updateDoc(reviewRef, { approved: true });
      showNotification('Reseña aprobada con éxito.', 'success');
    } catch (e) {
      console.error("Error al aprobar reseña:", e);
      showNotification(`Error al aprobar reseña: ${e.message}`, 'error');
    }
  }, [db, appId, showNotification]);

  const handleRejectReview = useCallback((reviewId) => {
    setConfirmMessage('¿Estás seguro de que quieres eliminar esta reseña? Esto la rechazará permanentemente.');
    setConfirmAction(() => async () => {
      try {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/product_reviews`, reviewId));
        showNotification('Reseña eliminada/rechazada con éxito.', 'info');
      } catch (e) {
        console.error("Error al rechazar reseña:", e);
        showNotification(`Error al rechazar reseña: ${e.message}`, 'error');
      } finally {
        setIsConfirmModalOpen(false);
      }
    });
    setIsConfirmModalOpen(true);
  }, [db, appId, showNotification]);


  // Importación de productos JSON
  const handleImportProducts = useCallback(async (jsonData) => {
    setIsImporting(true);
    try {
      const batch = writeBatch(db);
      const productsColRef = collection(db, `artifacts/${appId}/public/data/products`);
      for (const productData of jsonData) {
        const docRef = productData.id ? doc(productsColRef, productData.id) : doc(productsColRef);
        const productToSave = {
          ...productData,
          precio: Number(productData.precio) || 0,
          stock: Number(productData.stock) || 0,
          sauces: productData.category === 'Pastas' && Array.isArray(productData.sauces)
            ? productData.sauces.map(s => ({
                id: s.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
                name: s.name || '',
                price: Number(s.price) || 0,
                isFree: s.isFree || false,
              }))
            : [],
          flavors: productData.category === 'Pastas' && Array.isArray(productData.flavors) // AÑADIDO: Importar sabores
            ? productData.flavors.map(f => ({
                id: f.id || Date.now().toString() + Math.random().toString(36).substring(2, 9),
                name: f.name || '',
              }))
            : [],
        };
        batch.set(docRef, productToSave, { merge: true });
      }
      await batch.commit();
      showNotification(`Se importaron ${jsonData.length} productos con éxito.`, 'success', 5000);
      setIsImportModalOpen(false);
    } catch (e) {
      console.error("Error al importar productos:", e);
      showNotification(`Error al importar productos: ${e.message}`, 'error', 7000);
    } finally {
      setIsImporting(false);
    }
  }, [db, appId, showNotification]);

  // Gestión de productos destacados manualmente
  const handleToggleManualFeatured = useCallback(async (productId, isCurrentlyFeatured) => {
    try {
      const featuredConfigDocRef = doc(db, `artifacts/${appId}/public/data/featured_products_config/manual_selection`);
      let updatedFeaturedIds;

      if (isCurrentlyFeatured) {
        updatedFeaturedIds = manualFeaturedProductIds.filter(id => id !== productId);
        showNotification('Producto quitado de destacados manuales.', 'info', 1500);
      } else {
        updatedFeaturedIds = [...manualFeaturedProductIds, productId];
        showNotification('Producto añadido a destacados manuales.', 'success', 1500);
      }
      await setDoc(featuredConfigDocRef, { productIds: updatedFeaturedIds });
    } catch (e) {
      console.error("Error al actualizar productos destacados manuales:", e);
      showNotification(`Error al actualizar destacados: ${e.message}`, 'error');
    }
  }, [db, appId, manualFeaturedProductIds, showNotification]);

  // FILTRADO DE PRODUCTOS
  const filteredProducts = useMemo(() => {
    let currentProducts = products;

    // Aplicar filtro por término de búsqueda
    if (productSearchTerm) {
      const lowerCaseSearchTerm = productSearchTerm.toLowerCase();
      currentProducts = currentProducts.filter(
        (product) =>
          (product.name && product.name.toLowerCase().includes(lowerCaseSearchTerm)) ||
          (product.descripcion && product.descripcion.toLowerCase().includes(lowerCaseSearchTerm))
      );
    }

    // Aplicar filtro por categoría
    if (productCategoryFilter !== 'all') {
      currentProducts = currentProducts.filter(
        (product) => product.category === productCategoryFilter
      );
    }

    return currentProducts;
  }, [products, productSearchTerm, productCategoryFilter]);


  // Métricas calculadas
  const totalSales = useMemo(() => {
    return orders.filter(order => order.status === 'completed').reduce((sum, order) => sum + order.total, 0);
  }, [orders]);

  const totalPendingOrders = useMemo(() => {
    return orders.filter(order => order.status === 'pending' || order.status === 'processing').length;
  }, [orders]);

  const totalProducts = products.length;

  const averageRating = useMemo(() => {
    const approvedReviews = reviews.filter(review => review.approved);
    if (approvedReviews.length === 0) return 'N/A';
    const sum = approvedReviews.reduce((acc, review) => acc + review.rating, 0);
    return (sum / approvedReviews.length).toFixed(1);
  }, [reviews]);

  // NUEVAS MÉTRICAS
  const lowStockProducts = useMemo(() => {
    return products.filter(product => product.stock > 0 && product.stock <= 5).length;
  }, [products]);

  const totalApprovedReviews = useMemo(() => {
    return reviews.filter(review => review.approved).length;
  }, [reviews]);


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-gray-100">
        <Loader2 size={48} className="animate-spin text-purple-500" />
        <p className="ml-4 text-xl">Cargando panel de administración...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-red-400 p-4">
        <AlertTriangle size={48} className="mb-4" />
        <p className="text-xl font-semibold mb-2">Error al cargar el panel:</p>
        <p className="text-lg text-center">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-6 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-md transition-colors"
        >
          Recargar Página
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col lg:flex-row">
      {/* Sidebar de navegación */}
      <aside className="bg-gray-900 w-full lg:w-64 p-6 lg:p-4 border-b border-gray-700 lg:border-r lg:border-b-0 flex flex-col justify-between">
        <div>
          <h1 className="text-3xl font-bold text-purple-400 mb-6 text-center lg:text-left">Admin Panel</h1>
          <nav>
            <ul>
              <li className="mb-3">
                <button
                  onClick={() => setActiveTab('products')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'products' ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  <Box size={20} className="mr-3" /> Gestión de Productos
                </button>
              </li>
              <li className="mb-3">
                <button
                  onClick={() => setActiveTab('orders')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'orders' ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  <ListOrdered size={20} className="mr-3" /> Gestión de Órdenes
                </button>
              </li>
              <li className="mb-3">
                <button
                  onClick={() => setActiveTab('reviews')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'reviews' ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  <MessageSquare size={20} className="mr-3" /> Gestión de Reseñas
                </button>
              </li>
              <li className="mb-3">
                <button
                  onClick={() => setActiveTab('metrics')}
                  className={`w-full text-left flex items-center p-3 rounded-lg transition-colors duration-200 ${activeTab === 'metrics' ? 'bg-purple-700 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}
                >
                  <BarChart2 size={20} className="mr-3" /> Métricas
                </button>
              </li>
            </ul>
          </nav>
        </div>
        <div className="mt-6 lg:mt-auto"> {/* Ajuste de margen superior para móviles */}
          <button
            onClick={onGoToHome}
            className="w-full flex items-center justify-center p-3 rounded-lg bg-gray-700 hover:bg-gray-600 text-white transition-colors duration-200 mb-3"
          >
            <Home size={20} className="mr-2" /> Ir a la Tienda
          </button>
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center p-3 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors duration-200"
          >
            <LogOut size={20} className="mr-2" /> Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="flex-1 p-6 lg:p-8 overflow-y-auto"> {/* Añadido overflow-y-auto para el contenido principal */}
        {/* Gestión de Productos */}
        {activeTab === 'products' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-100 mb-6">Gestión de Productos</h2>
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 space-y-4 sm:space-y-0">
              <button
                onClick={handleAddProduct}
                className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <PlusCircle size={20} /> Añadir Nuevo Producto
              </button>
              <button
                onClick={() => setIsImportModalOpen(true)}
                className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
              >
                <UploadCloud size={20} /> Importar Productos (JSON)
              </button>
            </div>

            {/* NUEVOS FILTROS DE PRODUCTOS */}
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                <div className="relative w-full sm:w-1/2">
                    <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o descripción..."
                        value={productSearchTerm}
                        onChange={(e) => setProductSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500 transition-all duration-200"
                    />
                </div>
                <select
                    value={productCategoryFilter}
                    onChange={(e) => setProductCategoryFilter(e.target.value)}
                    className="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 w-full sm:w-auto"
                >
                    <option value="all">Todas las Categorías</option>
                    <option value="Pizzas">Pizzas</option>
                    <option value="Empanadas">Empanadas</option>
                    <option value="Pastas">Pastas</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Postres">Postres</option>
                    <option value="Combos">Combos</option>
                    <option value="Otros">Otros</option>
                </select>
            </div>


            {filteredProducts.length === 0 && !loading && (
                <p className="text-center text-gray-400 mt-10">No hay productos para mostrar con los filtros actuales.</p>
            )}

            {filteredProducts.length > 0 && (
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-200">
                            <tr>
                                <th scope="col" className="px-6 py-3">Imagen</th><th scope="col" className="px-6 py-3">Nombre</th><th scope="col" className="px-6 py-3">Categoría</th><th scope="col" className="px-6 py-3">Precio</th><th scope="col" className="px-6 py-3">Stock</th><th scope="col" className="px-6 py-3 text-center">Salsas</th><th scope="col" className="px-6 py-3 text-center">Sabores</th><th scope="col" className="px-6 py-3 text-center">Destacado Manual</th><th scope="col" className="px-6 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map((product) => { // Usar filteredProducts aquí
                                const isManuallyFeatured = manualFeaturedProductIds.includes(product.id);
                                return (
                                    <tr key={product.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                        <td className="px-6 py-4">
                                            {product.image ? (
                                                <img src={product.image} alt={product.name} className="w-16 h-16 object-cover rounded-md" />
                                            ) : (
                                                <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-md text-gray-500 dark:text-gray-400">
                                                    <ImageOff size={24} />
                                                </div>
                                            )}
                                        </td><td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-gray-100">{product.name}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.category || 'N/A'}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">${Math.floor(product.precio || 0)}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">{product.stock}</td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 text-center">
                                            {product.category === 'Pastas' && product.sauces && product.sauces.length > 0 ? (
                                                <List size={20} className="inline-block text-blue-500" title="Tiene salsas" />
                                            ) : (
                                                '-'
                                            )}
                                        </td><td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300 text-center">
                                            {product.category === 'Pastas' && product.flavors && product.flavors.length > 0 ? (
                                                <List size={20} className="inline-block text-purple-500" title="Tiene sabores" />
                                            ) : (
                                                '-'
                                            )}
                                        </td><td className="px-6 py-4 whitespace-nowrap text-center">
                                                <button
                                                    onClick={() => handleToggleManualFeatured(product.id, isManuallyFeatured)}
                                                    className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2
                                                      ${isManuallyFeatured
                                                        ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600 dark:bg-yellow-700 dark:hover:bg-yellow-600 dark:text-yellow-100 focus:ring-yellow-300'
                                                        : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-300 focus:ring-gray-300'
                                                      }`}
                                                >
                                                    <Star size={20} className={isManuallyFeatured ? "fill-current" : ""} />
                                                </button>
                                            </td><td className="px-6 py-4 text-center whitespace-nowrap">
                                            <button
                                                onClick={() => handleEditProduct(product)}
                                                className="font-medium text-blue-600 dark:text-blue-400 hover:underline mr-3"
                                                aria-label={`Editar ${product.name}`}
                                            >
                                                <Edit size={20} className="inline-block" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteProduct(product.id)}
                                                className="font-medium text-red-600 dark:text-red-400 hover:underline"
                                                aria-label={`Eliminar ${product.name}`}
                                            >
                                                <Trash2 size={20} className="inline-block" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        )}

        {/* Gestión de Órdenes */}
        {activeTab === 'orders' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-100 mb-6">Gestión de Órdenes</h2>
            <div className="flex flex-col sm:flex-row gap-4 items-center mb-6">
                <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <select
                        value={orderFilterStatus}
                        onChange={(e) => setOrderFilterStatus(e.target.value)}
                        className="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 w-full sm:w-auto"
                    >
                        <option value="all">Todos los Estados</option>
                        <option value="pending">Pendiente</option>
                        <option value="processing">En preparación</option>
                        <option value="completed">Completado</option>
                        <option value="cancelled">Cancelado</option>
                    </select>
                    <select
                        value={orderFilterDelivery}
                        onChange={(e) => setOrderFilterDelivery(e.target.value)}
                        className="px-4 py-2 rounded-md bg-gray-800 border border-gray-700 text-white focus:ring-purple-500 focus:border-purple-500 transition-all duration-200 w-full sm:w-auto"
                    >
                        <option value="all">Todos los Envíos</option>
                        <option value="pickup">Retiro en Local</option>
                        <option value="delivery">Delivery</option>
                    </select>
                </div>
                <button
                    onClick={handleClearAllOrders}
                    className="w-full sm:w-auto px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-md transition-colors duration-200 flex items-center justify-center gap-2"
                >
                    <Eraser size={20} /> Limpiar Órdenes Finalizadas
                </button>
            </div>

            {orders.length === 0 && (
                <p className="text-center text-gray-400 mt-10">No hay órdenes para mostrar con los filtros actuales.</p>
            )}

            {orders.length > 0 && (
                <div className="overflow-x-auto relative shadow-md sm:rounded-lg">
                    <table className="w-full text-sm text-left text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-200">
                            <tr>
                                <th scope="col" className="px-6 py-3">ID Orden</th><th scope="col" className="px-6 py-3">Cliente</th><th scope="col" className="px-6 py-3">Total</th><th scope="col" className="px-6 py-3">Método de Pago</th><th scope="col" className="px-6 py-3">Envío</th><th scope="col" className="px-6 py-3">Tipo Pedido</th><th scope="col" className="px-6 py-3">Hora Pedido</th><th scope="col" className="px-6 py-3">Estado</th><th scope="col" className="px-6 py-3 text-center">Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.id} className="bg-white border-b dark:bg-gray-800 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                                    <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap dark:text-gray-100">
                                        {order.id.substring(0, 8)}...
                                    </td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">{order.customerInfo?.name || 'N/A'}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">${Math.floor(order.total || 0)}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">{order.paymentMethod === 'cash' ? 'Efectivo' : 'Mercado Pago'}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">{order.deliveryMethod === 'pickup' ? 'Retiro' : 'Delivery'}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">{order.orderType === 'immediate' ? 'Inmediato' : 'Reserva'}</td><td className="px-6 py-4 text-gray-700 dark:text-gray-300">
                                      {order.orderTime ? new Date(order.orderTime).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                                    </td><td className="px-6 py-4">
                                        <select
                                            value={order.status}
                                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                                            className={`px-3 py-1 rounded-md text-sm font-semibold
                                                ${order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100' : ''}
                                                ${order.status === 'processing' ? 'bg-blue-100 text-blue-800 dark:bg-blue-800 dark:text-blue-100' : ''}
                                                ${order.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100' : ''}
                                                ${order.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-800 dark:text-red-100' : ''}
                                                bg-gray-700 text-gray-100 border-gray-600 focus:ring-purple-500 focus:border-purple-500
                                            `}
                                        >
                                            <option value="pending">Pendiente</option>
                                            <option value="processing">En preparación</option>
                                            <option value="completed">Completado</option>
                                            <option value="cancelled">Cancelado</option>
                                        </select>
                                    </td><td className="px-6 py-4 text-center">
                                        {/* Puedes añadir un botón para ver detalles de la orden si lo necesitas */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
          </div>
        )}

        {/* Métricas */}
        {activeTab === 'metrics' && (
          <div>
            <h2 className="text-3xl font-bold text-gray-100 mb-6">Métricas del Negocio</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Ventas Totales</p>
                  <p className="text-2xl font-bold text-green-400">${Math.floor(totalSales)}</p>
                </div>
                <DollarSign size={40} className="text-green-500 opacity-50" />
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Órdenes Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-400">{totalPendingOrders}</p>
                </div>
                <ListOrdered size={40} className="text-yellow-500 opacity-50" />
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Total Productos</p>
                  <p className="text-2xl font-bold text-blue-400">{totalProducts}</p>
                </div>
                <Box size={40} className="text-blue-500 opacity-50" />
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Valoración Promedio</p>
                  <p className="text-2xl font-bold text-purple-400">
                    {averageRating} <Star size={24} className="inline-block fill-current text-yellow-400" />
                  </p>
                  {averageRating === 'N/A' && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      (No hay reseñas aprobadas para calcular el promedio)
                    </p>
                  )}
                </div>
                <TrendingUp size={40} className="text-purple-500 opacity-50" />
              </div>

              {/* NUEVAS MÉTRICAS */}
              <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Productos con Bajo Stock</p>
                  <p className="text-2xl font-bold text-orange-400">{lowStockProducts}</p>
                </div>
                <AlertTriangle size={40} className="text-orange-500 opacity-50" />
              </div>
              <div className="bg-gray-800 p-6 rounded-lg shadow-md flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">Reseñas Aprobadas</p>
                  <p className="text-2xl font-bold text-teal-400">{totalApprovedReviews}</p>
                </div>
                <MessageSquare size={40} className="text-teal-500 opacity-50" />
              </div>

            </div>
          </div>
        )}
      </div>

      {isProductFormOpen && (
        <ProductForm
          product={editingProduct}
          onClose={() => setIsProductFormOpen(false)}
          onSave={handleSaveProduct}
          showNotification={showNotification}
          firebaseConfig={firebaseConfig} // AÑADIDO: Pasando firebaseConfig
          appId={appId} // appId ya está disponible
        />
      )}

      {isImportModalOpen && (
        <JsonImportModal
          onClose={() => setIsImportModalOpen(false)}
          onImport={handleImportProducts}
          showNotification={showNotification}
          isImporting={isImporting}
        />
      )}

      <ConfirmationModal
        isOpen={isConfirmModalOpen}
        message={confirmMessage}
        onConfirm={confirmAction}
        onCancel={() => setIsConfirmModalOpen(false)}
      />
    </div>
  );
};

export default AdminDashboard;
