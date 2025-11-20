import React from 'react';
import ReactDOM from 'react-dom/client';
import '../styles/globalStyles.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('todoElement'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);