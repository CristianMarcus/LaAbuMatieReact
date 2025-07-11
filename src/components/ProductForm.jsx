import React, { useState, useEffect, useCallback } from 'react';
import { XCircle, Image as ImageIcon, Loader, Trash2, PlusCircle } from 'lucide-react';

const ProductForm = ({ product, onClose, onSave, showNotification }) => {
  const [formData, setFormData] = useState({
    name: '',
    descripcion: '',
    precio: '',
    category: '',
    stock: '',
    image: '',
    sauces: [],
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
      });
      setImagePreview('');
    }
  }, [product]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
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
      setImagePreview(formData.image);
    }
  }, [formData.image]);

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
      sauces: [...prev.sauces, { id: Date.now().toString(), name: '', price: 0, isFree: false }],
    }));
  }, []);

  const handleRemoveSauce = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      sauces: prev.sauces.filter((_, i) => i !== index),
    }));
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setFormLoading(true);
    let imageUrl = formData.image;

    if (imageFile) {
      setIsUploadingImage(true);
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        imageUrl = `https://placehold.co/400x300/A0522D/F0F8FF?text=${encodeURIComponent(formData.name || 'Producto')}`;
        showNotification('Imagen subida con éxito (simulado).', 'success');
      } catch (uploadError) {
        console.error("Error uploading image:", uploadError);
        showNotification('Error al subir la imagen.', 'error');
        setFormLoading(false);
        setIsUploadingImage(false);
        return;
      } finally {
        setIsUploadingImage(false);
      }
    }

    const dataToSave = {
      ...formData,
      precio: Number(formData.precio),
      stock: Number(formData.stock),
      image: imageUrl,
      sauces: formData.category === 'Pastas' ? formData.sauces.map(s => ({
        id: s.id,
        name: s.name,
        price: Number(s.price),
        isFree: s.isFree,
      })) : [],
    };

    try {
      await onSave(dataToSave);
      onClose();
    } catch (saveError) {
      console.error("Error saving product:", saveError);
      showNotification('Error al guardar el producto.', 'error');
    } finally {
      setFormLoading(false);
    }
  }, [formData, imageFile, onSave, onClose, showNotification]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto custom-scrollbar">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
          aria-label="Cerrar formulario de producto"
        >
          <XCircle size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          {product ? 'Editar Producto' : 'Añadir Nuevo Producto'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Nombre
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro ===
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              />
            </div>
            <div>
              <label htmlFor="precio" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
                Precio
              </label>
              <input
                type="number"
                id="precio"
                name="precio"
                value={formData.precio}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro ===
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="descripcion" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Descripción
            </label>
            <textarea
              id="descripcion"
              name="descripcion"
              value={formData.descripcion}
              onChange={handleChange}
              rows="3"
              // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro ===
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
            ></textarea>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro ===
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              >
                <option value="">Selecciona una categoría</option>
                <option value="Pizzas">Pizzas</option>
                <option value="Empanadas">Empanadas</option>
                <option value="Pastas">Pastas</option>
                <option value="Bebidas">Bebidas</option>
                <option value="Postres">Postres</option>
                <option value="Combos">Combos</option>
                <option value="Otros">Otros</option>
              </select>
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
                required
                min="0"
                // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro ===
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-red-500 focus:border-red-500 bg-white text-gray-900 dark:bg-gray-700 dark:text-white transition-colors duration-200"
              />
            </div>
          </div>

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
                      value={sauce.name}
                      onChange={(e) => handleSauceChange(index, 'name', e.target.value)}
                      placeholder="Nombre de la salsa"
                      // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro para salsas ===
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="w-full sm:w-auto">
                    <label htmlFor={`sauce-price-${index}`} className="block text-xs font-medium text-gray-700 dark:text-gray-200 mb-1">Precio</label>
                    <input
                      type="number"
                      id={`sauce-price-${index}`}
                      value={sauce.price}
                      onChange={(e) => handleSauceChange(index, 'price', e.target.value)}
                      min="0"
                      step="0.01"
                      // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro para salsas ===
                      className="w-full px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white text-gray-900 dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                  <div className="w-full sm:w-auto flex items-center mt-2 sm:mt-0">
                    <input
                      type="checkbox"
                      id={`sauce-free-${index}`}
                      checked={sauce.isFree}
                      onChange={(e) => handleSauceChange(index, 'isFree', e.target.checked)}
                      className="mr-2"
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

          <div className="mb-4">
            <label htmlFor="image" className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-1">
              Imagen del Producto
            </label>
            <input
              type="file"
              id="image"
              name="image"
              accept="image/*"
              onChange={handleImageChange}
              // === CAMBIO AQUÍ: Asegurar color de texto en modo claro y oscuro ===
              className="w-full text-gray-900 dark:text-gray-200 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-200 dark:hover:file:bg-blue-800"
            />
            {imagePreview && (
              <div className="mt-4 relative w-32 h-32 rounded-lg overflow-hidden border border-gray-300 dark:border-gray-600">
                <img src={imagePreview} alt="Previsualización" className="w-full h-full object-cover" />
                {isUploadingImage && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white">
                    <Loader size={24} className="animate-spin" />
                  </div>
                )}
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
