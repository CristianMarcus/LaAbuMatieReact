import React, { useState } from 'react';

export default function Cart({ cartItems, removeFromCart, updateQuantity }) {
  const [showCart, setShowCart] = useState(false);
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [comments, setComments] = useState('');

  const totalPrice = cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0);

  // Armar texto para WhatsApp
  const buildWhatsAppMessage = () => {
    let message = `*Pedido Capriccio Pizza*\n\n`;
    cartItems.forEach(item => {
      message += `- ${item.name} x${item.quantity}: $${item.price * item.quantity}\n`;
    });
    message += `\n*Total:* $${totalPrice}\n\n`;
    message += `*Cliente:* ${customerName}\n`;
    message += `*Dirección:* ${address}\n`;
    if (comments) message += `*Comentarios:* ${comments}\n`;

    return encodeURIComponent(message);
  };

  // Enviar pedido a WhatsApp
  const sendOrder = () => {
    if (!customerName || !address) {
      alert('Por favor completa nombre y dirección.');
      return;
    }
    const phone = '5491123456789'; // Número de WhatsApp de la pizzería, con código país sin + ni 00
    const url = `https://wa.me/${phone}?text=${buildWhatsAppMessage()}`;
    window.open(url, '_blank');
  };

  return (
    <>
      <button
        onClick={() => setShowCart(!showCart)}
        className="fixed bottom-6 right-6 bg-red-600 text-white p-4 rounded-full shadow-lg hover:bg-red-700 z-50"
        aria-label="Abrir carrito"
      >
        🛒 {cartItems.length}
      </button>

      {showCart && (
        <div className="fixed bottom-20 right-6 w-80 bg-white border rounded shadow-lg p-4 z-50">
          <h3 className="font-bold mb-2">Tu carrito</h3>
          {cartItems.length === 0 ? (
            <p>El carrito está vacío.</p>
          ) : (
            <>
              <ul className="max-h-48 overflow-y-auto mb-4">
                {cartItems.map(item => (
                  <li key={item.id} className="flex justify-between items-center mb-2">
                    <div>
                      <p>{item.name}</p>
                      <p className="text-sm text-gray-600">${item.price} x {item.quantity}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="bg-gray-300 px-2 rounded"
                      >-</button>
                      <span>{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        className="bg-gray-300 px-2 rounded"
                      >+</button>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 font-bold px-2"
                        aria-label={`Eliminar ${item.name}`}
                      >x</button>
                    </div>
                  </li>
                ))}
              </ul>

              <p className="font-bold mb-2">Total: ${totalPrice}</p>

              <input
                type="text"
                placeholder="Tu nombre"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="w-full border p-2 mb-2 rounded"
              />

              <input
                type="text"
                placeholder="Dirección"
                value={address}
                onChange={e => setAddress(e.target.value)}
                className="w-full border p-2 mb-2 rounded"
              />

              <textarea
                placeholder="Comentarios (opcional)"
                value={comments}
                onChange={e => setComments(e.target.value)}
                className="w-full border p-2 mb-2 rounded"
              />

              <button
                onClick={sendOrder}
                className="bg-green-600 text-white w-full py-2 rounded hover:bg-green-700"
              >
                Enviar pedido por WhatsApp
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
