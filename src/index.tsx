import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

// Web fonts are declared in public/index.html so they load before first paint.
// Reveal Material Symbols only once the icon font is ready, otherwise the raw
// ligature names ("arrow_forward") would be painted as text on first load.
const revealIcons = () => document.documentElement.classList.add('fonts-ready');
if (typeof document !== 'undefined' && 'fonts' in document) {
  document.fonts.ready.then(revealIcons).catch(revealIcons);
  // Safety net in case the font request never settles (offline, blocked CDN).
  window.setTimeout(revealIcons, 3000);
} else {
  revealIcons();
}

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
