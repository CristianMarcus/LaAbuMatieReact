import React, { useState, useEffect, useCallback } from 'react';
import { XCircle, Image as ImageIcon, Loader, Trash2, PlusCircle } from 'lucide-react';

const ProductForm = ({ product, onClose, onSave, showNotification, categories }) => { // AÑADIDO: categories prop
  const [formData, setFormData] = useState({
    name: '',
    descripcion: '',
    precio: '',
    category: '',
    stock: '',
    image: '', // URL de la imagen
    sauces: [], // Campo para salsas
    flavors: [], // Campo para sabores
    sizes: [], // NUEVO: Campo para tamaños
  });
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        descripcion: product.descripcion || '',
        precio: product.precio || '',
        category: product.category || '',
        stock: product.stock || 0,
        image: product.image || '',
        sauces: product.sauces || [],
        flavors: product.flavors || [],
        sizes: product.sizes || [], // NUEVO: Inicializar tamaños
      });
      setImagePreview(product.image || '');
    } else {
      setFormData({
        name: '',
        descripcion: '',
        precio: '',
        category: '',
        stock: 0,
        image: '',
        sauces: [],
        flavors: [],
        sizes: [], // NUEVO: Inicializar tamaños para nuevo producto
      });
      setImagePreview('');
    }
  }, [product]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'precio' || name === 'stock' ? Number(value) : value, // Convertir a número si es precio o stock
    }));
  }, []);

  const handleImageChange = useCallback((e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    } else {
      setImageFile(null);
      setImagePreview(product?.image || ''); // Volver a la imagen original si se cancela la selección
    }
  }, [product]);

  const handleSauceChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newSauces = [...prev.sauces];
      newSauces[index] = {
        ...newSauces[index],
        [field]: field === 'price' ? Number(value) : value,
      };
      return { ...prev, sauces: newSauces };
    });
  }, []);

  const handleAddSauce = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      sauces: [...prev.sauces, { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), name: '', price: 0, isFree: false }],
    }));
  }, []);

  const handleRemoveSauce = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      sauces: prev.sauces.filter((_, i) => i !== index),
    }));
  }, []);

  const handleFlavorChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newFlavors = [...prev.flavors];
      newFlavors[index] = {
        ...newFlavors[index],
        [field]: value,
      };
      return { ...prev, flavors: newFlavors };
    });
  }, []);

  const handleAddFlavor = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      flavors: [...prev.flavors, { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), name: '' }],
    }));
  }, []);

  const handleRemoveFlavor = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      flavors: prev.flavors.filter((_, i) => i !== index),
    }));
  }, []);

  // NUEVO: Manejadores para la gestión de tamaños
  const handleSizeChange = useCallback((index, field, value) => {
    setFormData(prev => {
      const newSizes = [...prev.sizes];
      newSizes[index] = {
        ...newSizes[index],
        [field]: field === 'price' ? Number(value) : value,
      };
      return { ...prev, sizes: newSizes };
    });
  }, []);

  const handleAddSize = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      sizes: [...prev.sizes, { id: Date.now().toString() + Math.random().toString(36).substring(2, 9), name: '', price: 0 }],
    }));
  }, []);

  const handleRemoveSize = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      sizes: prev.sizes.filter((_, i) => i !== index),
    }));
  }, []);


  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFormLoading(true);

    let imageUrl = formData.image;

    // Lógica para subir la imagen a Cloudinary si se seleccionó un nuevo archivo
    if (imageFile) {
      setIsUploadingImage(true);
      const cloudinaryCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
      const cloudinaryUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

      if (!cloudinaryCloudName || !cloudinaryUploadPreset) {
        showNotification("Error: Las variables de entorno de Cloudinary no están configuradas. No se pudo subir la imagen.", "error", 7000);
        console.error("Cloudinary environment variables missing!");
        setIsUploadingImage(false);
        setFormLoading(false);
        return; // Detener la ejecución
      }

      const uploadData = new FormData();
      uploadData.append('file', imageFile);
      uploadData.append('upload_preset', cloudinaryUploadPreset);

      try {
        const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloudName}/image/upload`, {
          method: 'POST',
          body: uploadData,
        });

        if (!response.ok) {
          const errorData = await response.json();
          console.error("Cloudinary upload failed response:", response.status, errorData);
          throw new Error(errorData.error?.message || `Error al subir la imagen a Cloudinary. Estado: ${response.status}`);
        }

        const data = await response.json();
        imageUrl = data.secure_url; // Obtener la URL segura de la imagen subida
        showNotification('Imagen subida con éxito a Cloudinary.', 'success', 2000);
      } catch (error) {
        console.error('Error subiendo imagen:', error);
        showNotification(`Error al subir la imagen: ${error.message}`, 'error', 5000);
        setIsUploadingImage(false);
        setFormLoading(false);
        return; // Detener la ejecución
      } finally {
        setIsUploadingImage(false); // Asegúrate de que esto se resetee
      }
    } else if (product?.image && !imagePreview) {
      // Si antes había una imagen y ahora no hay preview (se borró la selección),
      // significa que el usuario quiere eliminar la imagen.
      // NOTA: La eliminación de Cloudinary se maneja por su API o consola,
      // aquí solo limpiamos la URL en nuestro Firestore.
      imageUrl = '';
      showNotification('Imagen desvinculada del producto. Para eliminarla permanentemente de Cloudinary se requiere acción manual.', 'warning', 5000);
    }


    // Preparar datos para guardar en Firestore
    const dataToSave = {
      ...formData,
      precio: Number(formData.precio),
      stock: Number(formData.stock),
      image: imageUrl, // Guarda la URL real de la imagen (de Cloudinary)
      // Solo guarda salsas y sabores si la categoría es 'Pastas'
      sauces: formData.category === 'Pastas' && Array.isArray(formData.sauces)
        ? formData.sauces.map(s => ({
            id: s.id,
            name: s.name,
            price: Number(s.price),
            isFree: s.isFree,
          }))
        : [],
      flavors: formData.category === 'Pastas' && Array.isArray(formData.flavors)
        ? formData.flavors.map(f => ({
            id: f.id,
            name: f.name,
          }))
        : [],
      // NUEVO: Solo guarda tamaños si la categoría es 'Papas Fritas'
      sizes: formData.category === 'Papas Fritas' && Array.isArray(formData.sizes)
        ? formData.sizes.map(s => ({
            id: s.id,
            name: s.name,
            price: Number(s.price),
          }))
        : [],
    };

    try {
      await onSave(dataToSave);
      showNotification(product ? 'Producto actualizado con éxito.' : 'Producto añadido con éxito.', 'success', 3000);
      onClose(); // Cerrar el formulario después de guardar
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      showNotification(`Error al guardar el producto: ${error.message}`, 'error', 5000);
    } finally {
      setFormLoading(false);
    }
  }, [formData, imageFile, onSave, onClose, product, showNotification, imagePreview]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-lg lg:max-w-xl xl:max-w-3xl transform scale-95 animate-scale-in max-h-[90vh] overflow-y-auto relative"> {/* Añadido max-h-[90vh] overflow-y-auto */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
          aria-label="Cerrar formulario"
        >
          <XCircle size={28} />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 text-center">
          {product ? 'Editar Producto' : 'Añadir Nuevo Producto'}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Nombre del Producto
            </label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              required
              autoComplete="product-name" // Añadido autocomplete
            />
          </div>

          <div>
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              rows="3"
              value={formData.descripcion}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              autoComplete="off" // Añadido autocomplete
            ></textarea>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Precio ($)
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                required
                min="0"
                step="0.01"
                autoComplete="off" // Añadido autocomplete
              />
            </div>
            <div>
              <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Stock
              </label>
              <input
                type="number"
                id="stock"
                name="stock"
                value={formData.stock}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
                required
                min="0"
                autoComplete="off" // Añadido autocomplete
              />
            </div>
          </div>

          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Categoría
            </label>
            <select
              id="category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              autoComplete="off"
            >
              <option value="">Selecciona una categoría</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>

          {/* SECCIÓN PARA SABORES (solo si la categoría es Pastas) */}
          {formData.category === 'Pastas' && (
            <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Sabores Disponibles</h3>
              {formData.flavors.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">No hay sabores añadidos. Haz clic en "Añadir Sabor" para agregar uno.</p>
              )}
              {formData.flavors.map((flavor, index) => (
                <div key={flavor.id || index} className="flex flex-col sm:flex-row gap-2 mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-md items-center">
                  <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor={`flavor-name-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Nombre del Sabor</label>
                    <input
                      type="text"
                      id={`flavor-name-${index}`}
                      name={`flavor-name-${index}`} // Añadido name
                      value={flavor.name}
                      onChange={(e) => handleFlavorChange(index, 'name', e.target.value)}
                      placeholder="Ej: Ricota y Verdura"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 dark:bg-gray-600 dark:text-white"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFlavor(index)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200 flex-shrink-0"
                    aria-label="Eliminar sabor"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddFlavor}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors duration-200 flex items-center gap-2"
              >
                <PlusCircle size={18} /> Añadir Sabor
              </button>
            </div>
          )}

          {/* SECCIÓN PARA SALSAS (solo si la categoría es Pastas) */}
          {formData.category === 'Pastas' && (
            <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Salsas Disponibles</h3>
              {formData.sauces.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">No hay salsas añadidas. Haz clic en "Añadir Salsa" para agregar una.</p>
              )}
              {formData.sauces.map((sauce, index) => (
                <div key={sauce.id || index} className="flex flex-col sm:flex-row gap-2 mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-md items-center">
                  <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor={`sauce-name-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Nombre</label>
                    <input
                      type="text"
                      id={`sauce-name-${index}`}
                      name={`sauce-name-${index}`} // Añadido name
                      value={sauce.name}
                      onChange={(e) => handleSauceChange(index, 'name', e.target.value)}
                      placeholder="Nombre de la salsa"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 dark:bg-gray-600 dark:text-white"
                      autoComplete="off"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label htmlFor={`sauce-price-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Precio</label>
                    <input
                      type="number"
                      id={`sauce-price-${index}`}
                      name={`sauce-price-${index}`} // Añadido name
                      value={sauce.price}
                      onChange={(e) => handleSauceChange(index, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 dark:bg-gray-600 dark:text-white"
                      autoComplete="off"
                    />
                  </div>
                  <div className="w-full sm:w-auto flex items-center mt-2 sm:mt-0">
                    <input
                      type="checkbox"
                      id={`sauce-free-${index}`}
                      name={`sauce-free-${index}`} // Añadido name
                      checked={sauce.isFree}
                      onChange={(e) => handleSauceChange(index, 'isFree', e.target.checked)}
                      className="mr-2"
                      autoComplete="off"
                    />
                    <label htmlFor={`sauce-free-${index}`} className="text-sm font-medium text-gray-700 dark:text-gray-200">Gratis</label>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSauce(index)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200 flex-shrink-0"
                    aria-label="Eliminar salsa"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSauce}
                className="mt-3 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-md shadow-sm transition-colors duration-200 flex items-center gap-2"
              >
                <PlusCircle size={18} /> Añadir Salsa
              </button>
            </div>
          )}

          {/* NUEVO: SECCIÓN PARA TAMAÑOS (solo si la categoría es Papas Fritas) */}
          {formData.category === 'Papas Fritas' && (
            <div className="mb-4 p-4 border border-gray-300 dark:border-gray-600 rounded-md">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Tamaños Disponibles</h3>
              {formData.sizes.length === 0 && (
                <p className="text-gray-600 dark:text-gray-400 mb-3">No hay tamaños añadidos. Haz clic en "Añadir Tamaño" para agregar uno.</p>
              )}
              {formData.sizes.map((size, index) => (
                <div key={size.id || index} className="flex flex-col sm:flex-row gap-2 mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-md items-center">
                  <div className="flex-grow w-full sm:w-auto">
                    <label htmlFor={`size-name-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Nombre del Tamaño</label>
                    <input
                      type="text"
                      id={`size-name-${index}`}
                      name={`size-name-${index}`}
                      value={size.name}
                      onChange={(e) => handleSizeChange(index, 'name', e.target.value)}
                      placeholder="Ej: Chico, Mediano, Grande"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 dark:bg-gray-600 dark:text-white"
                      autoComplete="off"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label htmlFor={`size-price-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Precio Adicional</label>
                    <input
                      type="number"
                      id={`size-price-${index}`}
                      name={`size-price-${index}`}
                      value={size.price}
                      onChange={(e) => handleSizeChange(index, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 dark:bg-gray-600 dark:text-white"
                      autoComplete="off"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveSize(index)}
                    className="p-2 bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors duration-200 flex-shrink-0"
                    aria-label="Eliminar tamaño"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={handleAddSize}
                className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm transition-colors duration-200 flex items-center gap-2"
              >
                <PlusCircle size={18} /> Añadir Tamaño
              </button>
            </div>
          )}


          <div>
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Imagen del Producto
            </label>
            <input
              type="file"
              id="image"
              name="image" // Añadido name
              accept="image/*"
              onChange={handleImageChange}
              className="w-full text-gray-900 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-red-50 file:text-red-700 hover:file:bg-red-100 dark:file:bg-red-900 dark:file:text-red-200 dark:hover:file:bg-red-800"
              autoComplete="off" // Añadido autocomplete
            />
            {(imagePreview && !isUploadingImage) && (
              <div className="mt-4 flex flex-col items-center">
                <img src={imagePreview} alt="Previsualización" className="max-w-xs h-auto rounded-lg shadow-md" />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">Previsualización de la imagen.</p>
              </div>
            )}
            {isUploadingImage && (
              <div className="mt-4 flex items-center text-red-600 dark:text-red-400">
                <Loader size={20} className="animate-spin mr-2" /> Subiendo imagen...
              </div>
            )}
            {!imagePreview && formData.image && (
                <div className="mt-4 flex items-center text-gray-500 dark:text-gray-400">
                    <ImageIcon size={20} className="mr-2" /> Sin vista previa de archivo seleccionado, usando imagen existente.
                </div>
            )}
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-600 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 rounded-md shadow-sm transition-all duration-200"
              disabled={formLoading || isUploadingImage}
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow-sm transition-all duration-200 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={formLoading || isUploadingImage}
            >
              {(formLoading || isUploadingImage) && <Loader size={20} className="animate-spin mr-2" />}
              {product ? 'Guardar Cambios' : 'Añadir Producto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
