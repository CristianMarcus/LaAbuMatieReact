import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { XCircle, ArrowLeft, Send, Loader2, Home, Truck } from 'lucide-react'; // Importamos iconos

function OrderFormModal({ cartItems, onClose, onBack, onSendOrder, showNotification }) {
  const [formData, setFormData] = useState({
    name: '',
    address: '', // Campo de dirección
    phone: '',
    paymentMethod: 'cash', // Default a efectivo
    cashAmount: '', 
    deliveryMethod: 'pickup', // NUEVO: 'pickup' (Retiro en local) o 'delivery' (Delivery a domicilio)
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mercadopagoConfirmed, setMercadopagoConfirmed] = useState(false);

  const isCashAmountInsufficient = useRef(false);
  const firstInputRef = useRef(null); 

  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  const total = useMemo(() => {
    return Math.floor(cartItems.reduce((sum, item) => sum + item.precio * item.quantity, 0));
  }, [cartItems]);

  const validateField = useCallback((name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'El nombre es requerido.';
        break;
      case 'address':
        // La dirección solo es requerida si el método de envío es 'delivery'
        if (formData.deliveryMethod === 'delivery' && !value.trim()) {
            error = 'La dirección es requerida para el delivery.';
        }
        break;
      case 'phone':
        if (!value.trim()) {
          error = 'El teléfono es requerido.';
        } else if (!/^\d+$/.test(value)) {
          error = 'El teléfono solo debe contener números.';
        } else if (value.length < 8) { 
          error = 'El teléfono debe tener al menos 8 dígitos.';
        }
        break;
      case 'cashAmount':
        if (formData.paymentMethod === 'cash') {
          const amount = parseFloat(value);
          if (isNaN(amount) || amount <= 0) {
            error = 'El monto no es válido o debe ser mayor a cero.';
          }
        }
        break;
      default:
        break;
    }
    return error;
  }, [formData.paymentMethod, formData.deliveryMethod, total]); // Añadido formData.deliveryMethod

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [validateField]);

  const handlePaymentMethodChange = useCallback((e) => {
    setFormData((prev) => ({
      ...prev,
      paymentMethod: e.target.value,
      cashAmount: e.target.value === 'cash' ? prev.cashAmount : '', 
    }));
    setErrors((prev) => ({ ...prev, cashAmount: '' })); 
    if (e.target.value !== 'mercadopago') {
      setMercadopagoConfirmed(false);
    }
  }, []);

  // NUEVO: Manejador para el cambio del método de envío
  const handleDeliveryMethodChange = useCallback((e) => {
    const newMethod = e.target.value;
    setFormData((prev) => ({
      ...prev,
      deliveryMethod: newMethod,
      // Si cambia a pickup, limpiar la dirección y su error
      address: newMethod === 'pickup' ? '' : prev.address, 
    }));
    // Si cambia a pickup, limpiar el error de dirección
    if (newMethod === 'pickup') {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.address;
        return newErrors;
      });
    } else { // Si cambia a delivery, forzar validación de dirección
        setErrors((prev) => ({ ...prev, address: validateField('address', formData.address) }));
    }
  }, [formData.address, validateField]); // Agregamos formData.address a las dependencias

  const handleMercadopagoConfirmChange = useCallback((e) => {
    setMercadopagoConfirmed(e.target.checked);
    if (e.target.checked) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.mercadopagoConfirmation;
        return newErrors;
      });
    }
  }, []);

  useEffect(() => {
    if (formData.paymentMethod === 'cash') {
      const amount = parseFloat(formData.cashAmount);
      isCashAmountInsufficient.current = isNaN(amount) || amount < total;
      
      setErrors(prevErrors => {
        const newErrors = { ...prevErrors };
        if (isCashAmountInsufficient.current && !isNaN(amount) && amount > 0) {
          newErrors.cashAmount = `El monto debe ser igual o mayor al total del pedido ($${total}).`;
        } else if (!isNaN(amount) && amount > 0 && !isCashAmountInsufficient.current) {
          delete newErrors.cashAmount; 
        } else if (isNaN(amount) || amount <= 0) {
            newErrors.cashAmount = 'El monto no es válido o debe ser mayor a cero.';
        }
        return newErrors;
      });
    } else {
      isCashAmountInsufficient.current = false;
      setErrors(prevErrors => { 
        const newErrors = { ...prevErrors };
        delete newErrors.cashAmount;
        return newErrors;
      }); 
    }
  }, [formData.paymentMethod, formData.cashAmount, total, showNotification]); 

  // useMemo para determinar si todo el formulario es válido
  const isFormValid = useMemo(() => {
    // Campos siempre requeridos
    const areCoreFieldsFilled = formData.name.trim() !== '' &&
                                formData.phone.trim() !== '';
    
    // Validación de dirección basada en el método de envío
    const isAddressValid = formData.deliveryMethod === 'delivery' 
                         ? formData.address.trim() !== '' && !errors.address 
                         : true; // No se requiere dirección para 'pickup'

    // Validaciones específicas del método de pago
    let paymentMethodValid = true;
    if (formData.paymentMethod === 'cash') {
      paymentMethodValid = !isCashAmountInsufficient.current && !errors.cashAmount;
    } else if (formData.paymentMethod === 'mercadopago') {
      paymentMethodValid = mercadopagoConfirmed;
    }

    // Comprobamos que no haya ningún error general en el objeto 'errors' (excluyendo los errores específicos que ya se manejan)
    const hasAnyInputErrors = Object.keys(errors).some(key => 
        key !== 'cashAmount' && key !== 'mercadopagoConfirmation' && key !== 'address' && errors[key] !== ''
    );
    
    // console.log("OrderFormModal: isFormValid calculado. Detalles:", {
    //   areCoreFieldsFilled,
    //   isAddressValid,
    //   paymentMethodValid,
    //   hasAnyInputErrors,
    //   isCashAmountInsufficient: isCashAmountInsufficient.current,
    //   mercadopagoConfirmed,
    //   errors: JSON.stringify(errors)
    // });

    return areCoreFieldsFilled && isAddressValid && paymentMethodValid && !hasAnyInputErrors;
  }, [formData, isCashAmountInsufficient.current, mercadopagoConfirmed, errors]); 

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    // Re-validar todos los campos para asegurar que se muestren los errores
    const newErrorsOnSubmit = {};
    Object.keys(formData).forEach((name) => {
      if (name === 'cashAmount' && formData.paymentMethod !== 'cash') {
        return;
      }
      if (name === 'address' && formData.deliveryMethod === 'pickup') { // No validar dirección si es retiro en local
        return;
      }
      const error = validateField(name, formData[name]);
      if (error) {
        newErrorsOnSubmit[name] = error;
      }
    });

    if (formData.paymentMethod === 'cash') {
      const amount = parseFloat(formData.cashAmount);
      if (isNaN(amount) || amount <= 0) {
        newErrorsOnSubmit.cashAmount = 'El monto no es válido o debe ser mayor a cero.';
      } else if (amount < total) {
        newErrorsOnSubmit.cashAmount = `El monto debe ser igual o mayor al total del pedido ($${total}).`;
      }
    } 
    else if (formData.paymentMethod === 'mercadopago' && !mercadopagoConfirmed) {
      newErrorsOnSubmit.mercadopagoConfirmation = 'Debes confirmar que enviarás el comprobante.';
    }

    setErrors(newErrorsOnSubmit); 

    const finalFormIsValid = Object.keys(newErrorsOnSubmit).length === 0;

    if (finalFormIsValid) { 
      try {
        await onSendOrder(formData);
      } catch (submitError) {
        console.error("Error al enviar el pedido:", submitError);
        showNotification("Hubo un error al enviar tu pedido. Intenta de nuevo.", "error");
      } finally {
        setIsSubmitting(false);
      }
    } else {
      showNotification("Por favor, corrige los errores del formulario para continuar.", "error", 5000);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 w-full max-w-xl sm:max-w-2xl max-h-[90vh] overflow-y-auto transform scale-95 animate-scale-in">
        {/* Encabezado del modal */}
        <div className="flex justify-between items-center mb-6 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-3">
            <Send size={32} className="text-blue-600" /> Confirmar Pedido
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-full p-1"
            aria-label="Cerrar formulario de pedido"
          >
            <XCircle size={28} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Campo Nombre */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nombre Completo</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              ref={firstInputRef} 
              className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ej: Juan Pérez"
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? 'name-error' : undefined}
            />
            {errors.name && <p id="name-error" className="mt-1 text-sm text-red-600">{errors.name}</p>}
          </div>

          {/* Campo Teléfono */}
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Teléfono</label>
            <input
              type="tel" 
              inputMode="numeric" 
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Ej: 1123456789"
              aria-invalid={!!errors.phone}
              aria-describedby={errors.phone ? 'phone-error' : undefined}
            />
            {errors.phone && <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          {/* NUEVO: Método de Envío */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Método de Envío</label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="pickup"
                  checked={formData.deliveryMethod === 'pickup'}
                  onChange={handleDeliveryMethodChange}
                  className="form-radio text-emerald-600 h-5 w-5"
                  aria-label="Retirar en el local"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Home size={20} className="mr-1 text-emerald-600"/> Retiro en el local (Calle 881 N° 5003, Villa la Florida)
                </span>
              </label>
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="deliveryMethod"
                  value="delivery"
                  checked={formData.deliveryMethod === 'delivery'}
                  onChange={handleDeliveryMethodChange}
                  className="form-radio text-red-600 h-5 w-5"
                  aria-label="Delivery a domicilio sin cargo"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Truck size={20} className="mr-1 text-red-600"/> Delivery a domicilio (sin cargo)
                </span>
              </label>
            </div>
          </div>

          {/* Campo Dirección (Condicional: solo si es delivery) */}
          {formData.deliveryMethod === 'delivery' && (
            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dirección de Envío</label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Ej: Calle Falsa 123, Depto 4A"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'address-error' : undefined}
                required // La dirección es requerida solo para delivery
              />
              {errors.address && <p id="address-error" className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>
          )}

          {/* Mostrar el Total del Pedido */}
          <div className="flex justify-between items-center text-xl font-bold text-gray-900 dark:text-gray-100 py-3 border-t border-b border-gray-200 dark:border-gray-700 my-4">
            <span>Total a Pagar:</span>
            <span className="text-red-600 dark:text-red-400 text-2xl">${total}</span>
          </div>

          {/* Método de Pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Método de Pago</label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cash"
                  checked={formData.paymentMethod === 'cash'}
                  onChange={handlePaymentMethodChange}
                  className="form-radio text-blue-600 h-5 w-5"
                  aria-label="Pagar en efectivo"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100">Efectivo</span>
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="mercadopago"
                  checked={formData.paymentMethod === 'mercadopago'}
                  onChange={handlePaymentMethodChange}
                  className="form-radio text-blue-600 h-5 w-5"
                  aria-label="Pagar con Mercado Pago"
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100">Mercado Pago</span>
              </label>
            </div>
          </div>

          {/* Campo para monto en efectivo (condicional) */}
          {formData.paymentMethod === 'cash' && (
            <div>
              <label htmlFor="cashAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿Con cuánto abonas? (Monto total: ${total})</label>
              <input
                type="number"
                id="cashAmount"
                name="cashAmount"
                value={formData.cashAmount}
                onChange={handleChange}
                step="1" 
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.cashAmount ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={`Ej: ${total + 500}`}
                aria-invalid={!!errors.cashAmount}
                aria-describedby={errors.cashAmount ? 'cashAmount-error' : undefined}
              />
              {errors.cashAmount && <p id="cashAmount-error" className="mt-1 text-sm text-red-600">{errors.cashAmount}</p>}
            </div>
          )}

          {/* Mensaje de Mercado Pago y Checkbox de Confirmación (condicional) */}
          {formData.paymentMethod === 'mercadopago' && (
            <div className="bg-blue-50 dark:bg-blue-900 p-4 rounded-lg border border-blue-200 dark:border-blue-700 text-blue-800 dark:text-blue-200 text-sm shadow-inner">
              <p className="font-semibold mb-2">
                ¡Importante! Para pagos con Mercado Pago:
              </p>
              <p className="mb-2">
                Envía el dinero a nuestro alias: <strong className="text-blue-900 dark:text-blue-100">laabuelamatie</strong>
              </p>
              <p className="font-bold text-red-700 dark:text-red-300 mb-3">
                ⚠️ Recuerda: Es OBLIGATORIO enviar el COMPROBANTE de pago una vez realizado el pedido. Sin el comprobante, el pedido NO se tomará como válido.
              </p>
              
              <label className="inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={mercadopagoConfirmed}
                  onChange={handleMercadopagoConfirmChange}
                  className={`form-checkbox h-5 w-5 text-green-600 rounded ${errors.mercadopagoConfirmation ? 'border-red-500' : 'border-gray-300'}`}
                  aria-invalid={!!errors.mercadopagoConfirmation}
                  aria-describedby={errors.mercadopagoConfirmation ? 'mercadopago-confirm-error' : undefined}
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100">
                  He leído y entiendo que debo enviar el comprobante de pago.
                </span>
              </label>
              {errors.mercadopagoConfirmation && <p id="mercadopago-confirm-error" className="mt-1 text-sm text-red-600">{errors.mercadopagoConfirmation}</p>}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col sm:flex-row justify-end space-y-3 sm:space-y-0 sm:space-x-4 pt-4">
            <button
              type="button"
              onClick={onBack} 
              className="w-full sm:w-auto px-6 py-3 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-100 font-bold rounded-xl shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Volver al paso anterior"
              disabled={isSubmitting}
            >
              <ArrowLeft size={20} className="inline-block mr-2" /> Volver
            </button>
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className="w-full sm:w-auto px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-4 focus:ring-green-300 disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Enviar Pedido"
            >
              {isSubmitting ? (
                <Loader2 size={20} className="animate-spin mr-2" />
              ) : (
                <Send size={20} />
              )}
              {isSubmitting ? 'Enviando...' : 'Enviar Pedido'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default OrderFormModal;
