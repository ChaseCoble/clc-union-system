import { useState } from 'react'
import BlockForm from './BlockForm'
import ArtifactSection from './ArtifactSection'

export default function TaskCard({ task, isTop, apiBase, onComplete, onBlock, onMount, onUnmount, onRefresh }) {
  const [blocking, setBlocking] = useState(false)
  const [completing, setCompleting] = useState(false)

  const workType = (task.work_type || '').replace(/_/g, '-').toLowerCase()
  const platform = task.platform_name || ''

  const handleComplete = async () => {
    if (completing) return
    setCompleting(true)
    try {
      await onComplete(task.id, null)
    } finally {
      setCompleting(false)
    }
  }

  const handleBlock = async (payload) => {
    await onBlock(task.id, payload)
    setBlocking(false)
  }

  const handleMount = () => task.mounted ? onUnmount(task.id) : onMount(task.id)

  return (
    <div style={s.card}>
      <div style={s.header}>
        <span style={s.title}>{task.title}</span>
        {platform && <span style={s.tagPlatform}>{platform}</span>}
        {task.work_type && <span style={s.tag}>{workType}</span>}
        {task.difficulty_label && (
          <span style={s.tagDifficulty}>{task.difficulty_label}</span>
        )}
      </div>
      {task.description && <div style={s.desc}>{task.description}</div>}

      <ArtifactSection task={task} apiBase={apiBase} onRefresh={onRefresh} />

      <div style={s.actions}>
        <button style={s.btnPrimary} onClick={handleComplete} disabled={completing}>
          {completing ? '...' : 'Complete'}
        </button>
        <button style={s.btn} onClick={() => setBlocking(b => !b)}>Block</button>
        <button style={s.btn} onClick={handleMount}>
          {task.mounted ? 'Unset' : 'Set'}
        </button>
      </div>
      {blocking && (
        <BlockForm onSubmit={handleBlock} onCancel={() => setBlocking(false)} />
      )}
    </div>
  )
}

const s = {
  card: {
    borderBottom: '1px solid var(--color-border)',
    padding: 'var(--spacing-sm)',
    background: 'var(--color-surface-1)',
  },
  header: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 'var(--spacing-xs)',
    marginBottom: 'var(--spacing-xs)',
    flexWrap: 'wrap',
  },
  title: {
    fontFamily: 'var(--font-base)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: 'var(--font-weight-medium)',
    color: 'var(--color-text)',
    flex: 1,
    lineHeight: 'var(--line-height-tight)',
  },
  desc: {
    fontSize: 'var(--font-size-xs)',
    color: 'var(--color-text-muted)',
    marginBottom: 'var(--spacing-xs)',
    lineHeight: 'var(--line-height-base)',
  },
  tag: {
    display: 'inline-block',
    padding: '1px 7px',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    background: 'var(--color-surface-2)',
    fontSize: 'var(--font-size-xs)',
    whiteSpace: 'nowrap',
  },
  tagPlatform: {
    display: 'inline-block',
    padding: '1px 7px',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-primary)',
    background: 'var(--color-primary-glow)',
    fontSize: 'var(--font-size-xs)',
    whiteSpace: 'nowrap',
  },
  tagDifficulty: {
    display: 'inline-block',
    padding: '1px 7px',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-disabled)',
    background: 'transparent',
    fontSize: 'var(--font-size-xs)',
    whiteSpace: 'nowrap',
    fontStyle: 'italic',
  },
  actions: {
    display: 'flex',
    gap: 'var(--spacing-xs)',
    flexWrap: 'wrap',
    marginTop: 'var(--spacing-xs)',
  },
  btn: {
    padding: '3px 10px',
    background: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    cursor: 'pointer',
    letterSpacing: '0.06em',
  },
  btnPrimary: {
    padding: '3px 10px',
    background: 'var(--color-primary)',
    border: '1px solid var(--color-primary)',
    color: 'var(--color-text-inverse)',
    fontFamily: 'var(--font-mono)',
    fontSize: 'var(--font-size-xs)',
    fontWeight: 'var(--font-weight-medium)',
    cursor: 'pointer',
    letterSpacing: '0.06em',
  },
}
