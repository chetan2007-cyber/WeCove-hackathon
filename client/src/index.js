import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import { GoogleOAuthProvider } from '@react-oauth/google';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Wrap the App in the GoogleOAuthProvider to prevent the white screen crash
root.render(
  <GoogleOAuthProvider clientId="348524516027-3o5bt9i4naobtn7kaqusqmisf11j3h51.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
);

// Offline Service Worker Registration
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('ServiceWorker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.error('ServiceWorker registration failed:', error);
      });
  });
}