import { useEffect, useRef, useState } from 'react'
import { useUIEventBus, UI_SIGNALS } from './UIEventBus.jsx'

async function sha256hex(text) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('')
}

export default function PanelHost({ panel, style }) {
  const containerRef          = useRef(null)
  const { publish }           = useUIEventBus()
  const [status, setStatus]   = useState('loading')
  const [errorMsg, setErrorMsg] = useState(null)

  useEffect(() => {
    let cancelled = false

    async function loadPanel() {
      try {
        const url = `/panels/${panel.panel_id}/frontend.js`
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Failed to fetch panel: ${res.status}`)
        const src = await res.text()

        const digest = 'sha256:' + await sha256hex(src)
        if (digest !== panel.frontend_checksum) {
          setStatus('checksum_fail')
          setErrorMsg('Checksum mismatch — panel rejected')
          return
        }

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
        el.setAttribute('service-url', panel.service_url)
        el.setAttribute('api-base', panel.api_base)

        if (containerRef.current) {
          containerRef.current.innerHTML = ''
          containerRef.current.appendChild(el)
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
            ? 'var(--color-success)'
            : status === 'loading'
              ? 'var(--color-text-disabled)'
              : 'var(--color-destructive)'
        }} />
      </div>

      <div style={styles.content}>
        {status === 'loading' && (
          <div style={styles.stateMsg}>LOADING</div>
        )}
        {status === 'checksum_fail' && (
          <div style={styles.errorMsg}>
            <span style={styles.errorCode}>INTEGRITY FAILURE</span>
            <span style={styles.errorDetail}>{errorMsg}</span>
          </div>
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
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
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
    borderBottom: '1px solid var(--color-border)',
    background: 'var(--color-surface-1)',
    flexShrink: 0,
  },
  panelId: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.12em',
    flex: 1,
  },
  version: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: 'var(--color-text-disabled)',
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
    color: 'var(--color-text-disabled)',
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
    color: 'var(--color-destructive)',
    letterSpacing: '0.15em',
  },
  errorDetail: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--color-text-disabled)',
    textAlign: 'center',
  },
  webComponentContainer: {
    width: '100%',
    height: '100%',
  },
}
