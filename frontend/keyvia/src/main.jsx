// src/main.jsx

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

// Import the tools we need
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    {/* 1. Router provides routing capabilities */}
    <Router>
      {/* 2. AuthProvider manages user login state */}
      <AuthProvider>
        {/* 3. ToastProvider handles pop-up notifications */}
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthProvider>
    </Router>
  </React.StrictMode>
);