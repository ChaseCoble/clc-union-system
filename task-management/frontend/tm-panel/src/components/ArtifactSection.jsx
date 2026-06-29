import { useState, useCallback } from 'react'

export default function ArtifactSection({ task, apiBase, onRefresh }) {
  const [mode, setMode] = useState(null)  // null | 'link' | 'file'
  const [label, setLabel] = useState('')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const artifacts = task.artifacts || []

  const reset = () => {
    setMode(null)
    setLabel('')
    setUrl('')
    setFile(null)
    setError(null)
  }

  const handleChooseFile = useCallback(() => {
    const input = document.createElement('input')
    input.type = 'file'
    input.style.display = 'none'
    input.onchange = (e) => {
      console.log('[artifact] file selected:', e.target.files[0])
      setFile(e.target.files[0] || null)
      document.body.removeChild(input)
    }
    document.body.appendChild(input)
    input.click()
  }, [])

  const handleAddLink = async () => {
    if (!label.trim() || !url.trim() || busy) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(
        `${apiBase}/tasks/${task.id}/artifacts?artifact_type=LINK&label=${encodeURIComponent(label.trim())}&url=${encodeURIComponent(url.trim())}`,
        { method: 'POST', credentials: 'include' }
      )
      if (!res.ok) throw new Error(`${res.status}`)
      reset()
      onRefresh()
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const handleAddFile = async () => {
    console.log('[artifact] handleAddFile called, file:', file, 'label:', label)
    if (!label.trim() || !file || busy) return
    setBusy(true)
    setError(null)
    try {
      const fd = new FormData()
      fd.append('label', label.trim())
      fd.append('file', file)
      const res = await fetch(
        `${apiBase}/tasks/${task.id}/artifacts/upload`,
        { method: 'POST', credentials: 'include', body: fd }
      )
      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: res.statusText }))
        throw new Error(err.detail || res.statusText)
      }
      reset()
      onRefresh()
    } catch (e) {
      setError(e.message)
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
      setError(e.message)
    }
  }

  const handleDownload = (artifact) => {
    const a = document.createElement('a')
    a.href = `/api/panels/task_management/api/tasks/${task.id}/artifacts/${artifact.id}/download`
    a.download = artifact.label
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  return (
    <div style={s.container}>
      {artifacts.length > 0 && (
        <div style={s.chips}>
          {artifacts.map(a => (
            <div key={a.id} style={s.chip}>
              <span style={s.chipType}>{a.artifact_type === 'FILE' ? '📄' : '⇱'}</span>
              {a.artifact_type === 'FILE' ? (
                <span style={{ ...s.chipLabel, cursor: 'pointer' }} onClick={() => handleDownload(a)}>
                  {a.label}
                </span>
              ) : (
                <a href={a.url} target="_blank" rel="noreferrer" style={s.chipLabel}>
                  {a.label}
                </a>
              )}
              <button style={s.chipDelete} onClick={() => handleDelete(a.id)}>×</button>
            </div>
          ))}
        </div>
      )}

      {mode === 'link' && (
        <div style={s.form}>
          <input style={s.input} placeholder="Label" value={label}
            onChange={e => setLabel(e.target.value)} autoFocus />
          <input style={s.input} placeholder="URL" value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAddLink() }} />
          {error && <span style={s.error}>{error}</span>}
          <div style={s.formActions}>
            <button style={s.btnPrimary} onClick={handleAddLink} disabled={busy}>
              {busy ? '...' : 'Add'}
            </button>
            <button style={s.btn} onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {mode === 'file' && (
        <div style={s.form}>
          <input style={s.input} placeholder="Label" value={label}
            onChange={e => setLabel(e.target.value)} autoFocus />
          <div style={s.fileRow}>
            <button style={s.btn} onClick={handleChooseFile}>
              {file ? file.name : 'Choose file'}
            </button>
            {file && <span style={s.fileName}>{(file.size / 1024).toFixed(0)} KB</span>}
          </div>
          {error && <span style={s.error}>{error}</span>}
          <div style={s.formActions}>
            <button style={s.btnPrimary} onClick={handleAddFile}
              disabled={busy || !file || !label.trim()}>
              {busy ? '...' : 'Upload'}
            </button>
            <button style={s.btn} onClick={reset}>Cancel</button>
          </div>
        </div>
      )}

      {!mode && (
        <div style={s.addRow}>
          <button style={s.addBtn} onClick={() => setMode('link')}>+ link</button>
          <button style={s.addBtn} onClick={() => setMode('file')}>+ file</button>
        </div>
      )}
    </div>
  )
}

const s = {
  container: { marginTop: 'var(--spacing-xs)' },
  chips: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '4px' },
  chip: {
    display: 'inline-flex', alignItems: 'center', gap: '4px',
    padding: '1px 6px', border: '1px solid var(--color-border)',
    background: 'var(--color-surface-2)', fontSize: 'var(--font-size-xs)',
    maxWidth: '220px',
  },
  chipType: { color: 'var(--color-text-disabled)', fontSize: '10px', flexShrink: 0 },
  chipLabel: {
    color: 'var(--color-primary)', textDecoration: 'none',
    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
    fontSize: 'var(--font-size-xs)',
  },
  chipDelete: {
    background: 'transparent', border: 'none', color: 'var(--color-text-disabled)',
    cursor: 'pointer', fontSize: '14px', lineHeight: 1, padding: '0 2px', flexShrink: 0,
  },
  form: { display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '4px' },
  input: {
    fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)',
    background: 'var(--color-surface-1)', border: '1px solid var(--color-border)',
    color: 'var(--color-text)', padding: '3px 6px', outline: 'none',
    width: '100%', boxSizing: 'border-box',
  },
  fileRow: { display: 'flex', alignItems: 'center', gap: '6px' },
  fileName: { fontSize: '10px', color: 'var(--color-text-disabled)' },
  error: { fontSize: '10px', color: 'var(--color-destructive)' },
  formActions: { display: 'flex', gap: '4px' },
  addRow: { display: 'flex', gap: '8px' },
  addBtn: {
    background: 'transparent', border: 'none', color: 'var(--color-text-disabled)',
    fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)',
    cursor: 'pointer', padding: '2px 0', letterSpacing: '0.05em',
  },
  btn: {
    padding: '2px 8px', background: 'transparent',
    border: '1px solid var(--color-border)', color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', cursor: 'pointer',
  },
  btnPrimary: {
    padding: '2px 8px', background: 'var(--color-primary)',
    border: '1px solid var(--color-primary)', color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-mono)', fontSize: 'var(--font-size-xs)', cursor: 'pointer',
  },
}
