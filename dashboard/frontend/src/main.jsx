import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { cssVars } from './theme.js'
import App from './App.jsx'
import './index.css'

// Inject CSS custom properties
const style = document.createElement('style')
style.textContent = cssVars
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
