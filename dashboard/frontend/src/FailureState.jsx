import { useState, useEffect } from 'react'

export default function FailureState({ lastSeen }) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(e => e + 1)
    }, 1000)
    return () => clearInterval(id)
  }, [])

  const fmt = (s) => {
    const m = Math.floor(s / 60)
    const sec = s % 60
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`
  }

  return (
    <div style={styles.container}>
      <div style={styles.indicator} />
      <div style={styles.content}>
        <div style={styles.code}>ORCHESTRATOR UNREACHABLE</div>
        <div style={styles.detail}>
          Control plane offline · Engine down · Dashboard operational
        </div>
        <div style={styles.meta}>
          <span style={styles.metaItem}>
            DURATION <span style={styles.value}>{fmt(elapsed)}</span>
          </span>
          {lastSeen && (
            <span style={styles.metaItem}>
              LAST SEEN <span style={styles.value}>{lastSeen}</span>
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const styles = {
  container: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '12px',
    padding: '12px 16px',
    background: 'rgba(154, 58, 58, 0.08)',
    border: '1px solid rgba(154, 58, 58, 0.3)',
    margin: '8px',
  },
  indicator: {
    width: '6px',
    height: '6px',
    borderRadius: '50%',
    background: 'var(--status-severe)',
    marginTop: '4px',
    flexShrink: 0,
    animation: 'pulse 2s infinite',
  },
  content: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  code: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--status-error)',
    letterSpacing: '0.1em',
    fontWeight: 500,
  },
  detail: {
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    color: 'var(--text-dim)',
    letterSpacing: '0.05em',
  },
  meta: {
    display: 'flex',
    gap: '20px',
    marginTop: '4px',
  },
  metaItem: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-dim)',
    letterSpacing: '0.1em',
  },
  value: {
    color: 'var(--text-secondary)',
    marginLeft: '6px',
  },
}
