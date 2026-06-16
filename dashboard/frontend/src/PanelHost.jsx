import { useEffect, useRef, useState } from 'react'
import { useUIEventBus, UI_SIGNALS } from './UIEventBus.jsx'

const CSS_BRIDGE = `
  :host {
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
    --radius-full:         0px;
    --transition-fast:     var(--transition-fast);
  }
`

export default function PanelHost({ panel, style }) {
  const containerRef = useRef(null)
  const { publish } = useUIEventBus()
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadPanel() {
      try {
        const url = `/api/panels/${panel.panel_id}/proxy${panel.frontend_endpoint}`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch panel: ${res.status}`)
        const src = await res.text()

        if (cancelled) return

        const tag = panel.panel_id.replace(/_/g, '-') + '-panel'
        if (!customElements.get(tag)) {
          const blob = new Blob([src], { type: 'application/javascript' })
          const blobUrl = URL.createObjectURL(blob)
          await import(/* @vite-ignore */ blobUrl)
          URL.revokeObjectURL(blobUrl)
        }

        if (cancelled) return

        const el = document.createElement(tag)
        el.setAttribute('panel-id', panel.panel_id)
        el.setAttribute('service-url', '')
        el.setAttribute('api-base', `/api/panels/${panel.panel_id}/api`)

        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          containerRef.current.appendChild(el)

          requestAnimationFrame(() => {
            if (el.shadowRoot) {
              const bridge = document.createElement('style')
              bridge.textContent = CSS_BRIDGE
              el.shadowRoot.insertBefore(bridge, el.shadowRoot.firstChild)
            }
          })
        }

        setStatus('ok')
        publish(UI_SIGNALS.PANEL_LOADED, { panel_id: panel.panel_id })
      } catch (err) {
        if (!cancelled) {
          setStatus('error')
          setErrorMsg(err.message)
        }
      }
    }

    loadPanel()
    return () => { cancelled = true }
  }, [panel.panel_id])

  return (
    <div style={{ ...styles.host, ...style }}>
      <div style={styles.header}>
        <span style={styles.panelId}>{panel.panel_id.toUpperCase().replace(/_/g, ' ')}</span>
        <span style={styles.version}>v{panel.version}</span>
        <span style={{
          ...styles.statusDot,
          background: status === 'ok'
            ? 'var(--status-ok)'
            : status === 'loading'
              ? 'var(--text-dim)'
              : 'var(--status-error)'
        }} />
      </div>

      <div style={styles.content}>
        {status === 'loading' && (
          <div style={styles.stateMsg}>LOADING</div>
        )}
        {status === 'error' && (
          <div style={styles.errorMsg}>
            <span style={styles.errorCode}>PANEL ERROR</span>
            <span style={styles.errorDetail}>{errorMsg}</span>
          </div>
        )}
        <div
          ref={containerRef}
          style={{
            ...styles.webComponentContainer,
            display: status === 'ok' ? 'block' : 'none',
          }}
        />
      </div>
    </div>
  )
}

const styles = {
  host: {
    background: 'var(--bg-surface)',
    border: '1px solid var(--border-dim)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    transition: 'border-color var(--transition-fast)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '4px 8px',
    borderBottom: '1px solid var(--border-dim)',
    background: 'var(--bg-base)',
    flexShrink: 0,
  },
  panelId: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '0.12em',
    flex: 1,
  },
  version: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: 'var(--text-dim)',
    opacity: 0.5,
  },
  statusDot: {
    width: '5px',
    height: '5px',
    borderRadius: '50%',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflow: 'hidden',
    position: 'relative',
  },
  stateMsg: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '0.2em',
  },
  errorMsg: {
    position: 'absolute',
    inset: 0,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '16px',
  },
  errorCode: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--status-error)',
    letterSpacing: '0.15em',
  },
  errorDetail: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    textAlign: 'center',
  },
  webComponentContainer: {
    width: '100%',
    height: '100%',
  },
}
