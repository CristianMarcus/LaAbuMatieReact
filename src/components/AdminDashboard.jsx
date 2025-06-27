import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, getDocs, writeBatch, where, setDoc } from 'firebase/firestore'; 
import ProductForm from './ProductForm';
// Importaciones de iconos de Lucide React: Añadidos AlertTriangle, BadgeAlert, CheckCheck, Loader2
import { Edit, Trash2, PlusCircle, ShoppingBag, Box, LogOut, Filter, Home, MessageSquare, BarChart2, DollarSign, ListOrdered, TrendingUp, Eraser, UploadCloud, AlertTriangle, BadgeAlert, Star, Loader2, CheckCheck } from 'lucide-react'; 

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

    reader.onload = (event) => {
      try {
        const productsToImport = JSON.parse(event.target.result);
        if (!Array.isArray(productsToImport)) {
          showNotification("El archivo JSON debe contener un array de productos.", "error");
          return;
        }
        onImport(productsToImport);
      } catch (e) {
        showNotification("Error al parsear el archivo JSON. Asegúrate de que sea válido.", "error");
        console.error("Error al parsear JSON:", e);
      }
    };

    reader.onerror = () => {
      showNotification("Error al leer el archivo.", "error");
    };

    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg sm:max-w-xl animate-scale-in-center">
        <h3 className="text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Importar Productos desde JSON</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-6">Selecciona un archivo JSON que contenga un array de objetos de producto.</p>
        
        <div className="mb-6">
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-900 dark:text-gray-100
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 dark:file:bg-blue-900 file:text-blue-700 dark:file:text-blue-200
                       hover:file:bg-blue-100 dark:hover:file:bg-blue-800"
          />
          {fileName && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Archivo seleccionado: {fileName}</p>}
        </div>

        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isImporting}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancelar
          </button>
          <button
            onClick={handleUploadClick}
            disabled={isImporting || !fileName}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isImporting ? (
              <>
                <Loader2 className="animate-spin" size={20} /> Importando...
              </>
            ) : (
              <>
                <UploadCloud size={20} /> Importar
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


const AdminDashboard = ({ db, appId, onLogout, showNotification, onGoToHome, hasShownAdminWelcome, setHasShownAdminWelcome }) => { 
  // 1. ESTADOS (useState)
  const [activeTab, setActiveTab] = useState('products');
  const [products, setProducts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [mostOrderedProducts, setMostOrderedProducts] = useState([]);
  const [topRevenueProducts, setTopRevenueProducts] = useState([]);   
  
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalOrdersCount, setTotalOrdersCount] = useState(0);
  const [averageOrderValue, setAverageOrderValue] = useState(0);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [clearingOrders, setClearingOrders] = useState(false); 
  const [selectedCategory, setSelectedCategory] = useState('all'); 

  const [selectedMetricsTimeRange, setSelectedMetricsTimeRange] = useState('all');
  const [selectedOrderListTimeRange, setSelectedOrderListTimeRange] = useState('all');
  const [selectedReviewsTimeRange, setSelectedReviewsTimeRange] = useState('all');

  const [isImportModalOpen, setIsImportModalOpen] = useState(false); 
  const [isImportingProducts, setIsImportingProducts] = useState(false); 

  // ESTADOS PARA GESTIÓN DE BAJO STOCK Y DESTACADOS
  const [lowStockProductsAlert, setLowStockProductsAlert] = useState([]); // Productos con stock <= 10
  const [criticalStockProductsAlert, setCriticalStockProductsAlert] = useState([]); // Productos con stock <= 5
  const hasShownLowStockNotificationRef = useRef(false); 
  const [manualFeaturedProductIds, setManualFeaturedProductIds] = useState([]); // IDs de productos destacados manualmente


  // 2. FUNCIONES AUXILIARES PURAS O MEMOIZADAS (useMemo, useCallback para funciones que no usan state/props directamente)

  // Función de ayuda para calcular la fecha de inicio del filtrado
  const getStartDate = useCallback((timeRange) => {
    const now = new Date();
    let startDate = null;

    if (timeRange === '1week') {
      startDate = new Date(now.setDate(now.getDate() - 7));
    } else if (timeRange === '15days') {
      startDate = new Date(now.setDate(now.getDate() - 15));
    } else if (timeRange === '1month') {
      startDate = new Date(now.setMonth(now.getMonth() - 1));
    }
    return startDate ? startDate.toISOString() : null;
  }, []); // No depende de ningún estado o prop, por eso un array vacío


  // useMemo para mapear IDs de productos a sus nombres (MOVIDO MÁS ARRIBA para evitar ReferenceError)
  const productNameMap = useMemo(() => {
    return products.reduce((acc, product) => {
      acc[product.id] = product.name;
      return acc;
    }, {});
  }, [products]); // Depende de la lista de productos


  // Lógica para filtrar productos por categoría (useMemo)
  const uniqueCategories = useMemo(() => {
    const categories = products.map(product => product.category).filter(Boolean);
    return ['all', ...new Set(categories.sort())];
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    let currentProducts = products;

    if (selectedCategory !== 'all') {
      currentProducts = currentProducts.filter(product => product.category === selectedCategory);
    }

    // Ordena por nombre y luego por stock para que los de bajo stock queden juntos si tienen el mismo nombre
    return currentProducts.sort((a, b) => {
      const nameCompare = (a.name || '').localeCompare(b.name || '');
      if (nameCompare !== 0) return nameCompare;
      return a.stock - b.stock; // Para ordenar de menor a mayor stock si los nombres son iguales
    });
  }, [products, selectedCategory]);


  // 3. FUNCIONES MEMOIZADAS CON useCallback (que usan estados, props o useMemo)
  // ESTAS FUNCIONES DEBEN DECLARARSE ANTES DE SER USADAS POR OTRAS FUNCIONES useCallback

  const openProductModal = useCallback((product = null) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  }, []);

  const closeProductModal = useCallback(() => {
    setIsProductModalOpen(false);
    setEditingProduct(null);
  }, []);

  const openImportModal = useCallback(() => setIsImportModalOpen(true), []);
  const closeImportModal = useCallback(() => setIsImportModalOpen(false), []);


  // Función para obtener productos en tiempo real
  const fetchProducts = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para productos.");
      setError("No se puede cargar la base de datos de productos.");
      setLoading(false); 
      return () => {}; 
    }

    const productsCollectionRef = collection(db, `artifacts/${appId}/public/data/products`);
    const unsubscribe = onSnapshot(productsCollectionRef, (snapshot) => {
      const productsData = snapshot.docs.map(doc => {
        const data = doc.data(); // Obtener todos los datos primero
        return {
          id: doc.id,
          name: data.name || 'Producto sin nombre', // Asegurar que 'name' existe
          stock: typeof data.stock === 'number' ? data.stock : 0, // Asegurar que 'stock' es número
          ...data, // Asegurarse de esparcir todos los datos, incluido el 'id'
        };
      });
      
      setProducts(productsData);
      setLoading(false);
      console.log("Productos cargados en AdminDashboard (Firestore):", productsData.length);
    }, (err) => {
      console.error("Error al obtener productos en tiempo real:", err);
      setError("Error al cargar productos: " + err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [db, appId]);

  // Función para obtener pedidos para la LISTA (pestaña de pedidos)
  const fetchOrderListData = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para la lista de pedidos.");
      setError("No se puede cargar la base de datos de pedidos para la lista.");
      setLoading(false);
      return () => {};
    }

    setLoading(true);
    const ordersCollectionRef = collection(db, `artifacts/${appId}/public/data/orders`);
    let q = query(ordersCollectionRef);

    const startDate = getStartDate(selectedOrderListTimeRange);
    if (startDate) {
      q = query(ordersCollectionRef, where("createdAt", ">=", startDate));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setOrders(ordersData.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)));
      console.log(`Pedidos cargados para la lista (filtro '${selectedOrderListTimeRange}'):`, ordersData.length);
      setLoading(false);
    }, (err) => {
      console.error("Error al obtener pedidos en tiempo real para la lista:", err);
      setError("Error al cargar pedidos para la lista: " + err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [db, appId, selectedOrderListTimeRange, getStartDate]); 

  // Función para obtener pedidos y calcular MÉTRICAS (pestaña de métricas)
  const fetchMetricsData = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para métricas.");
      setError("No se puede cargar la base de datos para métricas.");
      return () => {};
    }

    const ordersCollectionRef = collection(db, `artifacts/${appId}/public/data/orders`);
    let q = query(ordersCollectionRef);

    const startDate = getStartDate(selectedMetricsTimeRange);
    if (startDate) {
      q = query(ordersCollectionRef, where("createdAt", ">=", startDate));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ordersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log(`Pedidos cargados para métricas (filtro '${selectedMetricsTimeRange}'):`, ordersData.length);

      let currentTotalRevenue = 0;
      let currentTotalOrdersCount = ordersData.length;
      const productSales = {}; // { productId: { quantity: X, revenue: Y, name: Z } }

      ordersData.forEach(order => {
        const orderTotal = typeof order.total === 'number' ? order.total : (order.cartItems ? order.cartItems.reduce((sum, item) => sum + (item.precio * item.quantity || 0), 0) : 0);
        currentTotalRevenue += orderTotal;

        if (order.cartItems && Array.isArray(order.cartItems)) {
          order.cartItems.forEach(item => {
            if (item.id && item.name && typeof item.quantity === 'number' && typeof item.precio === 'number') {
              if (!productSales[item.id]) {
                productSales[item.id] = {
                  name: item.name,
                  totalQuantity: 0,
                  totalRevenue: 0,
                };
              }
              productSales[item.id].totalQuantity += item.quantity;
              productSales[item.id].totalRevenue += item.quantity * item.precio;
            }
          });
        }
      });

      setTotalRevenue(Math.floor(currentTotalRevenue));
      setTotalOrdersCount(currentTotalOrdersCount);
      setAverageOrderValue(currentTotalOrdersCount > 0 ? Math.floor(currentTotalRevenue / currentTotalOrdersCount) : 0);

      const sortedByQuantity = Object.values(productSales).sort((a, b) => b.totalQuantity - a.totalQuantity);
      setMostOrderedProducts(sortedByQuantity);

      const sortedByRevenue = Object.values(productSales).sort((a, b) => b.totalRevenue - a.totalRevenue);
      setTopRevenueProducts(sortedByRevenue);

    }, (err) => {
      console.error("Error al obtener pedidos en tiempo real y calcular métricas:", err);
      setError("Error al cargar pedidos o métricas: " + err.message);
    });

    return unsubscribe;
  }, [db, appId, selectedMetricsTimeRange, getStartDate]); 

  // Función para obtener reseñas en tiempo real
  const fetchReviews = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para reseñas.");
      setError("No se puede cargar la base de datos de reseñas.");
      setLoading(false);
      return () => {};
    }

    const reviewsCollectionRef = collection(db, `artifacts/${appId}/public/data/reviews`);
    let q = query(reviewsCollectionRef); 

    const startDate = getStartDate(selectedReviewsTimeRange);
    if (startDate) {
      q = query(reviewsCollectionRef, where("createdAt", ">=", startDate));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviewsData = snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data
        };
      });
      setReviews(reviewsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : (a.timestamp ? a.timestamp.toDate() : new Date(0));
        const dateB = b.createdAt ? new Date(b.createdAt) : (b.timestamp ? b.timestamp.toDate() : new Date(0));
        return dateB - dateA; 
      })); 
      setLoading(false);
      console.log(`Reseñas cargadas en AdminDashboard (filtro '${selectedReviewsTimeRange}'):`, reviewsData.length);
    }, (err) => {
      console.error("Error al obtener reseñas en tiempo real:", err);
      setError("Error al cargar reseñas: " + err.message);
      setLoading(false);
    });

    return unsubscribe;
  }, [db, appId, selectedReviewsTimeRange, getStartDate]); 

  // useCallback para obtener IDs de productos destacados manualmente
  const fetchManualFeaturedProductIds = useCallback(() => {
    if (!db) {
      console.warn("AdminDashboard: Firestore db no está inicializado para destacados.");
      return () => {};
    }

    const featuredConfigDocRef = doc(db, `artifacts/${appId}/public/data/featured_products_config/manual_selection`);
    const unsubscribe = onSnapshot(featuredConfigDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setManualFeaturedProductIds(data.productIds || []);
      } else {
        setManualFeaturedProductIds([]);
        // Opcional: Crear el documento si no existe, o simplemente dejarlo vacío hasta que el admin guarde.
        // console.log("Documento de configuración de destacados no encontrado. Se creará al guardar.");
      }
    }, (err) => {
      console.error("Error al obtener productos destacados manualmente:", err);
      showNotification("Error al cargar la configuración de productos destacados.", "error");
    });

    return unsubscribe;
  }, [db, appId, showNotification]);

  // FUNCIÓN para alternar el estado de destacado manual de un producto
  const handleToggleManualFeatured = useCallback(async (productId, isCurrentlyFeatured) => {
    if (!db) {
      showNotification("Error: Base de datos no disponible.", "error");
      return;
    }

    const featuredConfigDocRef = doc(db, `artifacts/${appId}/public/data/featured_products_config/manual_selection`);
    let newFeaturedIds = [...manualFeaturedProductIds];

    if (isCurrentlyFeatured) {
      // Eliminar de destacados
      newFeaturedIds = newFeaturedIds.filter(id => id !== productId);
      showNotification(`"${productNameMap[productId] || productId.substring(0, 8)}..." removido de destacados.`, "info", 2000);
    } else {
      // Añadir a destacados
      newFeaturedIds.push(productId);
      showNotification(`"${productNameMap[productId] || productId.substring(0, 8)}..." añadido a destacados.`, "success", 2000);
    }

    try {
      // Usar setDoc con merge:true para crear el documento si no existe o actualizarlo si existe
      await setDoc(featuredConfigDocRef, { productIds: newFeaturedIds }, { merge: true });
    } catch (error) {
      console.error("Error al actualizar productos destacados manualmente:", error);
      showNotification("Error al actualizar productos destacados.", "error");
    }
  }, [db, appId, manualFeaturedProductIds, showNotification, productNameMap]); // productNameMap es una dependencia crucial

  // Funciones de gestión de productos (CRUD individual)
  const handleAddProduct = useCallback(async (productData) => {
    console.log("AdminDashboard: [handleAddProduct] Recibiendo datos para agregar:", productData);
    if (!db) {
      console.error("AdminDashboard: [handleAddProduct] Firestore db no está inicializado.");
      showNotification('Error: Base de datos no disponible.', 'error');
      return;
    }
    try {
      const productsCollectionRef = collection(db, `artifacts/${appId}/public/data/products`);
      if (!productData) {
        console.error("AdminDashboard: [handleAddProduct] productData es nulo/indefinido. No se puede agregar el documento.");
        showNotification('Error: Datos de producto inválidos.', 'error');
        return;
      }
      const parsedPrecio = parseFloat(productData.precio) || 0; // Asegura que precio sea número, por defecto 0
      const parsedStock = parseInt(productData.stock, 10); // Siempre usa base 10
      const stockValue = isNaN(parsedStock) ? 0 : parsedStock; // Corregido typo: parsedParsedStock -> parsedStock

      const productToSave = { 
        ...productData, 
        precio: parsedPrecio,
        stock: stockValue, // Usa el valor parseado/validado
        createdAt: new Date().toISOString() 
      };

      const docRef = await addDoc(productsCollectionRef, productToSave);
      console.log("AdminDashboard: [handleAddProduct] Documento agregado con ID:", docRef.id, "Datos:", productToSave);
      showNotification('¡Producto agregado exitosamente!', 'success');
    } catch (err) {
      console.error("AdminDashboard: [handleAddProduct] Error al agregar producto a Firestore:", err);
      showNotification('Error al agregar producto: ' + err.message, 'error');
      throw err;
    }
  }, [db, appId, showNotification]);

  const handleUpdateProduct = useCallback(async (productId, productData) => {
    console.log("AdminDashboard: [handleUpdateProduct] Recibiendo datos para actualizar ID:", productId, "Datos:", productData);
    if (!db) {
      console.error("AdminDashboard: [handleUpdateProduct] Firestore db no está inicializado.");
      showNotification('Error: Base de datos no disponible.', 'error');
      return;
    }
    try {
      const productDocRef = doc(db, `artifacts/${appId}/public/data/products/${productId}`);
      
      const parsedPrecio = parseFloat(productData.precio) || 0; // Asegura que precio sea número, por defecto 0
      const parsedStock = parseInt(productData.stock, 10); // Siempre usa base 10
      const stockValue = isNaN(parsedStock) ? 0 : parsedStock; // Si no es un número, usa 0

      const productToUpdate = { 
        ...productData, 
        precio: parsedPrecio,
        stock: stockValue // Usa el valor parseado/validado
      };
      await updateDoc(productDocRef, productToUpdate);
      console.log("AdminDashboard: [handleUpdateProduct] Documento actualizado. ID:", productId, "Datos:", productToUpdate);
      showNotification('¡Producto actualizado exitosamente!', 'success');
    } catch (err) {
      console.error("AdminDashboard: [handleUpdateProduct] Error al actualizar producto en Firestore:", err);
      showNotification('Error al actualizar producto: ' + err.message, 'error');
      throw err;
    }
  }, [db, appId, showNotification]);

  const handleProductSave = useCallback(async (id, productData) => {
    try {
      if (id) {
        await handleUpdateProduct(id, productData);
      } else {
        await handleAddProduct(productData);
      }
    } catch (saveError) {
      console.error("AdminDashboard: Error en handleProductSave:", saveError);
    } finally {
      setIsProductModalOpen(false);
      setEditingProduct(null);
    }
  }, [handleAddProduct, handleUpdateProduct]);

  const handleDeleteProduct = useCallback(async (productId) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    const confirmed = await new Promise(resolve => {
        const confirmModal = document.createElement('div');
        confirmModal.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50";
        confirmModal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm sm:max-w-md">
                <h3 class="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirmar Eliminación</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-6 text-sm sm:text-base">¿Estás seguro de que quieres eliminar este producto?</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancelConfirm" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Cancelar</button>
                    <button id="okConfirm" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        document.getElementById('cancelConfirm').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };
        document.getElementById('okConfirm').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };
    });

    if (!confirmed) {
      return;
    }

    try {
      const productDocRef = doc(db, `artifacts/${appId}/public/data/products/${productId}`);
      await deleteDoc(productDocRef);
      showNotification('¡Producto eliminado exitosamente!', 'success');
      // También se remueve de la lista de manualFeaturedProductIds si estaba allí
      if (manualFeaturedProductIds.includes(productId)) {
        handleToggleManualFeatured(productId, true); 
      }
    } catch (err) {
      console.error("Error al eliminar producto:", err);
      showNotification('Error al eliminar producto: ' + err.message, 'error');
    }
  }, [db, appId, showNotification, manualFeaturedProductIds, handleToggleManualFeatured]); 

  const handleImportProductsFromJson = useCallback(async (productsToImport) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado para la importación.", "error");
      return;
    }
    setIsImportingProducts(true);
    showNotification("Iniciando importación de productos...", "info", 5000);

    let currentBatch = writeBatch(db); // Inicializa el primer batch
    const productsCollectionRef = collection(db, `artifacts/${appId}/public/data/products`);
    let importedCount = 0;
    let errorCount = 0;

    for (const productData of productsToImport) {
      try {
        const parsedProductData = {
          ...productData,
          // Aseguramos que precio y stock sean números válidos para la importación
          precio: parseFloat(productData.precio) || 0, 
          stock: parseInt(productData.stock, 10) || 0,    
          createdAt: new Date().toISOString() 
        };
        // Usamos .set con doc(productsCollectionRef) para generar un nuevo ID automático
        currentBatch.set(doc(productsCollectionRef), parsedProductData);
        importedCount++;

        // Firestore tiene un límite de 500 operaciones por batch.
        // Si el lote se hace demasiado grande, lo commitimos y creamos uno nuevo.
        if (importedCount % 499 === 0) { 
          await currentBatch.commit();
          showNotification(`Importados ${importedCount} productos hasta ahora...`, "info", 3000);
          currentBatch = writeBatch(db); // Reinicia un nuevo batch
        }

      } catch (err) {
        console.error("Error al preparar producto para batch:", productData, err);
        errorCount++;
      }
    }

    try {
      await currentBatch.commit(); // Commiteamos cualquier operación restante
      showNotification(`Importación completada: ${importedCount} productos importados, ${errorCount} con errores.`, "success", 7000);
      console.log(`Importación finalizada. Importados: ${importedCount}, Errores: ${errorCount}`);
      closeImportModal(); // Ahora closeImportModal está declarado antes
    } catch (batchErr) {
      console.error("Error al commitear el batch de importación:", batchErr);
      showNotification(`Error final al importar productos: ${batchErr.message}`, "error", 7000);
    } finally {
      setIsImportingProducts(false);
    }
  }, [db, appId, showNotification, closeImportModal]); 


  // Funciones de gestión de pedidos
  const handleClearAllOrders = useCallback(async () => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }

    const confirmed = await new Promise(resolve => {
        const confirmModal = document.createElement('div');
        confirmModal.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50";
        confirmModal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm sm:max-w-md">
                <h3 class="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirmar Eliminación</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-6 text-sm sm:text-base">¿Estás SEGURO de que quieres ELIMINAR TODOS los pedidos? Esta acción es irreversible.</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancelConfirm" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Cancelar</button>
                    <button id="okConfirm" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Eliminar Todo</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        document.getElementById('cancelConfirm').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };
        document.getElementById('okConfirm').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };
    });

    if (!confirmed) {
      return;
    }

    setClearingOrders(true);
    showNotification("Vaciando todos los pedidos...", "info");

    try {
      const ordersCollectionRef = collection(db, `artifacts/${appId}/public/data/orders`);
      const q = query(ordersCollectionRef);
      const querySnapshot = await getDocs(q);
      let deletedCount = 0;

      for (const orderDoc of querySnapshot.docs) {
        await deleteDoc(doc(db, `artifacts/${appId}/public/data/orders/${orderDoc.id}`));
        deletedCount++;
      }
      showNotification(`¡Éxito! Se eliminaron ${deletedCount} pedidos.`, "success");
      console.log(`Eliminación masiva completada: ${deletedCount} pedidos eliminados.`);
      
      setTotalRevenue(0);
      setTotalOrdersCount(0);
      setAverageOrderValue(0);
      setMostOrderedProducts([]);
      setTopRevenueProducts([]);

    } catch (err) {
      console.error("Error al borrar pedidos:", err);
      showNotification(`Error al borrar pedidos: ${err.message}`, "error");
    } finally {
      setClearingOrders(false);
    }
  }, [db, appId, showNotification]);


  const handleUpdateOrderStatus = useCallback(async (orderId, newStatus) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    try {
      const orderDocRef = doc(db, `artifacts/${appId}/public/data/orders/${orderId}`);
      await updateDoc(orderDocRef, { status: newStatus });
      showNotification(`Estado del pedido ${orderId.substring(0, 6)}... actualizado a "${newStatus}"`, 'success');
    } catch (err) {
      console.error("Error al actualizar estado del pedido:", err);
      showNotification('Error al actualizar estado del pedido: ' + err.message, 'error');
    }
  }, [db, appId, showNotification]);

  // Funciones de gestión de reseñas
  const handleUpdateReviewStatus = useCallback(async (reviewId, newStatus) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    console.log(`[handleUpdateReviewStatus] Intentando actualizar reseña ID: ${reviewId} a estado: ${newStatus}`);
    try {
      const reviewDocRef = doc(db, `artifacts/${appId}/public/data/reviews/${reviewId}`);
      await updateDoc(reviewDocRef, { status: newStatus });
      showNotification(`Estado de la reseña ${reviewId.substring(0, 6)}... actualizado a "${newStatus}"`, 'success');
      console.log(`[handleUpdateReviewStatus] Reseña ID: ${reviewId} actualizada exitosamente a estado: ${newStatus}`);
    } catch (err) {
      console.error("[handleUpdateReviewStatus] Error al actualizar estado de la reseña:", err);
      showNotification('Error al actualizar estado de la reseña: ' + err.message, 'error');
    }
  }, [db, appId, showNotification]);

  const handleDeleteReview = useCallback(async (reviewId) => {
    if (!db) {
      showNotification("Error: Firestore no está inicializado.", "error");
      return;
    }
    const confirmed = await new Promise(resolve => {
        const confirmModal = document.createElement('div');
        confirmModal.className = "fixed inset-0 bg-gray-600 bg-opacity-75 flex justify-center items-center p-4 z-50";
        confirmModal.innerHTML = `
            <div class="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-sm sm:max-w-md">
                <h3 class="text-xl sm:text-2xl font-bold mb-4 text-gray-900 dark:text-gray-100">Confirmar Eliminación</h3>
                <p class="text-gray-700 dark:text-gray-300 mb-6 text-sm sm:text-base">¿Estás seguro de que quieres eliminar esta reseña?</p>
                <div class="flex justify-end space-x-3">
                    <button id="cancelConfirm" class="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Cancelar</button>
                    <button id="okConfirm" class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 text-sm sm:text-base">Eliminar</button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmModal);

        document.getElementById('cancelConfirm').onclick = () => {
            confirmModal.remove();
            resolve(false);
        };
        document.getElementById('okConfirm').onclick = () => {
            confirmModal.remove();
            resolve(true);
        };
    });

    if (!confirmed) {
      return;
    }

    try {
      const reviewDocRef = doc(db, `artifacts/${appId}/public/data/reviews/${reviewId}`);
      await deleteDoc(reviewDocRef);
      showNotification('¡Reseña eliminada exitosamente!', 'success');
    } catch (err) {
      console.error("Error al eliminar reseña:", err);
      showNotification('Error al eliminar reseña: ' + err.message, 'error');
    }
  }, [db, appId, showNotification]);


  // 4. EFECTOS (useEffect)

  // Efecto principal para las suscripciones de Firestore
  useEffect(() => {
    const unsubscribeProducts = fetchProducts();
    const unsubscribeOrderList = fetchOrderListData(); 
    const unsubscribeMetrics = fetchMetricsData(); 
    const unsubscribeReviews = fetchReviews(); 
    const unsubscribeManualFeatured = fetchManualFeaturedProductIds(); // Nueva suscripción

    return () => {
      unsubscribeProducts();
      unsubscribeOrderList();
      unsubscribeMetrics();
      unsubscribeReviews(); 
      unsubscribeManualFeatured(); 
    };
  }, [fetchProducts, fetchOrderListData, fetchMetricsData, fetchReviews, fetchManualFeaturedProductIds]); 

  // useEffect para mostrar el mensaje de bienvenida al administrador y alertas de stock
  useEffect(() => {
    if (hasShownAdminWelcome) {
      showNotification('¡Inicio de sesión de administrador exitoso! ¡Bienvenido!', 'success', 4000);
      setHasShownAdminWelcome(false); 
    }

    // Mostrar notificaciones de bajo stock solo una vez por sesión
    if (!hasShownLowStockNotificationRef.current && lowStockProductsAlert.length > 0) {
      lowStockProductsAlert.forEach(product => {
        const message = `¡Alerta de Stock! "${product.name}" tiene ${product.stock} unidades restantes.`;
        showNotification(message, product.stock <= 5 ? 'error' : 'warning', 7000); // Rojo para crítico, naranja para bajo
      });
      hasShownLowStockNotificationRef.current = true; // Marcar como mostrado
    }
  }, [hasShownAdminWelcome, showNotification, setHasShownAdminWelcome, lowStockProductsAlert]);

  // useEffect para detectar productos con bajo stock
  useEffect(() => {
    const lowStock = [];
    const criticalStock = [];

    products.forEach(product => {
      if (product.stock !== undefined && product.stock <= 10) {
        lowStock.push(product);
      }
      if (product.stock !== undefined && product.stock <= 5) {
        criticalStock.push(product);
      }
    });

    setLowStockProductsAlert(lowStock);
    setCriticalStockProductsAlert(criticalStock);
    
  }, [products]); // Depende de la lista de productos


  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-xl text-gray-700 dark:text-gray-300">Cargando panel de administrador...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center text-red-600">
        <p className="text-xl">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 sm:p-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 sm:mb-8 pb-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-3xl sm:text-4xl font-bold text-red-700 dark:text-red-400 mb-4 md:mb-0">
            Panel de Administración
          </h2>
          <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full md:w-auto">
            <button
              onClick={onGoToHome}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300 flex items-center justify-center text-sm sm:text-base" 
              aria-label="Ir a la Tienda"
            >
              <Home className="inline-block mr-2" size={20} /> Ir a la Tienda
            </button>
            <button
              onClick={onLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center text-sm sm:text-base" 
              aria-label="Cerrar Sesión"
            >
              <LogOut className="inline-block mr-2" size={20} /> Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Pestañas de navegación: adaptable a pantallas pequeñas con scroll, AHORA CON BARRA DE SCROLL VISIBLE */}
        <div className="flex mb-8 border-b border-gray-200 dark:border-gray-700 overflow-x-auto whitespace-nowrap custom-scrollbar">
          <button
            onClick={() => setActiveTab('products')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'products'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <Box size={18} sm:size={20} /> <span className="hidden sm:inline">Gestión de </span>Productos
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'orders'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <ShoppingBag size={18} sm:size={20} /> <span className="hidden sm:inline">Gestión de </span>Pedidos
          </button>
          <button
            onClick={() => setActiveTab('reviews')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'reviews'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <MessageSquare size={18} sm:size={20} /> <span className="hidden sm:inline">Gestión de </span>Reseñas
          </button>
          <button
            onClick={() => setActiveTab('metrics')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'metrics'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <BarChart2 size={18} sm:size={20} /> Métricas
          </button>
          {/* NUEVA PESTAÑA: Configuración de Destacados */}
          <button
            onClick={() => setActiveTab('featured-config')}
            className={`px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-lg font-medium rounded-t-lg transition-colors duration-200 flex items-center gap-1 sm:gap-2 flex-shrink-0
              ${activeTab === 'featured-config'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
              }`}
          >
            <Star size={18} sm:size={20} /> Config. Destacados
          </button>
        </div>

        {/* Contenido de la pestaña 'products' */}
        {activeTab === 'products' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Productos</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <button
                  onClick={openImportModal} 
                  className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center justify-center text-sm sm:text-base"
                >
                  <UploadCloud size={20} /> Importar Productos JSON
                </button>
                <button
                  onClick={() => openProductModal()}
                  className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 flex items-center justify-center text-sm sm:text-base"
                >
                  <PlusCircle size={20} /> Añadir Producto
                </button>
              </div>
            </div>

            <div className="mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <label htmlFor="category-filter" className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-1 text-sm sm:text-base">
                <Filter size={18} /> Filtrar por Categoría:
              </label>
              <select
                id="category-filter"
                name="categoryFilter" 
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              >
                {uniqueCategories.map((category) => (
                  <option key={category} value={category}>
                    {category === 'all' ? 'Todas las Categorías' : category}
                  </option>
                ))}
              </select>
            </div>

            {filteredAndSortedProducts.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                {selectedCategory === 'all'
                  ? "No hay productos para mostrar. Añade uno nuevo o importa desde JSON." 
                  : `No hay productos en la categoría "${selectedCategory}".`}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      {/* COLUMNA para el estado de stock */}
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      {/* NUEVA COLUMNA para Destacado Manual */}
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Destacado
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Imagen
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                        Categoría
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Precio
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Stock
                      </th> 
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {filteredAndSortedProducts.map((product) => {
                      // Determinamos las clases y el icono según el nivel de stock
                      let rowClasses = "hover:bg-gray-50 dark:hover:bg-gray-700";
                      let stockIcon = <CheckCheck size={20} className="text-green-500" title="Stock Suficiente" />;

                      if (product.stock <= 5) {
                        rowClasses = "bg-red-50 dark:bg-red-900/50 hover:bg-red-100 dark:hover:bg-red-800/50";
                        stockIcon = <BadgeAlert size={20} className="text-red-600 fill-current animate-pulse" title="Stock Crítico (<= 5)" />;
                      } else if (product.stock <= 10) {
                        rowClasses = "bg-amber-50 dark:bg-amber-900/50 hover:bg-amber-100 dark:hover:bg-amber-800/50";
                        stockIcon = <AlertTriangle size={20} className="text-amber-600 fill-current" title="Stock Bajo (<= 10)" />;
                      }

                      // Verificar si el producto está marcado manualmente como destacado
                      const isManuallyFeatured = manualFeaturedProductIds.includes(product.id);

                      return (
                        <tr key={product.id} className={rowClasses}>
                          {/* CELDA para el estado de stock */}
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            {stockIcon}
                          </td>
                          {/* NUEVA CELDA para Destacado Manual */}
                          <td className="px-3 py-4 whitespace-nowrap text-center">
                            <button
                                onClick={(e) => {
                                  e.stopPropagation(); // Prevenir clic en fila
                                  handleToggleManualFeatured(product.id, isManuallyFeatured);
                                }}
                                className={`p-2 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 
                                  ${isManuallyFeatured
                                    ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600 dark:bg-yellow-700 dark:hover:bg-yellow-600 dark:text-yellow-100 focus:ring-yellow-300'
                                    : 'bg-gray-200 hover:bg-gray-300 text-gray-500 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-300 focus:ring-gray-300'
                                  }`}
                                title={isManuallyFeatured ? "Quitar de Destacados" : "Marcar como Destacado"}
                            >
                                <Star size={20} className={isManuallyFeatured ? "fill-current" : ""} />
                            </button>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap">
                            <img
                              src={product.image || "https://placehold.co/50x50/cccccc/ffffff?text=Sin+Img"}
                              alt={product.name}
                              className="w-10 h-10 sm:w-12 sm:h-12 rounded-full object-cover shadow-sm"
                              onError={(e) => e.target.src = "https://placehold.co/50x50/cccccc/ffffff?text=Sin+Img"}
                            />
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {product.name}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">
                            {product.category}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 font-semibold"> {/* Celda para Stock */}
                            {product.stock}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => openProductModal(product)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-600 inline-flex items-center p-1 sm:p-2 rounded-full hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors duration-200"
                              title="Editar Producto"
                            >
                              <Edit size={18} sm:size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteProduct(product.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 inline-flex items-center p-1 sm:p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200 ml-1 sm:ml-2"
                              title="Eliminar Producto"
                            >
                              <Trash2 size={18} sm:size={20} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {isProductModalOpen && (
              <ProductForm
                product={editingProduct}
                onClose={closeProductModal}
                onSave={handleProductSave} 
                showNotification={showNotification}
              />
            )}

            {isImportModalOpen && ( 
              <JsonImportModal
                onClose={closeImportModal}
                onImport={handleImportProductsFromJson}
                showNotification={showNotification}
                isImporting={isImportingProducts}
              />
            )}
          </div>
        )}

        {/* Contenido de la pestaña 'orders' */}
        {activeTab === 'orders' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Pedidos</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <select
                  id="order-list-time-range" 
                  name="orderListTimeRange" 
                  value={selectedOrderListTimeRange}
                  onChange={(e) => setSelectedOrderListTimeRange(e.target.value)}
                  className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
                >
                  <option value="all">Todo el Tiempo</option>
                  <option value="1week">Última Semana</option>
                  <option value="15days">Últimos 15 Días</option>
                  <option value="1month">Último Mes</option>
                </select>

                <button
                  onClick={handleClearAllOrders}
                  disabled={clearingOrders} 
                  className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eraser size={20} />
                  {clearingOrders ? 'Borrando...' : 'Borrar Todos los Pedidos'}
                </button>
              </div>
            </div>

            {orders.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay pedidos para mostrar en este rango de tiempo.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        ID
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                        Cliente (UID)
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Fecha
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Total
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {orders.map((order) => (
                      <tr key={order.id}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                          {order.id.substring(0, 8)}...
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                          {order.userId || 'Anónimo'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          {order.createdAt ? new Date(order.createdAt).toLocaleString('es-AR') : 'N/A'} 
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                          ${Math.floor(order.total || 0)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm">
                          <select
                            id={`order-status-${order.id}`} 
                            name="orderStatus" 
                            value={order.status || 'Pendiente'}
                            onChange={(e) => handleUpdateOrderStatus(order.id, e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm" 
                          >
                            <option value="Pendiente">Pendiente</option>
                            <option value="En preparación">En Preparación</option>
                            <option value="En camino">En Camino</option>
                            <option value="Entregado">Entregado</option>
                            <option value="Cancelado">Cancelado</option>
                          </select>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {/* Aquí podrías añadir un botón para ver detalles del pedido si es necesario */}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Sección de Reseñas */}
        {activeTab === 'reviews' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Reseñas de Productos</h3>
              <select
                id="reviews-time-range" 
                name="reviewsTimeRange" 
                value={selectedReviewsTimeRange}
                onChange={(e) => setSelectedReviewsTimeRange(e.target.value)}
                className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
              >
                <option value="all">Todo el Tiempo</option>
                <option value="1week">Última Semana</option>
                <option value="15days">Últimos 15 Días</option>
                <option value="1month">Último Mes</option>
              </select>
            </div>
            {reviews.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">No hay reseñas para mostrar en este rango de tiempo.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg shadow-md">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Producto
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden md:table-cell">
                        Usuario
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Calificación
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Comentario
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider hidden sm:table-cell">
                        Fecha
                      </th>
                      <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Estado
                      </th>
                      <th scope="col" className="px-3 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                    {reviews.map((review) => {
                      let displayDate = 'N/A';
                      if (review.createdAt) {
                        try {
                          displayDate = new Date(review.createdAt).toLocaleString('es-AR'); 
                        } catch (e) {
                          console.warn("Error al analizar createdAt:", review.createdAt, e);
                        }
                      } else if (review.timestamp && typeof review.timestamp.toDate === 'function') {
                        try {
                          displayDate = review.timestamp.toDate().toLocaleString('es-AR'); 
                        } catch (e) {
                          console.warn("Error al analizar timestamp toDate():", review.timestamp, e);
                        }
                      }
                      
                      const productName = productNameMap[review.productId] || (review.productId ? review.productId.substring(0, 8) + '...' : 'N/A');

                      return (
                        <tr key={review.id}>
                          <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                            {productName}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden md:table-cell">
                            {review.userName || review.userId?.substring(0,8) + '...' || 'Anónimo'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 flex items-center">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={14} sm:size={16} 
                                className={
                                  i < review.rating
                                    ? 'text-yellow-400 fill-current'
                                    : 'text-gray-300 dark:text-gray-600'
                                }
                              />
                            ))}
                            <span className="ml-1">({review.rating || '0'})</span>
                          </td>
                          <td className="px-3 py-4 text-sm text-gray-500 dark:text-gray-300 max-w-[150px] sm:max-w-xs overflow-hidden text-ellipsis">
                            {review.comment ? review.comment.substring(0, 100) + (review.comment.length > 100 ? '...' : '') : 'Sin comentario'}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 hidden sm:table-cell">
                            {displayDate}
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-sm">
                            <select
                              id={`review-status-${review.id}`} 
                              name="reviewStatus" 
                              value={review.status || 'pending'} 
                              onChange={(e) => handleUpdateReviewStatus(review.id, e.target.value)}
                              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-red-500 focus:ring-red-500 text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-100 text-sm" 
                            >
                              <option value="pending">Pendiente</option>
                              <option value="approved">Aprobado</option>
                              <option value="rejected">Rechazado</option>
                            </select>
                          </td>
                          <td className="px-3 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <button
                              onClick={() => handleDeleteReview(review.id)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-600 inline-flex items-center p-1 sm:p-2 rounded-full hover:bg-red-100 dark:hover:bg-red-900 transition-colors duration-200"
                              title="Eliminar Reseña"
                            >
                              <Trash2 size={18} sm:size={20} />
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

        {/* Sección de Métricas de Ventas */}
        {activeTab === 'metrics' && (
          <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
              <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-3 sm:mb-0">Métricas de Ventas</h3>
              <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <select
                  id="metrics-time-range" 
                  name="metricsTimeRange" 
                  value={selectedMetricsTimeRange}
                  onChange={(e) => setSelectedMetricsTimeRange(e.target.value)}
                  className="w-full sm:w-auto p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-red-500 focus:border-red-500 text-sm sm:text-base"
                >
                  <option value="all">Todo el Tiempo</option>
                  <option value="1week">Última Semana</option>
                  <option value="15days">Últimos 15 Días</option>
                  <option value="1month">Último Mes</option>
                </select>
                <button
                  onClick={handleClearAllOrders}
                  disabled={clearingOrders} 
                  className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300 flex items-center justify-center text-sm sm:text-base disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eraser size={20} />
                  {clearingOrders ? 'Borrando...' : 'Borrar Todos los Pedidos'}
                </button>
              </div>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8">
              <div className="bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg p-4 sm:p-5 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-80">Ingresos Totales</p>
                  <p className="text-2xl sm:text-3xl font-bold">${totalRevenue}</p>
                </div>
                <DollarSign size={32} sm:size={40} className="opacity-70" />
              </div>
              <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg p-4 sm:p-5 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-80">Total de Pedidos</p>
                  <p className="text-2xl sm:text-3xl font-bold">{totalOrdersCount}</p>
                </div>
                <ListOrdered size={32} sm:size={40} className="opacity-70" />
              </div>
              <div className="bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg p-4 sm:p-5 shadow-md flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm font-medium opacity-80">Valor Promedio de Pedido</p>
                  <p className="text-2xl sm:text-3xl font-bold">${averageOrderValue}</p>
                </div>
                <TrendingUp size={32} sm:size={40} className="opacity-70" />
              </div>
            </div>

            {mostOrderedProducts.length === 0 && topRevenueProducts.length === 0 ? (
              <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                No hay datos de ventas para mostrar o no se procesaron pedidos en este rango de tiempo.
              </p>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div>
                  <h4 className="text-xl sm:text-2xl font-semibold text-gray-800 dark:text-gray-200 mb-4">Productos Más Vendidos (por Cantidad)</h4>
                  <div className="overflow-x-auto rounded-lg shadow-md">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Producto
                          </th>
                          <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Cantidad Vendida
                          </th>
                           <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                            Ingresos
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {mostOrderedProducts.slice(0, 5).map((productMetric, index) => (
                          <tr key={index}>
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                              {productMetric.name}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              {productMetric.totalQuantity} unidades
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                              ${Math.floor(productMetric.totalRevenue)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* NUEVO CONTENIDO: Pestaña de Configuración de Destacados */}
        {activeTab === 'featured-config' && (
            <div>
                <h3 className="text-2xl sm:text-3xl font-semibold text-gray-800 dark:text-gray-200 mb-6">
                    Configuración de Productos Destacados
                </h3>
                {products.length === 0 ? (
                    <p className="text-center text-gray-500 dark:text-gray-400 py-10">
                        No hay productos para configurar como destacados. Por favor, añade algunos productos primero.
                    </p>
                ) : (
                    <div className="overflow-x-auto rounded-lg shadow-md">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                            <thead className="bg-gray-50 dark:bg-gray-700">
                                <tr>
                                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Producto
                                    </th>
                                    <th scope="col" className="px-3 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                                        Actualmente Destacado (Manual)
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                {products.map(product => {
                                    const isManuallyFeatured = manualFeaturedProductIds.includes(product.id);
                                    return (
                                        <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {product.name}
                                            </td>
                                            <td className="px-3 py-4 whitespace-nowrap text-center">
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
      </div>
    </div>
  );
};

export default AdminDashboard;
