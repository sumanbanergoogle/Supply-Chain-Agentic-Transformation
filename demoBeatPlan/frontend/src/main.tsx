import React from 'react';
import ReactDOM from 'react-dom/client';
import { PersonaProvider } from './state/persona';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PersonaProvider>
      <App />
    </PersonaProvider>
  </React.StrictMode>,
);
