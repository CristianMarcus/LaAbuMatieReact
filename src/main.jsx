// src/main.jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css'; // O tu archivo CSS principal

// Importa BrowserRouter
import { BrowserRouter } from 'react-router-dom';
// Importa HelmetProvider de react-helmet-async
import { HelmetProvider } from 'react-helmet-async'; 

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* Envuelve tu aplicación con HelmetProvider */}
    <HelmetProvider>
      {/* Envuelve tu componente App con BrowserRouter */}
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </HelmetProvider>
  </React.StrictMode>,
);
