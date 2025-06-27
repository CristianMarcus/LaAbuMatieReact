// src/components/ReviewSection.jsx
import React from 'react';
import { Star } from 'lucide-react';

function ReviewSection({ reviews }) {
  if (!reviews || reviews.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-inner text-center text-gray-600 dark:text-gray-300">
        <p>Aún no hay reseñas para este producto.</p>
        <p>¡Sé el primero en dejar una!</p>
      </div>
    );
  }

  // Calculate average rating
  const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = (totalRating / reviews.length).toFixed(1);

  return (
    <div className="p-4 bg-white dark:bg-gray-700 rounded-lg shadow-inner">
      <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-100 mb-4 flex items-center">
        Reseñas de Clientes ({reviews.length})
        <span className="ml-3 flex items-center text-yellow-500">
          {averageRating} <Star size={20} className="fill-current ml-1" />
        </span>
      </h3>

      <div className="space-y-4">
        {reviews.map((review, index) => (
          <div key={review.id || index} className="border-b border-gray-200 dark:border-gray-600 pb-4 last:border-b-0">
            <div className="flex items-center mb-2">
              {[...Array(5)].map((_, starIndex) => (
                <Star
                  key={starIndex}
                  size={18}
                  className={`mr-1 ${
                    starIndex < review.rating
                      ? 'text-yellow-500 fill-yellow-500'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                />
              ))}
              <span className="text-sm text-gray-600 dark:text-gray-300 ml-2">
                {review.userId && `Usuario: ${review.userId.substring(0, 8)}...`}
                {review.timestamp && ` - ${new Date(review.timestamp.toDate()).toLocaleDateString()}`}
              </span>
            </div>
            {review.comment && (
              <p className="text-gray-700 dark:text-gray-200 italic">"{review.comment}"</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ReviewSection;
