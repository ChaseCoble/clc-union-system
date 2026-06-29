import { createRoot } from 'react-dom/client'
import App from './App'

class TaskManagementPanel extends HTMLElement {
  connectedCallback() {
    const apiBase = this.getAttribute('api-base') || '/api'
    this.style.cssText = 'display:flex;width:100%;height:100%;overflow:hidden;'
    createRoot(this).render(<App apiBase={apiBase} />)
  }
}

customElements.define('task-management-panel', TaskManagementPanel)
