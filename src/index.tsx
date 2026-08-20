import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
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
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);