import React, { useState, useEffect, useCallback, useMemo } from 'react';
// Importaciones de iconos de Lucide React: Aseguramos que todos los iconos usados estén aquí.
import {
  ShoppingCart, X, Star, Heart, Info, Edit, Save, Trash2, Loader2,
  PlusCircle, MinusCircle, Pizza, Eraser, ListPlus, Minus, Plus // 'Minus' y 'Plus' para los controles de cantidad de sabores
} from 'lucide-react';

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
  allProducts, // Se necesita para la combinación de pizzas y empanadas
  isCombinedPizzaSelection = false, // Prop para saber si se abrió para combinar pizza
  isCombinedEmpanadaSelection = false, // NUEVO: Prop para saber si se abrió para combinar empanadas/canastitas
  combinedType = null, // NUEVO: 'half-dozen' o 'dozen'
}) {
  // Estado para la cantidad del producto (para añadir al carrito)
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
  const [selectedFlavor, setSelectedFlavor] = useState(null);

  // Estado para la selección de tamaño
  const [selectedSize, setSelectedSize] = useState(null);

  // Estado para la selección de pizza combinada
  const [selectedCombinedPizza, setSelectedCombinedPizza] = useState(null);
  const [availablePizzas, setAvailablePizzas] = useState([]); // Para el selector de combinación

  // NUEVO: Estado para la selección de sabores de empanadas combinadas
  // Almacena un objeto donde la clave es el ID del producto individual de empanada/canastita
  // y el valor es la cantidad seleccionada de ese sabor.
  const [selectedEmpanadaFlavors, setSelectedEmpanadaFlavors] = useState({});

  // NUEVO: Estado para el tipo de cantidad seleccionada para Empanadas/Canastitas (en el modal de detalles)
  // Inicializado a 'unit' para evitar el error de "not defined"
  const [selectedQuantityType, setSelectedQuantityType] = useState('unit');


  // Cargar todas las pizzas disponibles para la combinación
  useEffect(() => {
    if (product.category === 'Pizzas' && allProducts && allProducts.length > 0) {
      // Filtra las pizzas que no sean el producto actual
      const pizzas = allProducts.filter(p => p.category === 'Pizzas' && p.id !== product.id);
      setAvailablePizzas(pizzas);
    } else {
      setAvailablePizzas([]);
    }
  }, [product, allProducts]);

  // NUEVO: Filtra los productos individuales de empanadas/canastitas
  const availableEmpanadaFlavors = useMemo(() => {
    if (!allProducts) return [];
    // Se incluye 'Empanadas y Canastitas' para que coincida con la categoría
    // que el usuario tiene en Firestore para los productos individuales.
    const individualCategories = ['Empanada Individual', 'Canastita Individual', 'Empanada', 'Canastita', 'Empanadas y Canastitas'];
    return allProducts.filter(p => individualCategories.includes(p.category) && p.stock > 0);
  }, [allProducts]);

  // NUEVO: Calcula el total de empanadas/canastitas seleccionadas para la combinación
  const totalSelectedEmpanadas = useMemo(() => {
    return Object.values(selectedEmpanadaFlavors).reduce((sum, count) => sum + count, 0);
  }, [selectedEmpanadaFlavors]);

  // NUEVO: Define el conteo objetivo para la combinación de empanadas/canastitas
  const targetEmpanadaCount = useMemo(() => {
    if (combinedType === 'half-dozen') return 6;
    if (combinedType === 'dozen') return 12;
    return 0;
  }, [combinedType]);


  // Calcula el precio total a mostrar (producto + salsa + sabor + tamaño + combinación + tipo de cantidad)
  const displayPrice = useMemo(() => {
    let price = 0;

    if (isCombinedEmpanadaSelection) {
      // Si estamos en modo de combinación de empanadas, el precio es el del paquete (media docena o docena)
      if (combinedType === 'dozen') {
        price = product.precioDocena || (product.precio * 12);
      } else if (combinedType === 'half-dozen') {
        price = product.precioMediaDocena || (product.precio * 6);
      }
    } else if (product.category === 'Pizzas' && selectedCombinedPizza) {
      // Si es una pizza combinada, toma el precio más alto
      price = Math.max(product.precio || 0, selectedCombinedPizza.precio || 0);
    } else {
      // Para otros productos o empanadas por unidad, usa el precio base del producto
      price = product.precio || 0;
    }

    // Suma los precios de extras si no es una combinación de empanadas (ya que el precio combinado es fijo)
    if (!isCombinedEmpanadaSelection) {
        if (selectedSauce && !selectedSauce.isFree) {
            price += selectedSauce.price || 0;
        }
        // Nota: Los sabores de pasta no tienen precio adicional, solo son una elección.
        if (selectedSize) {
            price += selectedSize.price || 0;
        }
    }

    return Math.floor(price);
  }, [product, selectedSauce, selectedFlavor, selectedSize, selectedCombinedPizza, isCombinedEmpanadaSelection, combinedType]);


  const isOutOfStock = product.stock <= 0;

  // Cargar reseñas para este producto
  useEffect(() => {
    if (!db || !product?.id) return;

    const fetchReviews = async () => {
      setLoadingReviews(true);
      setReviewError(null);
      try {
        const reviewsColRef = collection(db, `artifacts/${appId}/public/data/product_reviews`);
        const q = query(reviewsColRef, where('productId', '==', product.id), where('approved', '==', true));
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

  // Inicializa la cantidad, salsa, sabor, tamaño, pizza combinada y tipo de cantidad al abrir el modal o cambiar de producto
  useEffect(() => {
    // Si el modal se abrió para combinar empanadas, la cantidad inicial es 1 (una media docena/docena)
    if (isCombinedEmpanadaSelection) {
      setQuantity(1);
      setSelectedEmpanadaFlavors({}); // Resetear sabores seleccionados
      setSelectedQuantityType(combinedType); // Asegurarse de que el tipo de cantidad sea el de la combinación
    } else {
      setQuantity(product.stock > 0 ? 1 : 0);
      // Si el producto es Empanadas y Canastitas, inicializar a 'unidad' por defecto
      if (product.category === 'Empanadas y Canastitas') {
        setSelectedQuantityType('unit');
      } else {
        setSelectedQuantityType('unit'); // Asegura que siempre sea un string, por defecto 'unit'
      }
    }

    // Inicializa salsa
    if (product.category === 'Pastas' && product.sauces && product.sauces.length > 0) {
      setSelectedSauce(product.sauces[0]);
    } else {
      setSelectedSauce(null);
    }

    // Inicializa sabor
    if (product.category === 'Pastas' && product.flavors && product.flavors.length > 0) {
      setSelectedFlavor(product.flavors[0]);
    } else {
      setSelectedFlavor(null);
    }

    // Inicializa tamaño
    if (product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0) {
      setSelectedSize(product.sizes[0]);
    } else {
      setSelectedSize(null);
    }

    // Reinicia la pizza combinada al cambiar de producto o si no es una pizza
    if (product.category !== 'Pizzas') {
      setSelectedCombinedPizza(null);
    } else {
      // Si el producto es una pizza, no reseteamos la combinación automáticamente
      // pero nos aseguramos de que la pizza combinada sea válida si ya estaba seleccionada
      if (selectedCombinedPizza && selectedCombinedPizza.id === product.id) {
        setSelectedCombinedPizza(null); // No puedes combinar una pizza consigo misma
      } else if (selectedCombinedPizza && !availablePizzas.find(p => p.id === selectedCombinedPizza.id)) {
        setSelectedCombinedPizza(null); // Si la pizza combinada ya no está disponible
      }
    }

  }, [product, availablePizzas, isCombinedEmpanadaSelection, combinedType, selectedCombinedPizza]);


  // Inicializa el producto editado cuando el producto prop cambia
  useEffect(() => {
    setEditedProduct(product);
    // Reinicia las selecciones al abrir el modal para un nuevo producto
    setSelectedSauce(null);
    setSelectedFlavor(null);
    setSelectedSize(null);
    setSelectedCombinedPizza(null);
    setSelectedEmpanadaFlavors({}); // Asegura que se reinicie la selección de empanadas individuales
    setSelectedQuantityType('unit'); // Asegura que se inicialice correctamente a 'unit'
  }, [product]);

  // Manejadores para la cantidad del producto (cantidad de unidades, medias docenas o docenas)
  const handleIncreaseQuantity = useCallback(() => {
    // La cantidad máxima a añadir es el stock total del producto (para unidades)
    // o el stock dividido por el tamaño del paquete (para docenas/medias docenas)
    let maxQuantityAllowed = product.stock;

    if (isCombinedEmpanadaSelection) {
      // Para combinación de empanadas, el stock se refiere al número de paquetes (media docena/docena)
      // que se pueden formar con el stock total de empanadas individuales.
      // Aquí, 'product.stock' se refiere al stock del producto "Empanadas y Canastitas" (el contenedor).
      // Si el stock es 0, no se pueden añadir más.
      if (product.stock === 0) {
        maxQuantityAllowed = 0;
      } else {
        // Si el stock del "paquete" es 1, solo se puede añadir 1 paquete.
        maxQuantityAllowed = 1;
      }
    } else if (product.category === 'Pizzas' && selectedCombinedPizza) {
      // Para pizzas combinadas, el stock es el mínimo entre las dos pizzas
      maxQuantityAllowed = Math.min(product.stock, selectedCombinedPizza.stock);
    } else if (product.category === 'Empanadas y Canastitas' && selectedQuantityType === 'dozen') {
      maxQuantityAllowed = Math.floor(product.stock / 12);
    } else if (product.category === 'Empanadas y Canastitas' && selectedQuantityType === 'half-dozen') {
      maxQuantityAllowed = Math.floor(product.stock / 6);
    }

    if (quantity < maxQuantityAllowed) {
      setQuantity((prev) => prev + 1);
    } else if (maxQuantityAllowed > 0) {
      showNotification(`Solo puedes añadir ${maxQuantityAllowed} ${selectedQuantityType === 'dozen' ? 'docenas' : selectedQuantityType === 'half-dozen' ? 'medias docenas' : 'unidades'} de ${product.name}.`, 'warning', 2000);
    } else {
      showNotification(`Producto agotado. No se puede añadir más stock.`, 'warning', 2000);
    }
  }, [quantity, product.stock, product.name, selectedQuantityType, isCombinedEmpanadaSelection, selectedCombinedPizza, product.category]);


  const handleDecreaseQuantity = useCallback(() => {
    if (quantity > 1) {
      setQuantity((prev) => prev - 1);
    }
  }, [quantity]);

  // NUEVO: Manejador para seleccionar la cantidad de un sabor de empanada/canastita individual
  const handleSelectEmpanadaFlavor = useCallback((flavorProduct, action) => {
    setSelectedEmpanadaFlavors(prev => {
      const currentCount = prev[flavorProduct.id] || 0;
      let newCount = currentCount;

      if (action === 'increase') {
        // No permitir exceder el stock individual del sabor
        if (currentCount >= flavorProduct.stock) {
          showNotification(`No hay más stock de ${flavorProduct.name}.`, 'warning', 2000);
          return prev;
        }
        newCount = currentCount + 1;
      } else if (action === 'decrease') {
        newCount = Math.max(0, currentCount - 1);
      }

      // Calcular el nuevo total de empanadas seleccionadas
      const newTotal = totalSelectedEmpanadas - currentCount + newCount;

      // No permitir exceder el total de empanadas/canastitas del paquete
      if (newTotal > targetEmpanadaCount) {
        showNotification(`Solo puedes seleccionar un total de ${targetEmpanadaCount} empanadas/canastitas para esta ${combinedType === 'half-dozen' ? 'media docena' : 'docena'}.`, 'warning', 2000);
        return prev;
      }

      const updatedFlavors = { ...prev, [flavorProduct.id]: newCount };
      if (newCount === 0) {
        delete updatedFlavors[flavorProduct.id]; // Eliminar si la cantidad llega a 0
      }
      return updatedFlavors;
    });
  }, [totalSelectedEmpanadas, targetEmpanadaCount, combinedType, showNotification]);


  // Manejador para añadir al carrito
  const handleAddToCartClick = useCallback(() => {
    const requiresSauce = product.category === 'Pastas' && product.sauces && product.sauces.length > 0;
    const requiresFlavor = product.category === 'Pastas' && product.flavors && product.flavors.length > 0;
    const requiresSize = product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0;

    // Validación para combinación de empanadas/canastitas
    if (isCombinedEmpanadaSelection) {
      if (totalSelectedEmpanadas !== targetEmpanadaCount) {
        showNotification(`Debes seleccionar exactamente ${targetEmpanadaCount} empanadas/canastitas para esta ${combinedType === 'half-dozen' ? 'media docena' : 'docena'}.`, 'warning', 3000);
        return;
      }
      // Verificar stock individual de cada empanada seleccionada
      for (const flavorId in selectedEmpanadaFlavors) {
        const selectedCount = selectedEmpanadaFlavors[flavorId];
        const individualProduct = availableEmpanadaFlavors.find(p => p.id === flavorId);
        // Multiplicar por la cantidad de paquetes (quantity)
        if (!individualProduct || individualProduct.stock < selectedCount * quantity) {
          showNotification(`No hay suficiente stock de "${individualProduct?.name || 'un sabor'}" para tu pedido.`, 'error', 5000);
          return;
        }
      }

      // Prepara el objeto para añadir al carrito para empanadas combinadas
      const itemToAdd = {
        ...product, // El producto principal (ej. "Media Docena de Empanadas")
        quantity: quantity, // Cantidad de medias docenas o docenas
        selectedQuantityType: combinedType,
        combinedEmpanadaFlavors: selectedEmpanadaFlavors, // Guarda la combinación de sabores
        precio: displayPrice, // El precio ya es el de la media docena/docena
        allProducts: allProducts, // Pasar allProducts para que useCart y OrderSummaryModal puedan resolver nombres
      };
      onAddToCart(itemToAdd);
      onClose();
      showNotification(`"${product.name} (${quantity} ${combinedType === 'dozen' ? 'docena(s)' : 'media(s) docena(s)'})" añadido al carrito.`, 'success', 2000);
      return;
    }

    // Lógica existente para otros productos (pizzas, pastas, papas, etc.)
    let actualUnitsToAdd = quantity;
    if (['Empanadas', 'Canastitas'].includes(product.category) && selectedQuantityType === 'half-dozen') {
      actualUnitsToAdd = quantity * 6;
    } else if (['Empanadas', 'Canastitas'].includes(product.category) && selectedQuantityType === 'dozen') {
      actualUnitsToAdd = quantity * 12;
    }

    if (actualUnitsToAdd > 0 && !isOutOfStock) {
      if (requiresSauce && !selectedSauce) {
        showNotification('Por favor, selecciona una salsa para este producto.', 'warning');
        return;
      }
      if (requiresFlavor && !selectedFlavor) {
        showNotification('Por favor, selecciona un sabor para este producto.', 'warning');
        return;
      }
      if (requiresSize && !selectedSize) {
        showNotification('Por favor, selecciona un tamaño para este producto.', 'warning');
        return;
      }
      if (product.category === 'Empanadas y Canastitas' && !selectedQuantityType) {
        showNotification('Por favor, selecciona si quieres por unidad, media docena o docena.', 'warning');
        return;
      }

      // Validar stock antes de añadir
      if (actualUnitsToAdd > product.stock) {
        showNotification(`No hay suficiente stock para añadir ${actualUnitsToAdd} unidades de "${product.name}". Solo quedan ${product.stock} disponibles.`, 'error', 3000);
        return;
      }

      // Prepara el objeto del producto para añadir al carrito
      const itemToAdd = {
        ...product,
        selectedSauce: selectedSauce,
        selectedFlavor: selectedFlavor,
        selectedSize: selectedSize,
        selectedCombinedPizza: selectedCombinedPizza,
        selectedQuantityType: selectedQuantityType, // Tipo de cantidad seleccionada ('unit' para empanadas/canastitas individuales)
        precio: displayPrice, // Usamos el displayPrice calculado que ya considera la combinación o tipo de cantidad
        allProducts: allProducts, // Pasar allProducts para que useCart y OrderSummaryModal puedan resolver nombres
      };

      onAddToCart(itemToAdd, quantity); // quantity aquí es la cantidad de "paquetes" (unidades, medias docenas, docenas)
      onClose();
      let notificationMessage = `"${product.name}`;
      if (selectedCombinedPizza) {
        notificationMessage += ` + ${selectedCombinedPizza.name}`;
      }
      if (product.category === 'Empanadas y Canastitas') {
        notificationMessage += ` (${quantity} ${selectedQuantityType === 'dozen' ? 'docena(s)' : selectedQuantityType === 'half-dozen' ? 'media(s) docena(s)' : 'unidad(es)'})`;
      } else {
        notificationMessage += ` (x${quantity})`;
      }
      notificationMessage += `" añadido al carrito.`;
      showNotification(notificationMessage, 'success', 2000);

    } else {
      showNotification('No se puede añadir este producto al carrito.', 'error');
    }
  }, [quantity, isOutOfStock, onAddToCart, product, onClose, showNotification, selectedSauce, selectedFlavor, selectedSize, selectedCombinedPizza, selectedQuantityType, displayPrice, isCombinedEmpanadaSelection, totalSelectedEmpanadas, targetEmpanadaCount, combinedType, availableEmpanadaFlavors, allProducts]);


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
      const newSauces = [...(prev.sauces || [])];
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
      const newFlavors = [...(prev.flavors || [])];
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

  // Manejadores para la edición de tamaños en modo admin
  const handleAdminSizeChange = useCallback((index, field, value) => {
    setEditedProduct(prev => {
      const newSizes = [...(prev.sizes || [])];
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

  // NUEVO: Manejadores para la edición de precios de docena/media docena en modo admin
  const handleAdminPriceChange = useCallback((e) => {
    const { name, value } = e.target;
    setEditedProduct(prev => ({
      ...prev,
      [name]: Number(value),
    }));
  }, []);


  const handleSaveEditedProduct = useCallback(async () => {
    setIsSaving(true);
    try {
      const productRef = doc(db, `artifacts/${appId}/public/data/products`, editedProduct.id);
      await updateDoc(productRef, {
        name: editedProduct.name,
        descripcion: editedProduct.descripcion,
        precio: Number(editedProduct.precio),
        // Asegúrate de que la categoría coincida con la que usas en ProductForm
        precioMediaDocena: editedProduct.category === 'Empanadas y Canastitas' ? Number(editedProduct.precioMediaDocena) : null,
        precioDocena: editedProduct.category === 'Empanadas y Canastitas' ? Number(editedProduct.precioDocena) : null,
        category: editedProduct.category,
        stock: Number(editedProduct.stock),
        image: editedProduct.image,
        sauces: editedProduct.category === 'Pastas' ? (editedProduct.sauces || []) : [],
        flavors: editedProduct.category === 'Pastas' ? (editedProduct.flavors || []) : [],
        sizes: editedProduct.category === 'Papas Fritas' ? (editedProduct.sizes || []) : [],
      });
      showNotification('Producto actualizado con éxito (Admin).', 'success');
      setIsEditing(false);
    } catch (e) {
      console.error("Error al guardar producto (Admin):", e);
      showNotification(`Error al guardar producto (Admin): ${e.message}`, 'error');
    } finally {
      setIsSaving(false);
    }
  }, [db, appId, editedProduct, showNotification]);

  const handleDeleteProduct = useCallback(async () => {
    showNotification('¿Estás seguro de que quieres eliminar este producto? Esta acción es irreversible.', 'confirm', 5000, () => {
      const executeDelete = async () => {
        setIsDeleting(true);
        try {
          await deleteDoc(doc(db, `artifacts/${appId}/public/data/products`, product.id));
          showNotification('Producto eliminado con éxito (Admin).', 'success');
          onClose();
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
    // Contenedor principal del modal: Fijo, cubre toda la pantalla, centrado y con fondo oscuro
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      {/* Contenido del modal: Responsive, con ancho máximo y scroll si es necesario */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 sm:p-8 w-full max-w-xl md:max-w-3xl lg:max-w-4xl transform scale-95 animate-scale-in max-h-[90vh] overflow-y-auto custom-scrollbar">
        {/* Botón de cerrar: Posición absoluta, responsivo */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
          aria-label="Cerrar detalles del producto"
        >
          <X size={28} />
        </button>

        {/* Botones de Admin: Posición absoluta, responsivo */}
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

        {/* Contenido del Producto: Diseño flexible para apilar en móviles y lado a lado en pantallas grandes */}
        <div className="flex flex-col md:flex-row gap-6 mt-10 md:mt-0">
          {/* Imagen del producto: Ancho completo en móviles, mitad en md+ */}
          <div className="md:w-1/2 flex-shrink-0">
            <img
              src={isEditing ? editedProduct.image : product.image || `https://placehold.co/400x300/A0522D/F0F8FF?text=${encodeURIComponent(product.name.substring(0, 3))}`}
              alt={isEditing ? editedProduct.name : product.name}
              className="w-full h-64 sm:h-72 md:h-80 object-cover rounded-xl shadow-md"
              onError={(e) => { e.target.onerror = null; e.target.src = `https://placehold.co/400x300/A0522D/F0F8FF?text=${encodeURIComponent((isEditing ? editedProduct.name : product.name).substring(0, 3))}`; }}
            />
          </div>

          {/* Detalles del producto y formularios: Ancho completo en móviles, mitad en md+ */}
          <div className="md:w-1/2 flex flex-col justify-between">
            <div>
              {isEditing ? (
                // Modo de Edición (Admin)
                <>
                  <input
                    type="text"
                    name="name"
                    value={editedProduct.name}
                    onChange={handleEditChange}
                    className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  <textarea
                    name="descripcion"
                    value={editedProduct.descripcion}
                    onChange={handleEditChange}
                    rows="3"
                    className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  ></textarea>
                  <label htmlFor="precio" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Precio por Unidad ($)</label>
                  <input
                    type="number"
                    name="precio"
                    value={editedProduct.precio}
                    onChange={handleEditChange}
                    min="0"
                    step="0.01"
                    className="text-xl sm:text-2xl font-bold text-red-600 dark:text-red-400 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  {/* NUEVOS CAMPOS DE PRECIO PARA ADMIN (Empanadas/Canastitas) */}
                  {editedProduct.category === 'Empanadas y Canastitas' && (
                    <>
                      <label htmlFor="precioMediaDocena" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Precio Media Docena ($)</label>
                      <input
                        type="number"
                        name="precioMediaDocena"
                        value={editedProduct.precioMediaDocena}
                        onChange={handleAdminPriceChange}
                        min="0"
                        step="0.01"
                        className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-2 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                      />
                      <label htmlFor="precioDocena" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Precio Docena ($)</label>
                      <input
                        type="number"
                        name="precioDocena"
                        value={editedProduct.precioDocena}
                        onChange={handleAdminPriceChange}
                        min="0"
                        step="0.01"
                        className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                      />
                    </>
                  )}
                  <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Stock</label>
                  <input
                    type="number"
                    name="stock"
                    value={editedProduct.stock}
                    onChange={handleEditChange}
                    min="0"
                    className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">Categoría</label>
                  <input
                    type="text"
                    name="category"
                    value={editedProduct.category}
                    onChange={handleEditChange}
                    className="text-base sm:text-lg text-gray-600 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">URL de Imagen</label>
                  <input
                    type="text"
                    name="image"
                    value={editedProduct.image}
                    onChange={handleImageURLChange}
                    placeholder="URL de la imagen"
                    className="text-sm sm:text-base text-gray-600 dark:text-gray-300 mb-4 w-full bg-gray-100 dark:bg-gray-700 p-2 rounded"
                  />
                  {/* Edición de Salsas para Admin */}
                  {editedProduct.category === 'Pastas' && (
                    <div className="mt-4 p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Editar Salsas</h4>
                      {(editedProduct.sauces || []).map((sauce, index) => (
                        <div key={sauce.id || index} className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                          <input type="text" value={sauce.name} onChange={(e) => handleAdminSauceChange(index, 'name', e.target.value)} placeholder="Nombre de la salsa" className="flex-grow w-full sm:w-auto px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white" />
                          <input type="number" value={sauce.price} onChange={(e) => handleAdminSauceChange(index, 'price', e.target.value)} min="0" step="0.01" className="w-full sm:w-20 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white" />
                          <label className="flex items-center text-sm text-gray-700 dark:text-gray-200">
                            <input type="checkbox" checked={sauce.isFree} onChange={(e) => handleAdminSauceChange(index, 'isFree', e.target.checked)} className="mr-1" />
                            Gratis
                          </label>
                          <button type="button" onClick={() => handleRemoveAdminSauce(index)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full" aria-label="Eliminar salsa">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={handleAddAdminSauce} className="mt-3 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1 text-sm">
                        <PlusCircle size={18} /> Añadir Salsa
                      </button>
                    </div>
                  )}
                  {/* Edición de Sabores para Admin */}
                  {editedProduct.category === 'Pastas' && (
                    <div className="mt-4 p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Editar Sabores</h4>
                      {(editedProduct.flavors || []).map((flavor, index) => (
                        <div key={flavor.id || index} className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                          <input type="text" value={flavor.name} onChange={(e) => handleAdminFlavorChange(index, 'name', e.target.value)} placeholder="Nombre del sabor" className="flex-grow w-full sm:w-auto px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white" />
                          <button type="button" onClick={() => handleRemoveAdminFlavor(index)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full" aria-label="Eliminar sabor">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={handleAddAdminFlavor} className="mt-3 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1 text-sm">
                        <PlusCircle size={18} /> Añadir Sabor
                      </button>
                    </div>
                  )}
                  {/* Edición de Tamaños para Admin */}
                  {editedProduct.category === 'Papas Fritas' && (
                    <div className="mt-4 p-3 sm:p-4 border border-gray-300 dark:border-gray-600 rounded-md">
                      <h4 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Editar Tamaños</h4>
                      {(editedProduct.sizes || []).map((size, index) => (
                        <div key={size.id || index} className="flex flex-col sm:flex-row items-center gap-2 mb-2">
                          <input type="text" value={size.name} onChange={(e) => handleAdminSizeChange(index, 'name', e.target.value)} placeholder="Nombre del tamaño" className="flex-grow w-full sm:w-auto px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white" />
                          <input type="number" value={size.price} onChange={(e) => handleAdminSizeChange(index, 'price', e.target.value)} min="0" step="0.01" placeholder="Precio adicional" className="w-full sm:w-28 px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:text-white" />
                          <button type="button" onClick={() => handleRemoveAdminSize(index)} className="p-1 bg-red-500 hover:bg-red-600 text-white rounded-full" aria-label="Eliminar tamaño">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                      <button type="button" onClick={handleAddAdminSize} className="mt-3 px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-md flex items-center gap-1 text-sm">
                        <PlusCircle size={18} /> Añadir Tamaño
                      </button>
                    </div>
                  )}
                </>
              ) : (
                // Modo de Visualización (Usuario Final)
                <>
                  <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">{product.name}</h2>
                  <p className="text-sm sm:text-base text-gray-700 dark:text-gray-300 mb-4">{product.descripcion}</p>
                  <p className="text-3xl sm:text-4xl font-extrabold text-red-600 dark:text-red-400 mb-4">${displayPrice}</p>
                  {product.stock <= 5 && product.stock > 0 && (
                    <p className="text-orange-500 dark:text-orange-300 font-semibold text-sm mb-2">
                      ¡Últimas {product.stock} unidades!
                    </p>
                  )}
                  {isOutOfStock && (
                    <p className="text-red-500 dark:text-red-300 font-semibold text-sm mb-2">
                      <Info size={18} className="inline-block mr-1" /> Producto agotado
                    </p>
                  )}

                  {/* Selector de Empanadas/Canastitas Combinadas */}
                  {isCombinedEmpanadaSelection && (
                    <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-900">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <ListPlus size={24} className="text-red-500" /> Arma tu {combinedType === 'half-dozen' ? 'Media Docena' : 'Docena'}
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Selecciona **{targetEmpanadaCount}** unidades de tus sabores favoritos para completar este pedido.
                      </p>
                      <div className="text-center text-lg font-bold mb-4">
                        Llevas: <span className={`font-extrabold ${totalSelectedEmpanadas === targetEmpanadaCount ? 'text-green-600' : totalSelectedEmpanadas > targetEmpanadaCount ? 'text-red-600' : 'text-orange-500'}`}>
                          {totalSelectedEmpanadas} / {targetEmpanadaCount}
                        </span>
                      </div>
                      {totalSelectedEmpanadas > targetEmpanadaCount && (
                         <p className="text-red-500 text-sm mb-2 text-center animate-pulse">¡Has seleccionado {totalSelectedEmpanadas - targetEmpanadaCount} unidades de más!</p>
                      )}
                      {totalSelectedEmpanadas < targetEmpanadaCount && (
                         <p className="text-orange-500 text-sm mb-2 text-center animate-pulse">Te faltan {targetEmpanadaCount - totalSelectedEmpanadas} unidades.</p>
                      )}

                      {availableEmpanadaFlavors.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 max-h-80 overflow-y-auto custom-scrollbar pr-2"> {/* Columnas responsivas y scroll */}
                          {availableEmpanadaFlavors.map(flavorProd => (
                            <div key={flavorProd.id} className="flex flex-col items-center justify-between p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 shadow-sm hover:shadow-md transition-shadow duration-200">
                              <span className="text-gray-900 dark:text-gray-100 text-sm sm:text-base font-medium text-center mb-2">
                                {flavorProd.name}
                              </span>
                              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                {flavorProd.stock <= 5 && flavorProd.stock > 0 && (
                                  <span className="text-orange-500">({flavorProd.stock} en stock)</span>
                                )}
                                {flavorProd.stock === 0 && (
                                  <span className="text-red-500">(Agotado)</span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSelectEmpanadaFlavor(flavorProd, 'decrease')}
                                  className="p-1 sm:p-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-full transition-colors duration-200"
                                  disabled={(selectedEmpanadaFlavors[flavorProd.id] || 0) <= 0}
                                  aria-label={`Disminuir cantidad de ${flavorProd.name}`}
                                >
                                  <Minus size={16} sm:size={18} /> {/* Icono responsivo */}
                                </button>
                                <span className="px-2 sm:px-3 py-1 font-semibold text-base sm:text-lg text-gray-900 dark:text-gray-100">
                                  {selectedEmpanadaFlavors[flavorProd.id] || 0}
                                </span>
                                <button
                                  onClick={() => handleSelectEmpanadaFlavor(flavorProd, 'increase')}
                                  className="p-1 sm:p-2 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors duration-200"
                                  disabled={
                                    flavorProd.stock === 0 ||
                                    (selectedEmpanadaFlavors[flavorProd.id] || 0) >= flavorProd.stock ||
                                    totalSelectedEmpanadas >= targetEmpanadaCount
                                  }
                                  aria-label={`Aumentar cantidad de ${flavorProd.name}`}
                                >
                                  <Plus size={16} sm:size={18} /> {/* Icono responsivo */}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-gray-600 dark:text-gray-400 p-4 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm sm:text-base">
                          No se encontraron sabores individuales de empanadas/canastitas disponibles.
                          Asegúrate de que tus productos individuales tengan las categorías correctas (ej. 'Empanada Individual', 'Canastita Individual', 'Empanada', 'Canastita', **'Empanadas y Canastitas'**) y stock disponible.
                        </p>
                      )}
                    </div>
                  )}


                  {/* Selector de Pizza Combinada (solo para Pizzas) */}
                  {product.category === 'Pizzas' && availablePizzas.length > 0 && (
                    <div className="mb-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg shadow-inner bg-gray-50 dark:bg-gray-900">
                      <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                        <Pizza size={24} className="text-indigo-500" /> Combina tu Pizza
                      </h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300 mb-3">
                        Selecciona la segunda mitad de tu pizza. El precio final será el de la pizza de mayor valor.
                      </p>
                      <select
                        value={selectedCombinedPizza?.id || ''}
                        onChange={(e) => {
                          const pizzaId = e.target.value;
                          const pizza = availablePizzas.find(p => p.id === pizzaId);
                          setSelectedCombinedPizza(pizza || null);
                        }}
                        className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-colors duration-200 text-sm sm:text-base"
                        aria-label="Seleccionar segunda mitad de pizza"
                      >
                        <option value="">No combinar (Pizza completa)</option>
                        {availablePizzas.map(pizza => (
                          <option key={pizza.id} value={pizza.id}>
                            {pizza.name} (${Math.floor(pizza.precio)})
                          </option>
                        ))}
                      </select>
                      {selectedCombinedPizza && (
                        <button
                          onClick={() => setSelectedCombinedPizza(null)}
                          className="mt-2 text-red-500 hover:text-red-700 flex items-center text-sm transition-colors duration-200"
                          aria-label="Quitar combinación de pizza"
                        >
                          <Eraser size={16} className="mr-1" /> Quitar combinación
                        </button>
                      )}
                    </div>
                  )}

                  {/* Selector de Salsa (solo para Pastas) */}
                  {product.category === 'Pastas' && product.sauces && product.sauces.length > 0 && (
                    <div className="mb-4">
                      <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Elige tu Salsa:</p>
                      <div className="flex flex-wrap gap-2">
                        {product.sauces.map((sauce) => (
                          <label
                            key={sauce.id}
                            className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-all duration-200 text-sm sm:text-base
                              ${selectedSauce?.id === sauce.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                              }`}
                            aria-label={`Seleccionar salsa ${sauce.name}`}
                          >
                            <input
                              type="radio"
                              name="sauce"
                              value={sauce.id}
                              checked={selectedSauce?.id === sauce.id}
                              onChange={() => setSelectedSauce(sauce)}
                              className="mr-2 hidden"
                            />
                            {sauce.name}
                            {!sauce.isFree && sauce.price > 0 && (
                              <span className="ml-1 text-xs font-bold opacity-80"> (+${Math.floor(sauce.price)})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selector de Sabor (solo para Pastas) */}
                  {product.category === 'Pastas' && product.flavors && product.flavors.length > 0 && (
                    <div className="mb-4">
                      <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Elige tu Sabor:</p>
                      <div className="flex flex-wrap gap-2">
                        {product.flavors.map((flavor) => (
                          <label
                            key={flavor.id}
                            className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-all duration-200 text-sm sm:text-base
                              ${selectedFlavor?.id === flavor.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                              }`}
                            aria-label={`Seleccionar sabor ${flavor.name}`}
                          >
                            <input
                              type="radio"
                              name="flavor"
                              value={flavor.id}
                              checked={selectedFlavor?.id === flavor.id}
                              onChange={() => setSelectedFlavor(flavor)}
                              className="mr-2 hidden"
                            />
                            {flavor.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Selector de Tamaño (solo para Papas Fritas) */}
                  {product.category === 'Papas Fritas' && product.sizes && product.sizes.length > 0 && (
                    <div className="mb-4">
                      <p className="text-base sm:text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">Elige tu Tamaño:</p>
                      <div className="flex flex-wrap gap-2">
                        {product.sizes.map((size) => (
                          <label
                            key={size.id}
                            className={`flex items-center px-3 py-1 rounded-full border cursor-pointer transition-all duration-200 text-sm sm:text-base
                              ${selectedSize?.id === size.id
                                ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                                : 'bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600'
                              }`}
                            aria-label={`Seleccionar tamaño ${size.name}`}
                          >
                            <input
                              type="radio"
                              name="size"
                              value={size.id}
                              checked={selectedSize?.id === size.id}
                              onChange={() => setSelectedSize(size)}
                              className="mr-2 hidden"
                            />
                            {size.name}
                            {size.price > 0 && (
                              <span className="ml-1 text-xs font-bold opacity-80"> (+${Math.floor(size.price)})</span>
                            )}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Controles de cantidad y botón de añadir al carrito: Flexibles y centrados */}
            {!isEditing && (
              <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4"> {/* Gap responsivo */}
                <div className="flex items-center border border-gray-300 dark:border-gray-600 rounded-xl overflow-hidden shadow-sm w-full sm:w-auto"> {/* Ancho completo en móviles */}
                  <button
                    onClick={handleDecreaseQuantity}
                    className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-l-xl transition-colors duration-200"
                    aria-label="Disminuir cantidad de paquetes"
                    disabled={quantity <= 1 || isOutOfStock}
                  >
                    <MinusCircle size={24} />
                  </button>
                  <span className="px-5 py-3 text-xl font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-800">
                    {quantity}
                  </span>
                  <button
                    onClick={handleIncreaseQuantity}
                    className="p-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-r-xl transition-colors duration-200"
                    aria-label="Aumentar cantidad de paquetes"
                    disabled={isOutOfStock || (isCombinedEmpanadaSelection && quantity >= product.stock) || (!isCombinedEmpanadaSelection && product.category === 'Pizzas' && selectedCombinedPizza && quantity >= Math.min(product.stock, selectedCombinedPizza.stock)) || (!isCombinedEmpanadaSelection && quantity >= product.stock)}
                  >
                    <PlusCircle size={24} />
                  </button>
                </div>
                <button
                  onClick={handleAddToCartClick}
                  disabled={isOutOfStock || quantity === 0 || (isCombinedEmpanadaSelection && totalSelectedEmpanadas !== targetEmpanadaCount)}
                  className={`w-full sm:w-auto font-bold py-3 px-6 rounded-xl text-lg flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 ${
                    (isOutOfStock || quantity === 0 || (isCombinedEmpanadaSelection && totalSelectedEmpanadas !== targetEmpanadaCount))
                      ? 'bg-gray-400 dark:bg-gray-600 text-white cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white focus:ring-red-300'
                  }`}
                  aria-label="Añadir al carrito"
                >
                  <ShoppingCart size={24} /> {isOutOfStock ? 'Agotado' : 'Añadir al Carrito'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Sección de Reseñas: Margen superior responsivo */}
        <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700 space-y-8">
          <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            Reseñas y Calificaciones
          </h3>

          {loadingReviews ? (
            <p className="text-center text-gray-600 dark:text-gray-300 text-sm sm:text-base">Cargando reseñas...</p>
          ) : reviewError ? (
            <p className="text-center text-red-600 dark:text-red-400 text-sm sm:text-base">{reviewError}</p>
          ) : (
            // Filtrar reseñas para mostrar al usuario final solo las aprobadas
            <ReviewSection reviews={reviews.filter(review => review.approved)} />
          )}

          {/* Formulario de Reseñas */}
          {userId ? ( // Solo permite dejar reseña si hay un usuario logueado
            <ReviewForm onSubmit={handleReviewSubmit} />
          ) : (
            <p className="text-center text-gray-600 dark:text-gray-300 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg shadow-inner text-sm sm:text-base">
              Inicia sesión para dejar una reseña sobre este producto.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProductDetailsModal;
