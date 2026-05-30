import { useState } from 'react'
import { createTab, updateTab, deleteTab } from './api.js'

export default function TabBar({ tabs, activeTabId, userId, onTabChange, onTabsChange, onFocusOpen }) {
  const [editingId, setEditingId] = useState(null)
  const [editValue, setEditValue]   = useState('')

  const handleAdd = async () => {
    const order = tabs.length
    const tab = await createTab(userId, { name: `TAB ${order + 1}`, order })
    onTabsChange([...tabs, tab])
    onTabChange(tab.id)
  }

  const handleRename = (tab) => {
    setEditingId(tab.id)
    setEditValue(tab.name)
  }

  const handleRenameCommit = async (tab) => {
    if (!editValue.trim()) return
    const updated = await updateTab(tab.id, { name: editValue.trim().toUpperCase() })
    onTabsChange(tabs.map(t => t.id === tab.id ? updated : t))
    setEditingId(null)
  }

  const handleDelete = async (tab) => {
    if (tabs.length <= 1) return
    await deleteTab(tab.id)
    const remaining = tabs.filter(t => t.id !== tab.id)
    onTabsChange(remaining)
    if (activeTabId === tab.id) onTabChange(remaining[0].id)
  }

  return (
    <div style={styles.bar}>
      {/* Tab list */}
      <div style={styles.tabs}>
        {tabs.map(tab => (
          <div
            key={tab.id}
            style={{
              ...styles.tab,
              ...(activeTabId === tab.id ? styles.tabActive : {}),
            }}
          >
            {editingId === tab.id ? (
              <input
                style={styles.renameInput}
                value={editValue}
                onChange={e => setEditValue(e.target.value)}
                onBlur={() => handleRenameCommit(tab)}
                onKeyDown={e => {
                  if (e.key === 'Enter') handleRenameCommit(tab)
                  if (e.key === 'Escape') setEditingId(null)
                }}
                autoFocus
              />
            ) : (
              <>
                <span
                  style={styles.tabLabel}
                  onClick={() => onTabChange(tab.id)}
                  onDoubleClick={() => handleRename(tab)}
                >
                  {tab.name}
                </span>
                {tabs.length > 1 && (
                  <button
                    style={styles.closeBtn}
                    onClick={e => { e.stopPropagation(); handleDelete(tab) }}
                  >×</button>
                )}
              </>
            )}
          </div>
        ))}
        <button style={styles.addBtn} onClick={handleAdd}>+</button>
      </div>

      {/* Right controls */}
      <div style={styles.controls}>
        <button style={styles.focusBtn} onClick={onFocusOpen}>
          <span style={styles.focusBtnIcon}>◈</span>
          FOCUS
        </button>
      </div>
    </div>
  )
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'stretch',
    justifyContent: 'space-between',
    background: 'var(--bg-base)',
    borderBottom: '1px solid var(--border-dim)',
    height: '32px',
    flexShrink: 0,
  },
  tabs: {
    display: 'flex',
    alignItems: 'stretch',
    overflow: 'hidden',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    padding: '0 12px',
    borderRight: '1px solid var(--border-dim)',
    cursor: 'pointer',
    transition: 'background var(--transition-fast)',
    position: 'relative',
  },
  tabActive: {
    background: 'var(--bg-surface)',
    borderBottom: '1px solid var(--accent)',
  },
  tabLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    color: 'var(--text-secondary)',
    letterSpacing: '0.12em',
    userSelect: 'none',
    whiteSpace: 'nowrap',
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontSize: '14px',
    lineHeight: 1,
    padding: '0 2px',
    transition: 'color var(--transition-fast)',
  },
  renameInput: {
    background: 'transparent',
    border: 'none',
    borderBottom: '1px solid var(--accent)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.12em',
    outline: 'none',
    width: '80px',
  },
  addBtn: {
    background: 'transparent',
    border: 'none',
    borderRight: '1px solid var(--border-dim)',
    color: 'var(--text-dim)',
    cursor: 'pointer',
    fontSize: '16px',
    padding: '0 12px',
    transition: 'color var(--transition-fast)',
  },
  controls: {
    display: 'flex',
    alignItems: 'center',
    gap: '1px',
    padding: '0 8px',
  },
  focusBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: 'transparent',
    border: '1px solid var(--border-base)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: '10px',
    letterSpacing: '0.15em',
    padding: '4px 10px',
    cursor: 'pointer',
    transition: 'all var(--transition-fast)',
  },
  focusBtnIcon: {
    color: 'var(--accent)',
    fontSize: '12px',
  },
}
