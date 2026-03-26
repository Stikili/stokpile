import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './styles/globals.css'

// Global unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  event.preventDefault();
  if (import.meta.env.DEV) {
    console.error('Unhandled promise rejection:', event.reason);
  }
});

// Register service worker for PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Service worker registration failed, silently continue
    });
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
