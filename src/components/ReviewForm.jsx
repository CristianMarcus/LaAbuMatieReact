// src/components/ReviewForm.jsx
import React, { useState, useCallback } from 'react';
import { Star } from 'lucide-react';

function ReviewForm({ onSubmit, initialRating = 0, initialComment = '' }) {
  const [rating, setRating] = useState(initialRating);
  const [comment, setComment] = useState(initialComment);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (rating === 0) {
      setMessage('Por favor, selecciona una calificación con estrellas.');
      setMessageType('error');
      return;
    }
    setMessage(''); // Clear previous messages
    setMessageType('');
    onSubmit({ rating, comment });
    setRating(0); // Reset form after submission
    setComment('');
  }, [rating, comment, onSubmit]);

  return (
    <form onSubmit={handleSubmit} className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-inner">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4">Deja tu Reseña</h3>

      <div className="mb-4">
        <label className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">
          Tu Calificación:
        </label>
        <div className="flex items-center">
          {[...Array(5)].map((_, index) => {
            const starValue = index + 1;
            return (
              <Star
                key={starValue}
                size={28}
                className={`cursor-pointer transition-colors duration-200 ${
                  starValue <= (hoverRating || rating)
                    ? 'text-yellow-500 fill-yellow-500'
                    : 'text-gray-400 dark:text-gray-500'
                }`}
                onClick={() => setRating(starValue)}
                onMouseEnter={() => setHoverRating(starValue)}
                onMouseLeave={() => setHoverRating(0)}
              />
            );
          })}
        </div>
        {message && messageType === 'error' && (
          <p className="text-red-500 text-xs mt-2">{message}</p>
        )}
      </div>

      <div className="mb-4">
        <label htmlFor="comment" className="block text-gray-700 dark:text-gray-200 text-sm font-bold mb-2">
          Tu Comentario (Opcional):
        </label>
        <textarea
          id="comment"
          rows="3"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 dark:text-gray-200 leading-tight focus:outline-none focus:shadow-outline focus:ring-2 focus:ring-red-500 dark:bg-gray-800 dark:border-gray-600 dark:placeholder-gray-400 transition-colors duration-200"
          placeholder="Escribe tu comentario aquí..."
        ></textarea>
      </div>

      <button
        type="submit"
        className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-red-300"
      >
        Enviar Reseña
      </button>
    </form>
  );
}

export default ReviewForm;
