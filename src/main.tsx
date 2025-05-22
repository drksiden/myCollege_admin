import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import './index.css' // Tailwind CSS
import { AuthProvider } from './contexts/AuthContext.tsx' // Импортируем AuthProvider
import { BrowserRouter } from 'react-router-dom'; // Для роутинга
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ThemeProvider } from './contexts/ThemeContext'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter> {/* Оборачиваем в BrowserRouter для React Router */}
        <ThemeProvider>
          <AuthProvider> {/* Оборачиваем в AuthProvider */}
            <App />
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </React.StrictMode>,
)