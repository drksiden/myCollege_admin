import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // Tailwind CSS
import { AuthProvider } from './contexts/AuthContext.tsx' // Импортируем AuthProvider
import { BrowserRouter } from 'react-router-dom'; // Для роутинга

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter> {/* Оборачиваем в BrowserRouter для React Router */}
      <AuthProvider> {/* Оборачиваем в AuthProvider */}
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)