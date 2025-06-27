import React, { useState } from 'react';
import { Send, XCircle, CheckCircle } from 'lucide-react'; // Iconos para el formulario

const PowaContactForm = ({ onClose, showNotification }) => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        projectType: '',
        message: ''
    });
    const [submissionStatus, setSubmissionStatus] = useState(null); // 'idle', 'sending', 'success', 'error'
    const [formError, setFormError] = useState(''); // Para errores de validación del formulario

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        if (formError) setFormError(''); // Limpiar errores al escribir
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmissionStatus('sending');
        setFormError('');

        // Basic form validation
        if (!formData.name || !formData.email || !formData.message) {
            setFormError('Por favor, completa todos los campos obligatorios.');
            setSubmissionStatus('idle');
            return;
        }
        if (!/\S+@\S+\.\S+/.test(formData.email)) {
            setFormError('Por favor, ingresa un email válido.');
            setSubmissionStatus('idle');
            return;
        }

        try {
            // --- IMPORTANT: Replace 'your_form_id' with your actual Formspree ID ---
            // 1. Go to https://formspree.io/
            // 2. Sign up or log in.
            // 3. Create a new form.
            // 4. They will give you an endpoint URL like 'https://formspree.io/f/xxxxxxxx'.
            // 5. Copy only the 'xxxxxxxx' part and paste it here.
            const formspreeEndpoint = 'https://formspree.io/f/xpwrlkjq'; 
            // If you do not replace 'your_form_id', the form will NOT work.

            const response = await fetch(formspreeEndpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            if (response.ok) {
                setSubmissionStatus('success');
                showNotification('¡Mensaje enviado con éxito! Nos pondremos en contacto pronto.', 'success', 5000);
                setFormData({ name: '', email: '', projectType: '', message: '' }); // Clear form
            } else {
                // const errorData = await response.json(); // Uncomment to debug Formspree errors
                setSubmissionStatus('error');
                showNotification('Error al enviar el mensaje. Por favor, inténtalo de nuevo más tarde.', 'error', 5000);
                setFormError('Hubo un problema al enviar tu mensaje. Intenta de nuevo.');
            }
        } catch (error) {
            setSubmissionStatus('error');
            showNotification('Error de conexión. Verifica tu internet y reintenta.', 'error', 5000);
            setFormError('No se pudo conectar con el servidor. Verifica tu conexión.');
        }
    };

    return (
        <div className="fixed inset-0 bg-gradient-to-br from-purple-800 to-indigo-900 bg-opacity-90 flex items-center justify-center p-4 sm:p-6 md:p-8 lg:p-12 xl:p-20 z-50">
            <div className="relative bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg lg:max-w-xl xl:max-w-3xl transform transition-all duration-300 scale-95 md:scale-100 animate-slide-in-up border-4 border-transparent hover:border-purple-500 dark:hover:border-indigo-400 max-h-[90vh] overflow-y-auto">
                
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200 transition-colors duration-200 p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 z-10"
                    aria-label="Close contact form"
                >
                    <XCircle size={28} />
                </button>

                {/* Content Wrapper for Padding and internal scroll */}
                <div className="p-6 sm:p-8 md:p-10 lg:p-12 xl:p-16">
                    <div className="flex flex-col items-center mb-6 text-center">
                        <h2 className="text-3xl sm:text-4xl lg:text-5xl xl:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-600 to-pink-600 dark:from-purple-400 dark:to-pink-400 mb-2 drop-shadow-lg text-balance">
                            ¡Hablemos de tu Proyecto!
                        </h2>
                        <p className="text-lg sm:text-xl lg:text-2xl text-gray-700 dark:text-gray-300 font-semibold">
                            Agencia Digital Powa
                        </p>
                        <p className="text-gray-600 dark:text-gray-400 mt-3 max-w-md lg:max-w-lg text-sm sm:text-base lg:text-lg">
                            Nos encantaría escuchar sobre tu idea. Completa el formulario y nos pondremos en contacto contigo.
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label htmlFor="name" className="block text-sm sm:text-base lg:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Nombre Completo <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                id="name"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                className="w-full p-3 sm:p-4 lg:p-5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm focus:shadow-md text-base lg:text-lg"
                                required
                                disabled={submissionStatus === 'sending'}
                                aria-label="Nombre Completo"
                            />
                        </div>

                        <div>
                            <label htmlFor="email" className="block text-sm sm:text-base lg:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Correo Electrónico <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                id="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full p-3 sm:p-4 lg:p-5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm focus:shadow-md text-base lg:text-lg"
                                required
                                disabled={submissionStatus === 'sending'}
                                aria-label="Correo Electrónico"
                            />
                        </div>

                        <div>
                            <label htmlFor="projectType" className="block text-sm sm:text-base lg:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Tipo de Proyecto (Opcional)
                            </label>
                            <select
                                id="projectType"
                                name="projectType"
                                value={formData.projectType}
                                onChange={handleChange}
                                className="w-full p-3 sm:p-4 lg:p-5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm focus:shadow-md text-base lg:text-lg"
                                disabled={submissionStatus === 'sending'}
                                aria-label="Tipo de Proyecto"
                            >
                                <option value="">Selecciona una opción</option>
                                <option value="eCommerce">Tienda Online (E-commerce)</option>
                                <option value="webApp">Aplicación Web Personalizada</option>
                                <option value="mobileApp">Aplicación Móvil</option>
                                <option value="website">Sitio Web Informativo</option>
                                <option value="consulting">Consultoría</option>
                                <option value="other">Otro</option>
                            </select>
                        </div>

                        <div>
                            <label htmlFor="message" className="block text-sm sm:text-base lg:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1">
                                Describe tu Idea o Proyecto <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                id="message"
                                name="message"
                                rows="5"
                                value={formData.message}
                                onChange={handleChange}
                                className="w-full p-3 sm:p-4 lg:p-5 border border-gray-300 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all shadow-sm focus:shadow-md text-base lg:text-lg"
                                required
                                disabled={submissionStatus === 'sending'}
                                aria-label="Describe tu Idea o Proyecto"
                            ></textarea>
                        </div>

                        {formError && (
                            <p className="text-red-500 text-sm sm:text-base lg:text-lg font-medium mt-2 flex items-center">
                                <XCircle size={20} className="mr-2 flex-shrink-0" /> {formError}
                            </p>
                        )}

                        <button
                            type="submit"
                            className="w-full py-3 sm:py-4 lg:py-5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.01] focus:outline-none focus:ring-4 focus:ring-purple-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-base sm:text-lg lg:text-xl"
                            disabled={submissionStatus === 'sending'}
                        >
                            {submissionStatus === 'sending' ? (
                                <>
                                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                    Enviando...
                                </>
                            ) : (
                                <>
                                    <Send size={24} /> Enviar Mensaje
                                </>
                            )}
                        </button>
                        
                        {submissionStatus === 'success' && (
                            <div className="text-center text-green-600 dark:text-green-400 text-base sm:text-lg lg:text-xl font-semibold mt-4 flex items-center justify-center gap-2 animate-fade-in">
                                <CheckCircle size={26} /> ¡Mensaje enviado con éxito!
                            </div>
                        )}
                    </form>
                </div>
            </div>
        </div>
    );
};

export default PowaContactForm;
