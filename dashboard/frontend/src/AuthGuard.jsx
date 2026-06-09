import { useState, useEffect } from 'react'
import { authVerify, authLogin } from './api.js'

export default function AuthGuard({ children, onUser }) {
  const [state, setState]       = useState('checking')
  const [error, setError]       = useState(null)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading]   = useState(false)

  useEffect(() => {
    authVerify()
      .then(data => { onUser(data); setState('authed') })
      .catch(() => setState('login'))
  }, [])

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    try {
      await authLogin(username, password)
      const data = await authVerify()
      onUser(data)
      setState('authed')
    } catch {
      setError('Invalid credentials')
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => { if (e.key === 'Enter') handleLogin() }

  if (state === 'checking') {
    return (
      <div style={styles.fullscreen}>
        <span style={styles.checking}>INITIALIZING</span>
      </div>
    )
  }

  if (state === 'authed') return children

  return (
    <div style={styles.fullscreen}>
      <div style={styles.loginBox}>
        <div style={styles.header}>
          <div style={styles.logoMark}>▣</div>
          <div style={styles.title}>UNION</div>
          <div style={styles.subtitle}>INFRASTRUCTURE CONTROL</div>
        </div>

        <div style={styles.divider} />

        <div style={styles.fields}>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>IDENTIFIER</label>
            <input
              style={styles.input}
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              onKeyDown={handleKey}
              autoFocus
              autoComplete="username"
            />
          </div>
          <div style={styles.fieldGroup}>
            <label style={styles.label}>CREDENTIAL</label>
            <input
              style={styles.input}
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={handleKey}
              autoComplete="current-password"
            />
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <button
          style={{ ...styles.submitBtn, opacity: loading ? 0.5 : 1 }}
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'AUTHENTICATING...' : 'AUTHENTICATE'}
        </button>

        <div style={styles.footer}>
          <span style={styles.footerText}>UNION SYSTEM · AUTHORIZED ACCESS ONLY</span>
        </div>
      </div>
    </div>
  )
}

const styles = {
  fullscreen: {
    position: 'fixed',
    inset: 0,
    background: 'var(--color-bg)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checking: {
    fontFamily: 'var(--font-mono)',
    color: 'var(--color-text-disabled)',
    fontSize: '11px',
    letterSpacing: '0.2em',
  },
  loginBox: {
    width: '320px',
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    padding: '32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  header: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  logoMark: {
    fontSize: '24px',
    color: 'var(--color-primary)',
    lineHeight: 1,
    marginBottom: '8px',
  },
  title: {
    fontFamily: 'var(--font-base)',
    fontSize: '22px',
    fontWeight: 700,
    color: 'var(--color-text)',
    letterSpacing: '0.15em',
  },
  subtitle: {
    fontSize: '10px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.2em',
    fontFamily: 'var(--font-mono)',
  },
  divider: {
    height: '1px',
    background: 'var(--color-border)',
  },
  fields: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  label: {
    fontSize: '10px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.15em',
    fontFamily: 'var(--font-mono)',
  },
  input: {
    background: 'var(--color-surface-1)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    fontFamily: 'var(--font-mono)',
    fontSize: '13px',
    padding: '8px 10px',
    outline: 'none',
    transition: 'border-color var(--transition-fast)',
    width: '100%',
  },
  error: {
    fontSize: '11px',
    color: 'var(--color-destructive)',
    fontFamily: 'var(--font-mono)',
    letterSpacing: '0.05em',
  },
  submitBtn: {
    background: 'var(--color-primary)',
    color: 'var(--color-text-inverse)',
    border: 'none',
    fontFamily: 'var(--font-mono)',
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.2em',
    padding: '10px',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
    width: '100%',
  },
  footer: {
    textAlign: 'center',
  },
  footerText: {
    fontSize: '9px',
    color: 'var(--color-text-disabled)',
    letterSpacing: '0.1em',
    fontFamily: 'var(--font-mono)',
  },
}
