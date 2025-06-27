import React from 'react';
import ProductCard from './ProductCard';

const products = [
  { id: 1, name: 'Pizza Napolitana', price: 800, image: 'https://via.placeholder.com/150' },
  { id: 2, name: 'Pizza Fugazzeta', price: 750, image: 'https://via.placeholder.com/150' },
  { id: 3, name: 'Pizza Muzzarella', price: 700, image: 'https://via.placeholder.com/150' },
];

export default function Home({ addToCart }) {
  return (
    <div className="p-4 grid grid-cols-1 md:grid-cols-3 gap-6">
      {products.map(prod => (
        <ProductCard key={prod.id} product={prod} addToCart={addToCart} />
      ))}
    </div>
  );
}
