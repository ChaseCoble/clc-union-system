import { useState } from 'react'

export default function ArtifactSection({ task, apiBase, onRefresh }) {
  const [adding, setAdding] = useState(false)
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)

  const artifacts = task.artifacts || []

  const handleAdd = async () => {
    if (!label.trim() || !url.trim() || busy) return
    setBusy(true)
    try {
      const res = await fetch(
        `${apiBase}/tasks/${task.id}/artifacts?artifact_type=LINK&label=${encodeURIComponent(label.trim())}&url=${encodeURIComponent(url.trim())}`,
        { method: 'POST', credentials: 'include' }
      )
      if (!res.ok) throw new Error(`${res.status}`)
      setLabel('')
      setUrl('')
      setAdding(false)
      onRefresh()
    } catch (e) {
      console.error('[artifacts]', e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (artifactId) => {
    try {
      await fetch(
        `${apiBase}/tasks/${task.id}/artifacts/${artifactId}`,
        { method: 'DELETE', credentials: 'include' }
      )
      onRefresh()
    } catch (e) {
      console.error('[artifacts]', e.message)
    }
  }

  return (
    <div style={s.container}>
      {/* Existing artifacts */}
      {artifacts.length > 0 && (
        <div style={s.chips}>
          {artifacts.map(a => (
            <div key={a.id} style={s.chip}>
              <span style={s.chipType}>⇱</span>
              {a.url ? (
                <a href={a.url} target="_blank" rel="noreferrer" style={s.chipLabel}>
                  {a.label}
                </a>
              ) : (
                <span style={s.chipLabel}>{a.label}</span>
              )}
              <button style={s.chipDelete} onClick={() => handleDelete(a.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <div style={s.addForm}>
          <input
            style={s.input}
            placeholder="Label"
            value={label}
            onChange={e => setLabel(e.target.value)}
            autoFocus
          />
          <input
            style={s.input}
            placeholder="URL"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd() }}
          />
          <div style={s.addActions}>
            <button style={s.btnPrimary} onClick={handleAdd} disabled={busy}>
              {busy ? '...' : 'Add'}
            </button>
            <button style={s.btn} onClick={() => { setAdding(false); setLabel(''); setUrl('') }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button style={s.addLink} onClick={() => setAdding(true)}>
          + link
        </button>
      )}
    </div>
  )
}

const s = {
  container: {
    marginTop: 'var(--spacing-xs)',
  },
  chips: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '4px',
    marginBottom: '4px',
  },
  chip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '1px 6px',
    border: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)',
    fontSize: 'var(--font-size-xs)',
    maxWidth: '200px',
  },
  chipType: {
    color: 'var(--color-text-disabled)',
    fontSize: '10px',
    flexShrink: 0,
  },
  chipLabel: {
    color: 'var(--color-primary)',
    textDecoration: 'none',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    fontSize: 'var(--font-size-xs)',
  },
  chipDelete: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-disabled)',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: '0 2px',
    flexShrink: 0,
  },
  addForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    marginTop: '4px',
  },
  input: {
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    background: 'var(--color-surface-1)',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text)',
    padding: '3px 6px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
  },
  addActions: {
    display: 'flex',
    gap: '4px',
  },
  btn: {
    padding: '2px 8px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
  },
  btnPrimary: {
    padding: '2px 8px',
    background: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
  },
  addLink: {
    background: 'transparent',
    border: 'none',
    color: 'var(--color-text-disabled)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    padding: '2px 0',
    letterSpacing: '0.05em',
  },
}
