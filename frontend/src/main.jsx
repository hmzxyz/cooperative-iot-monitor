import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext';
import './styles.css';

const obsoleteRuntimeKeys = [
  'brokerUrl',
  'sensor_source',
  'sensorData',
];

obsoleteRuntimeKeys.forEach((key) => localStorage.removeItem(key));

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);
