import { useEffect, useState, useRef } from 'react'
import { getFocus } from './api.js'
import { useUIEventBus, UI_SIGNALS } from './UIEventBus.jsx'

export default function FocusMode({ onClose }) {
  const [composition, setComposition] = useState([])
  const [loading, setLoading]         = useState(true)
  const containerRef                  = useRef(null)
  const { publish }                   = useUIEventBus()

  useEffect(() => {
    publish(UI_SIGNALS.FOCUS_ENTERED, {})

    getFocus()
      .then(data => setComposition(data.composition || []))
      .catch(() => setComposition([]))
      .finally(() => setLoading(false))

    const handleKey = (e) => { if (e.key === 'Escape') handleClose() }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [])

  useEffect(() => {
    if (loading || !containerRef.current) return

    composition.forEach(async (component) => {
      try {
        const url = `/api/panels/${panel.panel_id}/proxy${component.endpoint}`
        const res = await fetch(url)
        if (!res.ok) return
        const src = await res.text()

        const tag = `focus-${component.panel_id.replace(/_/g, '-')}-${component.component_id}`
        if (!customElements.get(tag)) {
          const blob = new Blob([src], { type: 'application/javascript' })
          const blobUrl = URL.createObjectURL(blob)
          await import(/* @vite-ignore */ blobUrl)
          URL.revokeObjectURL(blobUrl)
        }

        const el = document.createElement(tag)
        el.setAttribute('service-url', component.service_url)
        el.style.display = 'block'
        el.style.width = '100%'

        const slot = containerRef.current?.querySelector(
          `[data-component-id="${component.component_id}"]`
        )
        if (slot) {
          slot.innerHTML = ''
          slot.appendChild(el)
        }
      } catch {
        // Component load failure — slot stays empty
      }
    })
  }, [loading, composition])

  const handleClose = () => {
    publish(UI_SIGNALS.FOCUS_EXITED, {})
    onClose()
  }

  return (
    <>
      <div style={styles.backdrop} onClick={handleClose} />
      <div style={styles.modal}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <span style={styles.icon}>◈</span>
            <span style={styles.title}>FOCUS</span>
          </div>
          <button style={styles.closeBtn} onClick={handleClose}>ESC</button>
        </div>

        <div style={styles.divider} />

        <div ref={containerRef} style={styles.content}>
          {loading ? (
            <div style={styles.loadingMsg}>LOADING</div>
          ) : composition.length === 0 ? (
            <div style={styles.emptyMsg}>
              <span style={styles.emptyIcon}>○</span>
              <span>No focus components registered</span>
            </div>
          ) : (
            composition.map(component => (
              <div
                key={`${component.panel_id}-${component.component_id}`}
                style={styles.componentSlot}
              >
                <div style={styles.componentLabel}>
                  {component.panel_id.toUpperCase().replace(/_/g, ' ')}
                  <span style={styles.componentId}>
                    · {component.component_id.toUpperCase().replace(/_/g, ' ')}
                  </span>
                </div>
                <div
                  data-component-id={component.component_id}
                  style={styles.componentHost}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

const styles = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(10, 10, 11, 0.85)',
    zIndex: 100,
    backdropFilter: 'blur(2px)',
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: 101,
    width: '560px',
    maxHeight: '80vh',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border-focus)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    flexShrink: 0,
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  icon: {
    color: 'var(--color-primary)',
    fontSize: '16px',
  },
  title: {
    fontFamily: 'var(--font-base)',
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--color-text)',
    letterSpacing: '0.2em',
  },
  closeBtn: {
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-disabled)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    padding: '4px 8px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  divider: {
    height: '1px',
    background: 'var(--color-border)',
    flexShrink: 0,
  },
  content: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  loadingMsg: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.2em',
    padding: '32px 0',
    textAlign: 'center',
  },
  emptyMsg: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '32px 0',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.1em',
  },
  emptyIcon: {
    fontSize: '24px',
    color: 'var(--color-border-focus)',
  },
  componentSlot: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  componentLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '9px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.15em',
    textTransform: 'uppercase',
  },
  componentId: {
    color: 'var(--color-text-disabled)',
    opacity: 0.6,
    marginLeft: '4px',
  },
  componentHost: {
    background: 'var(--color-surface-3)',
    border: '1px solid var(--color-border)',
    minHeight: '80px',
  },
}
