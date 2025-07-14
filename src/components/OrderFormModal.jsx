import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { XCircle, ArrowLeft, Send, Loader2, Home, Truck, Clock, Calendar, MessageSquare } from 'lucide-react'; // Importamos MessageSquare para notas

function OrderFormModal({ cartItems, onClose, onBack, onSendOrder, showNotification }) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    address: '',
    paymentMethod: 'cash',
    cashAmount: '',
    deliveryMethod: 'pickup', // 'pickup' (Retiro en local) o 'delivery' (Delivery a domicilio)
    orderType: 'immediate', // NUEVO: 'immediate' o 'reserved'
    orderTime: '', // NUEVO: Para la hora de reserva o estimada si es inmediato
    notes: '', // Campo para notas/comentarios
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [mercadopagoConfirmed, setMercadopagoConfirmed] = useState(false);

  const isCashAmountInsufficient = useRef(false);
  const firstInputRef = useRef(null);

  // Focus en el primer input al abrir el modal
  useEffect(() => {
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
  }, []);

  // Calcula el total del carrito, incluyendo salsas, sabores y tamaños
  const total = useMemo(() => {
    return Math.floor(cartItems.reduce((sum, item) => {
      // Suma el precio base del producto más el precio de la salsa, el sabor y el tamaño si existen
      const itemPrice = item.precio + (item.selectedSauce?.price || 0) + (item.selectedFlavor?.price || 0) + (item.selectedSize?.price || 0); // NUEVO: Sumar precio del tamaño
      return sum + itemPrice * item.quantity;
    }, 0));
  }, [cartItems]);

  // NUEVO: Calcula el vuelto para mostrar en el formulario
  const changeAmountForDisplay = useMemo(() => {
    if (formData.paymentMethod === 'cash' && formData.cashAmount) {
      const amount = parseFloat(formData.cashAmount);
      if (!isNaN(amount) && amount >= total) {
        return Math.floor(amount - total);
      }
    }
    return null; // No mostrar vuelto si no es efectivo, o el monto es insuficiente/inválido
  }, [formData.paymentMethod, formData.cashAmount, total]);

  // Función de validación de campos
  const validateField = useCallback((name, value) => {
    let error = '';
    switch (name) {
      case 'name':
        if (!value.trim()) error = 'El nombre es requerido.';
        break;
      case 'address':
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
      case 'orderTime':
        // Validar orderTime solo si orderType es 'reserved'
        if (formData.orderType === 'reserved') {
          if (!value.trim()) {
            error = 'La fecha y hora de reserva son requeridas.';
          } else {
            const selectedDateTime = new Date(value);
            const now = new Date();
            // Asegurarse de que la reserva sea en el futuro
            if (selectedDateTime <= now) {
              error = 'La fecha y hora de reserva deben ser en el futuro.';
            }
          }
        }
        break;
      case 'notes': // Notas son opcionales, no requiere validación estricta
        break;
      default:
        break;
    }
    return error;
  }, [formData.paymentMethod, formData.deliveryMethod, formData.orderType, total]);

  // Manejador genérico para cambios en los inputs
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    const error = validateField(name, value);
    setErrors((prev) => ({ ...prev, [name]: error }));
  }, [validateField]);

  // Manejador para el cambio del método de pago
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

  // Manejador para el cambio del método de envío
  const handleDeliveryMethodChange = useCallback((e) => {
    const newMethod = e.target.value;
    setFormData((prev) => ({
      ...prev,
      deliveryMethod: newMethod,
      address: newMethod === 'pickup' ? '' : prev.address,
    }));
    if (newMethod === 'pickup') {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.address;
        return newErrors;
      });
    } else {
      setErrors((prev) => ({ ...prev, address: validateField('address', formData.address) }));
    }
  }, [formData.address, validateField]);

  // NUEVO: Manejador para el cambio del tipo de pedido (inmediato/reservado)
  const handleOrderTypeChange = useCallback((e) => {
    const newOrderType = e.target.value;
    setFormData((prev) => ({
      ...prev,
      orderType: newOrderType,
      orderTime: newOrderType === 'immediate' ? '' : prev.orderTime, // Limpiar orderTime si es inmediato
    }));
    // Si cambia a inmediato, limpiar el error de orderTime
    if (newOrderType === 'immediate') {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors.orderTime;
        return newErrors;
      });
    } else { // Si cambia a reservado, forzar validación de orderTime
      setErrors((prev) => ({ ...prev, orderTime: validateField('orderTime', formData.orderTime) }));
    }
  }, [formData.orderTime, validateField]);

  // Manejador para la confirmación de Mercado Pago
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

  // Efecto para validar el monto en efectivo
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
  }, [formData.paymentMethod, formData.cashAmount, total]);

  // useMemo para determinar si todo el formulario es válido
  const isFormValid = useMemo(() => {
    const areCoreFieldsFilled = formData.name.trim() !== '' &&
                                formData.phone.trim() !== '';

    const isAddressValid = formData.deliveryMethod === 'delivery'
                               ? formData.address.trim() !== '' && !errors.address
                               : true;

    let paymentMethodValid = true;
    if (formData.paymentMethod === 'cash') {
      paymentMethodValid = !isCashAmountInsufficient.current && !errors.cashAmount;
    } else if (formData.paymentMethod === 'mercadopago') {
      paymentMethodValid = mercadopagoConfirmed;
    }

    // NUEVO: Validación del tipo de pedido y hora
    let orderTimeValid = true;
    if (formData.orderType === 'reserved') {
      orderTimeValid = formData.orderTime.trim() !== '' && !errors.orderTime;
    }

    // Asegurarse de que no haya errores en ningún campo validado
    const hasAnyInputErrors = Object.keys(errors).some(key =>
      key !== 'cashAmount' && key !== 'mercadopagoConfirmation' && errors[key] !== ''
    );

    return areCoreFieldsFilled && isAddressValid && paymentMethodValid && orderTimeValid && !hasAnyInputErrors;
  }, [formData, isCashAmountInsufficient.current, mercadopagoConfirmed, errors]);

  // Manejador de envío del formulario
  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    const newErrorsOnSubmit = {};
    Object.keys(formData).forEach((name) => {
      // Excluir campos condicionales si no aplican
      if (name === 'cashAmount' && formData.paymentMethod !== 'cash') return;
      if (name === 'address' && formData.deliveryMethod === 'pickup') return;
      if (name === 'orderTime' && formData.orderType !== 'reserved') return;
      if (name === 'notes') return; // Las notas son opcionales, no se validan aquí

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
    } else if (formData.paymentMethod === 'mercadopago' && !mercadopagoConfirmed) {
      newErrorsOnSubmit.mercadopagoConfirmation = 'Debes confirmar que enviarás el comprobante.';
    }

    // NUEVO: Validación para orderTime en el envío final
    if (formData.orderType === 'reserved') {
      const orderTimeError = validateField('orderTime', formData.orderTime);
      if (orderTimeError) {
        newErrorsOnSubmit.orderTime = orderTimeError;
      }
    }

    setErrors(newErrorsOnSubmit);

    const finalFormIsValid = Object.keys(newErrorsOnSubmit).length === 0;

    if (finalFormIsValid) {
      try {
        // Si el pedido es inmediato, establece orderTime a la hora actual
        // Aseguramos que finalOrderTime siempre sea una cadena, incluso si es vacía
        const finalOrderTime = formData.orderType === 'immediate' ? new Date().toISOString() : formData.orderTime || '';

        await onSendOrder({ ...formData, orderTime: finalOrderTime });
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
              autoComplete="name" // Añadido autocomplete
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
              autoComplete="tel" // Añadido autocomplete
            />
            {errors.phone && <p id="phone-error" className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>

          {/* NUEVA SECCIÓN: Notas/Comentarios */}
          <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg shadow-inner border border-gray-200 dark:border-gray-600">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4 flex items-center gap-2">
              <MessageSquare size={20} className="text-blue-500" /> Notas Adicionales (Opcional)
            </h3>
            {/* Campo Notas/Comentarios */}
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 sr-only">Notas / Comentarios (opcional)</label> {/* sr-only para ocultar visualmente pero mantener para lectores de pantalla */}
              <textarea
                id="notes"
                name="notes" // Añadido name
                rows="3"
                value={formData.notes}
                onChange={handleChange}
                className="w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 border-gray-300"
                placeholder="Ej: Tocar timbre 3 veces, dejar en la puerta del vecino, etc."
                autoComplete="off" // Añadido autocomplete
              ></textarea>
            </div>
          </div>
          {/* FIN NUEVA SECCIÓN */}

          {/* Método de Envío */}
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
                  autoComplete="shipping" // Añadido autocomplete
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Home size={20} className="mr-1 text-emerald-600"/> Retiro en el local
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
                  autoComplete="shipping" // Añadido autocomplete
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Truck size={20} className="mr-1 text-red-600"/> Delivery a domicilio
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
                name="address" // Añadido name
                value={formData.address}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.address ? 'border-red-500' : 'border-gray-300'}`}
                placeholder="Ej: Calle Falsa 123, Depto 4A"
                aria-invalid={!!errors.address}
                aria-describedby={errors.address ? 'address-error' : undefined}
                required
                autoComplete="street-address" // Añadido autocomplete
              />
              {errors.address && <p id="address-error" className="mt-1 text-sm text-red-600">{errors.address}</p>}
            </div>
          )}

          {/* NUEVO: Tipo de Pedido (Inmediato / Reserva) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">¿Cuándo quieres tu pedido?</label>
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4">
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="orderType"
                  value="immediate"
                  checked={formData.orderType === 'immediate'}
                  onChange={handleOrderTypeChange}
                  className="form-radio text-blue-600 h-5 w-5"
                  aria-label="Pedido Inmediato"
                  autoComplete="off" // Añadido autocomplete
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Clock size={20} className="mr-1 text-blue-600"/> Inmediato
                </span>
              </label>
              <label className="inline-flex items-center cursor-pointer bg-gray-100 dark:bg-gray-700 p-3 rounded-lg shadow-sm flex-1">
                <input
                  type="radio"
                  name="orderType"
                  value="reserved"
                  checked={formData.orderType === 'reserved'}
                  onChange={handleOrderTypeChange}
                  className="form-radio text-purple-600 h-5 w-5"
                  aria-label="Pedido con Reserva"
                  autoComplete="off" // Añadido autocomplete
                />
                <span className="ml-2 text-gray-900 dark:text-gray-100 font-medium flex items-center">
                  <Calendar size={20} className="mr-1 text-purple-600"/> Reservar para otro momento
                </span>
              </label>
            </div>
          </div>

          {/* NUEVO: Campo Fecha y Hora de Reserva (Condicional: solo si es reserva) */}
          {formData.orderType === 'reserved' && (
            <div>
              <label htmlFor="orderTime" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Fecha y Hora de Reserva</label>
              <input
                type="datetime-local"
                id="orderTime"
                name="orderTime" // Añadido name
                value={formData.orderTime}
                onChange={handleChange}
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-purple-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.orderTime ? 'border-red-500' : 'border-gray-300'}`}
                aria-invalid={!!errors.orderTime}
                aria-describedby={errors.orderTime ? 'orderTime-error' : undefined}
                required
                autoComplete="off" // Añadido autocomplete
              />
              {errors.orderTime && <p id="orderTime-error" className="mt-1 text-sm text-red-600">{errors.orderTime}</p>}
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
                  autoComplete="off" // Añadido autocomplete
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
                  autoComplete="off" // Añadido autocomplete
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
                name="cashAmount" // Añadido name
                value={formData.cashAmount}
                onChange={handleChange}
                step="1"
                className={`w-full p-3 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-gray-100 dark:border-gray-600 ${errors.cashAmount ? 'border-red-500' : 'border-gray-300'}`}
                placeholder={`Ej: ${total + 500}`}
                aria-invalid={!!errors.cashAmount}
                aria-describedby={errors.cashAmount ? 'cashAmount-error' : undefined}
                autoComplete="off" // Añadido autocomplete
              />
              {errors.cashAmount && <p id="cashAmount-error" className="mt-1 text-sm text-red-600">{errors.cashAmount}</p>}
              {changeAmountForDisplay !== null && ( // <<<<<<<<<<<<<<< AÑADIDO: Mostrar vuelto
                <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
                  Vuelto: <span className="font-bold text-green-600 dark:text-green-400">$ {changeAmountForDisplay}</span>
                </p>
              )}
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

              <label htmlFor="mercadopago-confirm" className="inline-flex items-center cursor-pointer"> {/* Añadido htmlFor */}
                <input
                  type="checkbox"
                  id="mercadopago-confirm" // Añadido id
                  name="mercadopagoConfirmation" // Añadido name
                  checked={mercadopagoConfirmed}
                  onChange={handleMercadopagoConfirmChange}
                  className={`form-checkbox h-5 w-5 text-green-600 rounded ${errors.mercadopagoConfirmation ? 'border-red-500' : 'border-gray-300'}`}
                  aria-invalid={!!errors.mercadopagoConfirmation}
                  aria-describedby={errors.mercadopagoConfirmation ? 'mercadopago-confirm-error' : undefined}
                  autoComplete="off" // Añadido autocomplete
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
