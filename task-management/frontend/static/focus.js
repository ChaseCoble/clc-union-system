/**
 * Task Management Focus Component
 * Element: focus-task-management-active-task
 * Served at: GET /focus/active_task.js
 *
 * Shows: mounted tasks + top queued task, session timer, break button, score.
 * Minimal — distraction suppression is the whole point.
 */

const FOCUS_STYLES = `
  :host {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background: var(--color-bg);
    box-sizing: border-box;
  }

  * { box-sizing: border-box; }

  /* ── Header ── */
  .focus-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-1);
    flex-shrink: 0;
  }

  .timer {
    font-family: var(--font-base);
    font-size: var(--font-size-lg);
    font-weight: var(--font-weight-bold);
    color: var(--color-text);
    letter-spacing: 0.05em;
    line-height: 1;
  }

  .score-block {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 1px;
  }

  .score-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-disabled);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .score-value {
    font-family: var(--font-base);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    line-height: 1;
  }

  .header-center {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
  }

  /* ── Buttons ── */
  button {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: background var(--transition-fast), color var(--transition-fast), border-color var(--transition-fast);
    letter-spacing: 0.06em;
  }

  .btn {
    padding: 3px 12px;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
  }
  .btn:hover {
    border-color: var(--color-border-focus);
    color: var(--color-text);
  }

  .btn-primary {
    padding: 4px 14px;
    background: var(--color-primary);
    border: 1px solid var(--color-primary);
    color: var(--color-text-inverse);
    font-weight: var(--font-weight-medium);
  }
  .btn-primary:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .btn-break {
    padding: 3px 12px;
    background: transparent;
    border: 1px solid var(--color-warning);
    color: var(--color-warning);
  }
  .btn-break:hover {
    background: rgba(250, 204, 21, 0.08);
  }

  /* ── Task cards ── */
  .tasks-container {
    flex: 1;
    overflow-y: auto;
    padding: var(--spacing-sm);
    display: flex;
    flex-direction: column;
    gap: var(--spacing-sm);
  }

  .task-card {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    padding: var(--spacing-sm);
    background: var(--color-surface-1);
  }

  .task-card.top-task {
    border-color: var(--color-primary);
    background: var(--color-surface-2);
  }

  .task-card-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .task-title {
    font-family: var(--font-base);
    font-size: var(--font-size-md);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    line-height: var(--line-height-tight);
  }

  .task-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--spacing-sm);
    line-height: var(--line-height-base);
  }

  .tag {
    display: inline-block;
    padding: 1px 7px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    background: var(--color-surface-3);
    white-space: nowrap;
  }

  .tag-platform {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-primary-glow);
  }

  .tag-mounted {
    border-color: var(--color-secondary);
    color: var(--color-secondary);
    background: transparent;
  }

  .task-actions {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
    margin-top: var(--spacing-xs);
  }

  /* ── Block form ── */
  .block-form {
    margin-top: var(--spacing-xs);
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    background: var(--color-surface-2);
  }

  .block-form-title {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: var(--spacing-xs);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    margin-bottom: var(--spacing-xs);
  }

  label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  input, select {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: var(--radius-sm);
    padding: 4px 8px;
    outline: none;
    width: 100%;
    transition: border-color var(--transition-fast);
  }
  input:focus, select:focus { border-color: var(--color-border-focus); }
  input[type="date"] { color-scheme: dark; }

  .block-actions {
    display: flex;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  /* ── Empty state ── */
  .empty {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--color-text-disabled);
    font-size: var(--font-size-xs);
    text-align: center;
    padding: var(--spacing-lg);
  }

  .loading {
    padding: var(--spacing-sm);
    color: var(--color-text-disabled);
    font-size: var(--font-size-xs);
  }

  .error-msg {
    padding: var(--spacing-sm);
    color: var(--color-destructive);
    font-size: var(--font-size-xs);
  }
`;

