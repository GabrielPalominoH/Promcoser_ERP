import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import { DataProvider } from './context/DataContext'
import { AuthProvider } from './context/AuthContext'
import { TemaProvider } from './context/TemaContext'
import './index.css'

// Tema guardado: se aplica antes de pintar para que la pantalla de acceso
// (que vive fuera del Layout) también respete el modo oscuro.
try {
  const tema = window.localStorage.getItem('promcoser_tema') === 'oscuro' ? 'oscuro' : 'claro'
  document.documentElement.setAttribute('data-tema', tema)
} catch {
  // Sin almacenamiento: aspecto claro por defecto.
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <TemaProvider>
        <AuthProvider>
          <DataProvider>
            <App />
          </DataProvider>
        </AuthProvider>
      </TemaProvider>
    </BrowserRouter>
  </StrictMode>,
)