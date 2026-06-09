import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { cssVars } from './theme.js'
import App from './App.jsx'
import './index.css'

// Inject layout CSS vars (grid divisions, panel gap)
// Visual tokens are loaded from /themes/active.css via index.html link tag
const style = document.createElement('style')
style.textContent = cssVars
document.head.appendChild(style)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>
)
