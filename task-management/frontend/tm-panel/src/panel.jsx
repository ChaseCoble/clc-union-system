import { createRoot } from 'react-dom/client'
import App from './App'

// CSS variable bridge — maps dashboard vars to panel's expected names
const CSS_BRIDGE = `
  :host {
    display: block;
    width: 100%;
    height: 100%;
    --color-bg:            var(--bg-void);
    --color-surface-1:     var(--bg-surface);
    --color-surface-2:     var(--bg-raised);
    --color-surface-3:     var(--bg-highlight);
    --color-border:        var(--border-dim);
    --color-border-focus:  var(--border-bright);
    --color-text:          var(--text-primary);
    --color-text-muted:    var(--text-secondary);
    --color-text-disabled: var(--text-dim);
    --color-text-inverse:  var(--bg-void);
    --color-primary:       var(--accent);
    --color-primary-hover: var(--accent-bright);
    --color-primary-glow:  var(--accent-glow);
    --color-success:       var(--status-ok);
    --color-warning:       var(--status-warn);
    --color-destructive:   var(--status-error);
    --font-base:           var(--font-display);
    --font-mono:           var(--font-mono);
    --font-size-xs:        10px;
    --font-size-sm:        12px;
    --font-size-md:        13px;
    --font-size-lg:        15px;
    --font-size-xl:        22px;
    --font-weight-medium:  500;
    --font-weight-bold:    600;
    --line-height-tight:   1.3;
    --line-height-base:    1.5;
    --spacing-xs:          4px;
    --spacing-sm:          8px;
    --spacing-md:          12px;
    --spacing-lg:          20px;
    --radius-sm:           0px;
    --radius-md:           0px;
    --transition-fast:     80ms ease;
  }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  select, input, textarea, button { font-family: inherit; }
`

class TaskManagementPanel extends HTMLElement {
  connectedCallback() {
    const apiBase = this.getAttribute('api-base') || '/api'
    const shadow = this.attachShadow({ mode: 'open' })

    const style = document.createElement('style')
    style.textContent = CSS_BRIDGE
    shadow.appendChild(style)

    const container = document.createElement('div')
    container.style.cssText = 'width:100%;height:100%;display:flex;'
    shadow.appendChild(container)

    createRoot(container).render(<App apiBase={apiBase} />)
  }
}

customElements.define('task-management-panel', TaskManagementPanel)
