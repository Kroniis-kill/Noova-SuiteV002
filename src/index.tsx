import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AdminPortalApp from './pages/admin-portal/AdminPortalApp';
import './index.css'; 

// Register Service Worker for Push Notifications
if ('serviceWorker' in navigator) {
  const allowedDomains = ['localhost', '127.0.0.1', 'noova-suite.vercel.app'];
  if (allowedDomains.includes(window.location.hostname)) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          if (import.meta.env.DEV) console.log('SW registered: ', registration);
        })
        .catch(registrationError => {
          if (import.meta.env.DEV) console.log('SW registration failed: ', registrationError);
        });
    });
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// El panel de plataforma (/admin) es una app completamente aparte de la
// app del negocio: login propio, sin datos de ningún tenant cargados.
// No hay React Router en este proyecto (todo lo demás navega por estado
// interno), así que alcanza con mirar la URL una sola vez acá — Vercel
// ya redirige cualquier ruta a este mismo index.html (ver vercel.json).
const isAdminPortalRoute = window.location.pathname.startsWith('/admin');

root.render(
  <React.StrictMode>
    {isAdminPortalRoute ? <AdminPortalApp /> : <App />}
  </React.StrictMode>
);