class FocusActiveTask extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._serviceUrl = '';
    this._apiBase = '';

    this._tasks = [];       // top task + mounted tasks
    this._session = null;
    this._loading = true;
    this._error = null;
    this._blockingTaskId = null;
    this._timerInterval = null;
    this._elapsed = 0;      // seconds since session start
  }

  connectedCallback() {
    this._serviceUrl = this.getAttribute('service-url') || '';
    this._apiBase = this._serviceUrl + '/api';
    this._bootstrap();
  }

  disconnectedCallback() {
    if (this._timerInterval) clearInterval(this._timerInterval);
  }

  // ── API ──────────────────────────────────────────────────────────────────

  async _api(path, opts = {}) {
    const token = this.getAttribute('auth-token') || window.__UNION_JWT__ || '';
    const headers = {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
    const res = await fetch(this._apiBase + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    if (res.status === 204) return null;
    return res.json();
  }

  async _bootstrap() {
    try {
      const [queue, session] = await Promise.all([
        this._api('/queue'),
        this._api('/session/current').catch(() => null),
      ]);

      // Top task = first non-mounted task in queue
      const top = queue.find(t => !t.mounted);
      // Mounted tasks
      const mounted = queue.filter(t => t.mounted);

      this._tasks = [
        ...(top ? [{ ...top, _isTop: true }] : []),
        ...mounted,
      ];

      this._session = session;

      if (session?.started_at) {
        const started = new Date(session.started_at).getTime();
        this._elapsed = Math.floor((Date.now() - started) / 1000);
        this._timerInterval = setInterval(() => {
          this._elapsed++;
          this._updateTimer();
        }, 1000);
      }

      this._loading = false;
    } catch (e) {
      this._error = e.message;
      this._loading = false;
    }
    this._render();
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async _completeTask(id) {
    try {
      await this._api(`/tasks/${id}/complete`, { method: 'PATCH', body: '{}' });
      this._tasks = this._tasks.filter(t => t.id !== id);
      // If we removed the top task, promote the next queued one
      if (!this._tasks.find(t => t._isTop)) {
        await this._refreshTop();
      }
      this._render();
    } catch (e) { console.error('[focus]', e.message); }
  }

  async _blockTask(id, blockType, until) {
    try {
      const body = { block_type: blockType };
      if (until) body.block_until = until;
      await this._api(`/tasks/${id}/block`, { method: 'PATCH', body: JSON.stringify(body) });
      this._tasks = this._tasks.filter(t => t.id !== id);
      this._blockingTaskId = null;
      if (!this._tasks.find(t => t._isTop)) {
        await this._refreshTop();
      }
      this._render();
    } catch (e) { console.error('[focus]', e.message); }
  }

  async _refreshTop() {
    try {
      const queue = await this._api('/queue');
      const top = queue.find(t => !t.mounted);
      if (top) this._tasks.unshift({ ...top, _isTop: true });
    } catch { /* silent */ }
  }

  // ── Timer ────────────────────────────────────────────────────────────────

  _formatElapsed(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  _updateTimer() {
    const el = this.shadowRoot.querySelector('.timer');
    if (el) el.textContent = this._formatElapsed(this._elapsed);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  _render() {
    const root = this.shadowRoot;
    root.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = FOCUS_STYLES;
    root.appendChild(style);

    if (this._loading) {
      const el = document.createElement('div');
      el.className = 'loading';
      el.textContent = 'Loading…';
      root.appendChild(el);
      return;
    }

    if (this._error) {
      const el = document.createElement('div');
      el.className = 'error-msg';
      el.textContent = `Error: ${this._error}`;
      root.appendChild(el);
      return;
    }

    const host = document.createElement('div');
    host.style.cssText = 'display:flex;flex-direction:column;width:100%;height:100%;';

    host.appendChild(this._renderHeader());

    if (this._tasks.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No active tasks. Queue is empty or all tasks are blocked.';
      host.appendChild(empty);
    } else {
      const container = document.createElement('div');
      container.className = 'tasks-container';
      this._tasks.forEach(t => container.appendChild(this._renderTaskCard(t)));
      host.appendChild(container);
    }

    root.appendChild(host);
    this._attachEvents(root);
  }

  _renderHeader() {
    const header = document.createElement('div');
    header.className = 'focus-header';

    const score = this._session?.performance_score ?? null;
    const scoreColor = score !== null
      ? (score >= 70 ? 'var(--color-success)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-destructive)')
      : 'var(--color-text-disabled)';

    header.innerHTML = `
      <div class="timer">${this._session ? this._formatElapsed(this._elapsed) : '--:--'}</div>
      <div class="header-center">
        ${this._session
          ? `<button class="btn-break" data-action="break">Break</button>`
          : `<span style="font-size:var(--font-size-xs);color:var(--color-text-disabled)">No session</span>`
        }
      </div>
      <div class="score-block">
        <span class="score-label">Score</span>
        <span class="score-value" style="color:${scoreColor}">${score !== null ? Math.round(score) : '—'}</span>
      </div>
    `;
    return header;
  }

  _renderTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card${task._isTop ? ' top-task' : ''}`;

    const platformName = task.platform_name || '';
    const workType = (task.work_type || '').replace(/_/g, '-').toLowerCase();

    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-title">${this._esc(task.title)}</span>
        ${task._isTop ? '' : '<span class="tag tag-mounted">mounted</span>'}
        ${platformName ? `<span class="tag tag-platform">${this._esc(platformName)}</span>` : ''}
        ${task.work_type ? `<span class="tag">${workType}</span>` : ''}
      </div>
      ${task.description ? `<div class="task-desc">${this._esc(task.description)}</div>` : ''}
      <div class="task-actions">
        <button class="btn-primary" data-action="complete" data-id="${task.id}">Complete</button>
        <button class="btn" data-action="block-open" data-id="${task.id}">Block</button>
      </div>
      ${this._blockingTaskId === task.id ? `
        <div class="block-form">
          <div class="block-form-title">Block task</div>
          <div class="form-group">
            <label>Block type</label>
            <select data-field="block-type">
              <option value="DATE">Date — until a specific date</option>
              <option value="TIMER">Timer — fixed duration</option>
              <option value="TASK">Task — until another task completes</option>
            </select>
          </div>
          <div class="form-group">
            <label>Until date</label>
            <input type="date" data-field="block-until" />
          </div>
          <div class="block-actions">
            <button class="btn-primary" data-action="confirm-block" data-id="${task.id}">Confirm</button>
            <button class="btn" data-action="cancel-block">Cancel</button>
          </div>
        </div>
      ` : ''}
    `;
    return card;
  }

  // ── Events ───────────────────────────────────────────────────────────────

  _attachEvents(root) {
    root.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset?.action;
      if (!action) return;
      const id = e.target.closest('[data-action]')?.dataset?.id;

      switch (action) {
        case 'complete':
          this._completeTask(id);
          break;
        case 'block-open':
          this._blockingTaskId = this._blockingTaskId === id ? null : id;
          this._render();
          break;
        case 'cancel-block':
          this._blockingTaskId = null;
          this._render();
          break;
        case 'confirm-block': {
          const form = root.querySelector('.block-form');
          const blockType = form?.querySelector('[data-field="block-type"]')?.value || 'DATE';
          const until = form?.querySelector('[data-field="block-until"]')?.value || null;
          this._blockTask(id, blockType, until ? until + 'T00:00:00Z' : null);
          break;
        }
        case 'break':
          // TODO: break tracking endpoint
          break;
      }
    });
  }

  _esc(str) {
    return String(str || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
}

customElements.define('focus-task-management-active-task', FocusActiveTask);
