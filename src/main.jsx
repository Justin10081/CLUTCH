import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'
import { CoursesProvider } from './context/CoursesContext'
import { DeadlinesProvider } from './context/DeadlinesContext'
import { GPAProvider } from './context/GPAContext'
import { SessionsProvider } from './context/SessionsContext'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CoursesProvider>
            <DeadlinesProvider>
              <GPAProvider>
                <SessionsProvider>
                  <App />
                </SessionsProvider>
              </GPAProvider>
            </DeadlinesProvider>
          </CoursesProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>
)
