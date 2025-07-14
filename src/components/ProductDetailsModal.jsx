import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ShoppingCart, X, Star, Heart, Info, Edit, Save, Trash2, Loader2, PlusCircle, MinusCircle } from 'lucide-react';
import ReviewForm from './ReviewForm';
import ReviewSection from './ReviewSection';

// Importaciones de Firestore
import { collection, query, where, addDoc, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore';


function ProductDetailsModal({
  product,
  onClose,
  onAddToCart,
  isFavorite,
  onToggleFavorite,
  db, // Instancia de Firestore
  userId, // ID del usuario actual
  appId, // ID de la aplicación para la ruta de Firestore
  showNotification, // Función para notificaciones
  userProfile, // Se usa para verificar el rol de admin
}) {
  const [quantity, setQuantity] = useState(1);
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewError, setReviewError] = useState(null);

  // Estado para la edición del producto (solo para administradores)
  const [isEditing, setIsEditing] = useState(false);
  const [editedProduct, setEditedProduct] = useState(product);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Estado para la selección de salsa y sabor
  const [selectedSauce, setSelectedSauce] = useState(null);
  const [selectedFlavor, setSelectedFlavor] = useState(null); // Estado para el sabor seleccionado

  // NUEVO: Estado para la selección de tamaño
  const [selectedSize, setSelectedSize] = useState(null);

  // Calcula el precio total a mostrar (producto + salsa + sabor + tamaño)
  const displayPrice = useMemo(() => {
    let price = product.precio || 0;
    if (selectedSauce && !selectedSauce.isFree) {
      price += selectedSauce.price || 0;
    }
    if (selectedFlavor) {
      price += selectedFlavor.price || 0;
    }
    // NUEVO: Sumar precio del tamaño seleccionado
    if (selectedSize) {
      price += selectedSize.price || 0;
    }
    return Math.floor(price);
  }, [product.precio, selectedSauce, selectedFlavor, selectedSize]); // Añadido selectedSize a las dependencias

  const isOutOfStock = product.stock <= 0;

  // Cargar reseñas para este producto
  useEffect(() => {
    if (!db || !product?.id) return;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      setReviewError(null);
      try {
        // Asegúrate de que la colección de reseñas coincida con la de AdminDashboard
        const reviewsColRef = collection(db, `artifacts/${appId}/public/data/product_reviews`);
        const q = query(reviewsColRef, where('productId', '==', product.id), where('approved', '==', true)); // Solo reseñas aprobadas
        const querySnapshot = await getDocs(q);
        const fetchedReviews = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setReviews(fetchedReviews);
      } catch (err) {
        console.error("Error fetching reviews:", err);
        setReviewError("No se pudieron cargar las reseñas.");
        showNotification("Error al cargar reseñas.", "error");
      } finally {
        setLoadingReviews(false);
      }
    };

    fetchReviews();
  }, [db, product, appId, showNotification]);

  // Inicializa la cantidad, salsa, sabor y tamaño al abrir el modal o cambiar de producto
  useEffect(() => {
    setQuantity(product.stock > 0 ? 1 : 0);

    // Inicializa salsa
    if (product.category === 'Pastas' && product.sauces && product.sauces.length > 0) {
      setSelectedSauce(product.sauces[0]); // Selecciona la primera salsa por defecto
    } else {
      setSelectedSauce(null); // Asegura que no haya salsa seleccionada si no es pasta
    }

    // Inicializa sabor
    if (product.category === 'Pastas' && product.flavors && product.flavors.length > 0) {
      setSelectedFlavor(product.flavors[0]); // Selecciona el primer sabor por defecto
    } else {
      setSelectedFlavor(null); // Asegura que no haya sabor seleccionado si no es pasta
    }

    // NUEVO: Inicializa tamaño
    if (product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]); // Selecciona el primer tamaño por defecto
    } else {
      setSelectedSize(null); // Asegura que no haya tamaño seleccionado si no es Papas Fritas
    }

  }, [product]);

  // Inicializa el producto editado cuando el producto prop cambia
  useEffect(() => {
    setEditedProduct(product);
    // Reinicia la salsa, sabor y tamaño seleccionados al abrir el modal para un nuevo producto
    setSelectedSauce(null);
    setSelectedFlavor(null);
    setSelectedSize(null); // NUEVO: Resetear selectedSize
  }, [product]);

  // Manejadores para la cantidad del producto
  const handleIncreaseQuantity = useCallback(() => {
    if (quantity < product.stock) {
      setQuantity((prev) => prev + 1);
    } else {
      showNotification(`Solo quedan ${product.stock} unidades de ${product.name}.`, 'warning', 2000);
    }
  }, [quantity, product.stock, product.name, showNotification]);

  const handleDecreaseQuantity = useCallback(() => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  }, [quantity]);

  // Manejador para añadir al carrito
  const handleAddToCartClick = useCallback(() => {
    // Validar si se requiere salsa, sabor o tamaño y si están seleccionados
    const requiresSauce = product.category === 'Pastas' && product.sauces && product.sauces.length > 0;
    const requiresFlavor = product.category === 'Pastas' && product.flavors && product.flavors.length > 0;
    const requiresSize = product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0; // NUEVO: Validación para tamaño

    if (quantity > 0 && !isOutOfStock) {
      if (requiresSauce && !selectedSauce) {
        showNotification('Por favor, selecciona una salsa para este producto.', 'warning');
        return;
      }
      if (requiresFlavor && !selectedFlavor) {
        showNotification('Por favor, selecciona un sabor para este producto.', 'warning');
        return;
      }
      // NUEVO: Validar selección de tamaño
      if (requiresSize && !selectedSize) {
        showNotification('Por favor, selecciona un tamaño para este producto.', 'warning');
        return;
      }

      // Pasa el producto, la cantidad, la salsa, el sabor y el tamaño seleccionados
      onAddToCart({ ...product, selectedSauce: selectedSauce, selectedFlavor: selectedFlavor, selectedSize: selectedSize }, quantity); // PASA EL TAMAÑO
      onClose(); // Cierra el modal después de añadir al carrito
      showNotification(`"${product.name}" (x${quantity}) añadido al carrito.`, 'success', 2000);
    } else {
      showNotification('No se puede añadir este producto al carrito.', 'error');
    }
  }, [quantity, isOutOfStock, onAddToCart, product, onClose, showNotification, selectedSauce, selectedFlavor, selectedSize]); // Añadido selectedSize

  // Manejador para enviar una reseña
  const handleReviewSubmit = useCallback(async ({ rating, comment }) => {
    if (!db || !userId) {
      showNotification('Debes iniciar sesión para dejar una reseña.', 'info');
      return;
    }
    if (!product?.id) {
      showNotification('Error: Producto no válido para reseña.', 'error');
      return;
    }

    try {
      const reviewsColRef = collection(db, `artifacts/${appId}/public/data/product_reviews`);
      await addDoc(reviewsColRef, {
        productId: product.id,
        userId: userId,
        rating: rating,
        comment: comment,
        timestamp: new Date(),
        approved: false, // Las reseñas requieren aprobación del admin
      });
      showNotification('Reseña enviada para aprobación. ¡Gracias!', 'success');
    } catch (e) {
      console.error("Error adding review:", e);
      showNotification(`Error al enviar reseña: ${e.message}`, 'error');
    }
  }, [db, userId, product, appId, showNotification]);

  // Manejadores para la edición de productos (Admin)
  const handleEditChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditedProduct(prev => ({ ...prev, [name]: value }));
  }, []);

  // Manejador para cambios en la imagen (solo URL por ahora)
  const handleImageURLChange = useCallback((e) => {
    setEditedProduct(prev => ({ ...prev, image: e.target.value }));
  }, []);

  // Manejador para la edición de salsas en modo admin
  const handleAdminSauceChange = useCallback((index, field, value) => {
    setEditedProduct(prev => {
      const newSauces = [...(prev.sauces || [])]; // Asegura que sauces sea un array
      newSauces[index] = {
        ...newSauces[index],
        [field]: field === 'price' ? Number(value) : value,
      };
      return { ...prev, sauces: newSauces };
    });
  }, []);

  const handleAddAdminSauce = useCallback(() => {
    setEditedProduct(prev => ({
      ...prev,
      sauces: [...(prev.sauces || []), { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), name: '', price: 0, isFree: false }],
    }));
  }, []);

  const handleRemoveAdminSauce = useCallback((index) => {
    setEditedProduct(prev => ({
      ...prev,
      sauces: (prev.sauces || []).filter((_, i) => i !== index),
    }));
  }, []);

  // MANEJADORES PARA LA EDICIÓN DE SABORES EN MODO ADMIN
  const handleAdminFlavorChange = useCallback((index, field, value) => {
    setEditedProduct(prev => {
      const newFlavors = [...(prev.flavors || [])]; // Asegura que flavors sea un array
      newFlavors[index] = {
        ...newFlavors[index],
        [field]: value,
      };
      return { ...prev, flavors: newFlavors };
    });
  }, []);

  const handleAddAdminFlavor = useCallback(() => {
    setEditedProduct(prev => ({
      ...prev,
      flavors: [...(prev.flavors || []), { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), name: '' }],
    }));
  }, []);

  const handleRemoveAdminFlavor = useCallback((index) => {
    setEditedProduct(prev => ({
      ...prev,
      flavors: (prev.flavors || []).filter((_, i) => i !== index),
    }));
  }, []);
  // FIN MANEJADORES PARA SABORES

  // NUEVO: Manejadores para la edición de tamaños en modo admin
  const handleAdminSizeChange = useCallback((index, field, value) => {
    setEditedProduct(prev => {
      const newSizes = [...(prev.sizes || [])]; // Asegura que sizes sea un array
      newSizes[index] = {
        ...newSizes[index],
        [field]: field === 'price' ? Number(value) : value,
      };
      return { ...prev, sizes: newSizes };
    });
  }, []);

  const handleAddAdminSize = useCallback(() => {
    setEditedProduct(prev => ({
      ...prev,
      sizes: [...(prev.sizes || []), { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), name: '', price: 0 }],
    }));
  }, []);

  const handleRemoveAdminSize = useCallback((index) => {
    setEditedProduct(prev => ({
      ...prev,
      sizes: (prev.sizes || []).filter((_, i) => i !== index),
    }));
  }, []);
  // FIN NUEVOS MANEJADORES PARA TAMAÑOS


  const handleSaveEditedProduct = useCallback(async () => {
    setIsSaving(true);
    try {
      const productRef = doc(db, `artifacts/${appId}/public/data/products`, editedProduct.id);
      await updateDoc(productRef, {
        name: editedProduct.name,
        descripcion: editedProduct.descripcion,
        precio: Number(editedProduct.precio),
        category: editedProduct.category,
        stock: Number(editedProduct.stock),
        image: editedProduct.image,
        sauces: editedProduct.category === 'Pastas' ? (editedProduct.sauces || []) : [], // Guardar salsas solo si es Pastas
        flavors: editedProduct.category === 'Pastas' ? (editedProduct.flavors || []) : [], // Guardar sabores solo si es Pastas
        sizes: editedProduct.category === 'Papas Fritas' ? (editedProduct.sizes || []) : [], // NUEVO: Guardar tamaños solo si es Papas Fritas
      });
      showNotification('Producto actualizado con éxito (Admin).', 'success');
      setIsEditing(false); // Sale del modo edición
      // Opcional: Refrescar el producto en el estado principal si es necesario
    } catch (e) {
      console.error("Error al guardar producto (Admin):", e);
      showNotification(`Error al guardar producto (Admin): ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [db, appId, editedProduct, showNotification]);

  const handleDeleteProduct = useCallback(async () => {
    // Reemplazado window.confirm por una notificación para mejor UX
    showNotification('¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.', 'confirm', 5000, () => {
      // Acción de confirmación
      const executeDelete = async () => {
        setIsDeleting(true);
        try {
          await deleteDoc(doc(db, `artifacts/${appId}/public/data/products`, product.id));
          showNotification('Producto eliminado con éxito (Admin).', 'success');
          onClose(); // Cierra el modal después de eliminar
        } catch (e) {
          console.error("Error al eliminar producto (Admin):", e);
          showNotification(`Error al eliminar producto (Admin): ${e.message}`, 'error');
        } finally {
          setIsDeleting(false);
        }
      };
      executeDelete();
    });
  }, [db, appId, product, onClose, showNotification]);


  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-3xl transform scale-95 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Botón de cerrar */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
          aria-label="Cerrar detalles del producto"
        >
          <X size={28} />
        </button>

        {/* Botones de Admin */}
        {userProfile?.role === 'admin' && (
          <div className="absolute top-4 left-4 flex space-x-2">
            {!isEditing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="p-2 bg-blue-500 hover:bg-blue-600 text-white rounded-full shadow-md transition-colors duration-200"
                aria-label="Editar producto"
              >
                <Edit size={20} />
              </button>
            ) : (
              <button
                onClick={handleSaveEditedProduct}
                disabled={isSaving}
                className="p-2 bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Guardar cambios"
              >
                {isSaving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
              </button>
            )}
            <button
              onClick={handleDeleteProduct}
              disabled={isDeleting}
              className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full shadow-md transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Eliminar producto"
            >
              {isDeleting ? <Loader2 size={20} className="animate-spin" /> : <Trash2 size={20} />}
            </button>
          </div>
        )}

        {/* Contenido del Producto */}
        <div className="flex flex-col md:flex-row gap-6 mt-10 md:mt-0">
          <div className="md:w-1/2 flex-shrink-0">
            <img
              src={editedProduct.image || `https://placehold.co/400x300/A0522D/F0F8FF?text=${encodeURIComponent(editedProduct.name.substring(0, 3))}`}
              alt={editedProduct.name}
              className="w-full h-64 object-cover rounded-xl shadow-md"
              onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x300/A0522D/F0F8FF?text=${encodeURIComponent(editedProduct.name.substring(0, 3))}`; }}
            />
          </div>
          <div className="md:w-1/2 flex flex-col justify-between">
            <div>
              {isEditing ? (
                <>
                  <input
                    type="text"
                    name="name"
                    value={editedProduct.name}
                    onChange={handleEditChange}
                    className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  <textarea
                    name="descripcion"
                    value={editedProduct.descripcion}
                    onChange={handleEditChange}
                    rows="3"
                    className="text-gray-700 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  ></textarea>
                  <input
                    type="number"
                    name="precio"
                    value={editedProduct.precio}
                    onChange={handleEditChange}
                    min="0"
                    step="0.01"
                    className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  <input
                    type="number"
                    name="stock"
                    value={editedProduct.stock}
                    onChange={handleEditChange}
                    min="0"
                    className="text-lg text-gray-600 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  <input
                    type="text"
                    name="category"
                    value={editedProduct.category}
                    onChange={handleEditChange}
                    className="text-lg text-gray-600 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  <input
                    type="text"
                    name="image"
                    value={editedProduct.image}
                    onChange={handleImageURLChange}
                    placeholder="URL de la imagen"
                    className="text-sm text-gray-600 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  {/* Edición de Salsas para Admin */}
                  {editedProduct.category === 'Pastas' && (
                    <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Editar Salsas</h4>
                      {(editedProduct.sauces || []).map((sauce, index) => (
                        <div key={sauce.id || index} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={sauce.name}
                            onChange={(e) => handleAdminSauceChange(index, 'name', e.target.value)}
                            placeholder="Nombre de la salsa"
                            className="flex-grow px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <input
                            type="number"
                            value={sauce.price}
                            onChange={(e) => handleAdminSauceChange(index, 'price', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-20 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <input
                            type="checkbox"
                            checked={sauce.isFree}
                            onChange={(e) => handleAdminSauceChange(index, 'isFree', e.target.checked)}
                            className="mr-1"
                          />
                          <label className="text-sm text-gray-700 dark:text-gray-200">Gratis</label>
                          <button
                            type="button"
                            onClick={() => handleRemoveAdminSauce(index)}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddAdminSauce}
                        className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center gap-1 text-sm"
                      >
                        <PlusCircle size={16} /> Añadir Salsa
                      </button>
                    </div>
                  )}

                  {/* Edición de Sabores para Admin */}
                  {editedProduct.category === 'Pastas' && (
                    <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Editar Sabores</h4>
                      {(editedProduct.flavors || []).map((flavor, index) => (
                        <div key={flavor.id || index} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={flavor.name}
                            onChange={(e) => handleAdminFlavorChange(index, 'name', e.target.value)}
                            placeholder="Nombre del sabor"
                            className="flex-grow px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAdminFlavor(index)}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddAdminFlavor}
                        className="mt-2 px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-md flex items-center gap-1 text-sm"
                      >
                        <PlusCircle size={16} /> Añadir Sabor
                      </button>
                    </div>
                  )}

                  {/* NUEVO: Edición de Tamaños para Admin */}
                  {editedProduct.category === 'Papas Fritas' && (
                    <div className="mt-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Editar Tamaños</h4>
                      {(editedProduct.sizes || []).map((size, index) => (
                        <div key={size.id || index} className="flex items-center gap-2 mb-2">
                          <input
                            type="text"
                            value={size.name}
                            onChange={(e) => handleAdminSizeChange(index, 'name', e.target.value)}
                            placeholder="Nombre del tamaño (Ej: Chico, Grande)"
                            className="flex-grow px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <input
                            type="number"
                            value={size.price}
                            onChange={(e) => handleAdminSizeChange(index, 'price', e.target.value)}
                            min="0"
                            step="0.01"
                            className="w-20 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white"
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveAdminSize(index)}
                            className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddAdminSize}
                        className="mt-2 px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-md flex items-center gap-1 text-sm"
                      >
                        <PlusCircle size={16} /> Añadir Tamaño
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{product.name}</h3>
                  <p className="text-gray-700 dark:text-gray-300 mb-4">{product.descripcion}</p>
                  <p className="text-4xl font-extrabold text-red-600 dark:text-red-400 mb-6">${Math.floor(displayPrice)}</p>

                  {/* Selección de Sabores (para usuarios no-admin) */}
                  {product.category === 'Pastas' && product.flavors && product.flavors.length > 0 && (
                    <div className="mb-4">
                      <label htmlFor="flavor-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Selecciona un sabor:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.flavors.map(flavor => (
                          <label
                            key={flavor.id}
                            className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-all duration-200
                              ${selectedFlavor?.id === flavor.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                              }`}
                          >
                            <input
                              type="radio"
                              name={`flavor-${product.id}`}
                              value={flavor.id}
                              checked={selectedFlavor?.id === flavor.id}
                              onChange={(e) => {
                                const flavorId = e.target.value;
                                const flavor = product.flavors.find(f => f.id === flavorId);
                                setSelectedFlavor(flavor || null);
                              }}
                              className="mr-2 hidden"
                            />
                            {flavor.name}
                          </label>
                        ))}
                      </div>
                      {selectedFlavor && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Sabor seleccionado: {selectedFlavor.name}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Selección de Salsas (para usuarios no-admin) */}
                  {product.category === 'Pastas' && product.sauces && product.sauces.length > 0 && (
                    <div className="mb-4">
                      <label htmlFor="sauce-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Selecciona una salsa:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.sauces.map(sauce => (
                          <label
                            key={sauce.id}
                            className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-all duration-200
                              ${selectedSauce?.id === sauce.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                              }`}
                          >
                            <input
                              type="radio"
                              name={`sauce-${product.id}`}
                              value={sauce.id}
                              checked={selectedSauce?.id === sauce.id}
                              onChange={(e) => {
                                const sauceId = e.target.value;
                                const sauce = product.sauces.find(s => s.id === sauceId);
                                setSelectedSauce(sauce || null);
                              }}
                              className="mr-2 hidden"
                            />
                            {sauce.name} {sauce.isFree ? '(Gratis)' : `(+$${Math.floor(sauce.price)})`}
                          </label>
                        ))}
                      </div>
                      {selectedSauce && !selectedSauce.isFree && selectedSauce.price > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Precio con salsa: ${Math.floor(product.precio + selectedSauce.price)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* NUEVO: Selección de Tamaños (para usuarios no-admin) */}
                  {product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0 && (
                    <div className="mb-4">
                      <label htmlFor="size-select" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                        Selecciona un tamaño:
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map(size => (
                          <label
                            key={size.id}
                            className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-all duration-200
                              ${selectedSize?.id === size.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                              }`}
                          >
                            <input
                              type="radio"
                              name={`size-${product.id}`}
                              value={size.id}
                              checked={selectedSize?.id === size.id}
                              onChange={(e) => {
                                const sizeId = e.target.value;
                                const size = product.sizes.find(s => s.id === sizeId);
                                setSelectedSize(size || null);
                              }}
                              className="mr-2 hidden"
                            />
                            {size.name} {size.price > 0 ? `(+$${Math.floor(size.price)})` : ''}
                          </label>
                        ))}
                      </div>
                      {selectedSize && selectedSize.price > 0 && (
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
                          Precio con tamaño: ${Math.floor(product.precio + selectedSize.price)}
                        </p>
                      )}
                    </div>
                  )}

                  {isOutOfStock && (
                    <p className="text-red-500 font-semibold flex items-center gap-2 mb-4">
                      <Info size={20} /> Producto Agotado
                    </p>
                  )}
                </>
              )}
            </div>

            {/* Controles de Cantidad y Añadir al Carrito */}
            <div className="flex items-center space-x-4 mt-6">
              {!isEditing && ( // Solo mostrar si no está en modo edición
                <>
                  <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl">
                    <button
                      onClick={handleDecreaseQuantity}
                      className="p-3 text-gray-700 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-l-xl transition-colors duration-200"
                      aria-label="Disminuir cantidad"
                      disabled={quantity <= 1}
                    >
                      <MinusCircle size={24} />
                    </button>
                    <span className="px-4 text-xl font-semibold text-gray-900 dark:text-gray-100">
                      {quantity}
                    </span>
                    <button
                      onClick={handleIncreaseQuantity}
                      className="p-3 text-red-600 hover:bg-red-100 dark:hover:bg-gray-700 rounded-r-xl transition-colors duration-200"
                      aria-label="Aumentar cantidad"
                      disabled={isOutOfStock || quantity >= product.stock}
                    >
                      <PlusCircle size={24} />
                    </button>
                  </div>
                  <button
                    onClick={handleAddToCartClick}
                    disabled={
                      isOutOfStock ||
                      quantity === 0 ||
                      (product.category === 'Pastas' && product.sauces && product.sauces.length > 0 && !selectedSauce) || // Requiere salsa si hay salsas
                      (product.category === 'Pastas' && product.flavors && product.flavors.length > 0 && !selectedFlavor) || // Requiere sabor si hay sabores
                      (product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0 && !selectedSize) // NUEVO: Requiere tamaño si hay tamaños
                    }
                    className={`w-full font-bold py-3 px-6 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${
                      (isOutOfStock || quantity === 0 || (product.category === 'Pastas' && product.sauces && product.sauces.length > 0 && !selectedSauce) || (product.category === 'Pastas' && product.flavors && product.flavors.length > 0 && !selectedFlavor) || (product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0 && !selectedSize))
                        ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-300'
                    }`}
                    aria-label={isOutOfStock ? "Producto agotado" : "Añadir al Carrito"}
                  >
                    <ShoppingCart size={24} /> {isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
                  </button>
                </>
              )}
            </div>
            {/* Botón de Favoritos */}
            {!isEditing && (
              <button
                onClick={() => onToggleFavorite(product.id)}
                className={`mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-lg font-medium transition-colors duration-200 border-2 ${
                  isFavorite
                    ? 'bg-red-500 text-white border-red-500 hover:bg-red-600'
                    : 'bg-white text-red-500 border-red-500 hover:bg-red-50 dark:bg-gray-700 dark:text-red-400 dark:border-red-400 dark:hover:bg-gray-600'
                }`}
                aria-label={isFavorite ? 'Quitar de Favoritos' : 'Añadir a Favoritos'}
              >
                <Heart size={20} className={isFavorite ? 'fill-current' : ''} />
                {isFavorite ? 'En Favoritos' : 'Añadir a Favoritos'}
              </button>
            )}
          </div>
        </div>

        {/* Sección de Reseñas */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-8">
          <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Reseñas y Calificaciones
          </h3>

          {loadingReviews ? (
            <p className="text-center text-gray-600 dark:text-gray-300">Cargando reseñas...</p>
          ) : reviewError ? (
            <p className="text-center text-red-600 dark:text-red-400">{reviewError}</p>
          ) : (
            // Filtrar reseñas para mostrar al usuario final solo las aprobadas
            <ReviewSection reviews={reviews.filter(review => review.approved)} />
          )}

          {/* Formulario de Reseñas */}
          {userId ? ( // Solo permite dejar reseña si hay un usuario logueado
            <ReviewForm onSubmit={handleReviewSubmit} />
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-300 mt-4">
              Inicia sesión para dejar una reseña.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsModal;
