import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import '../styles/globalStyles.css';
import SiteRoutes from './routes';
import NavBar from '../components/NavBar/NavBar';

ReactDOM.createRoot(document.getElementById('pageRoutes')).render(
    <BrowserRouter>
      <NavBar />
      <SiteRoutes />
    </BrowserRouter>
);