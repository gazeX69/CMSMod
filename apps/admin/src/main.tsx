import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './app/App.tsx';

if (import.meta.env.DEV && window.location.hostname === 'localhost') {
  const newUrl = new URL(window.location.href);
  newUrl.hostname = '127.0.0.1';
  window.location.replace(newUrl.toString());
} else {
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
}
