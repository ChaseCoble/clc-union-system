/**
 * Task Management Panel — Web Component
 * panel_id: task_management
 * Consumes --color-*, --font-*, --spacing-*, --radius-*, --transition-* from host theme.
 * CSS custom properties inherit through shadow DOM — no injection needed.
 */

const STYLES = `
  :host {
    display: flex;
    flex-direction: row;
    width: 100%;
    height: 100%;
    overflow: hidden;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    color: var(--color-text);
    background: var(--color-bg);
  }

  /* ── Layout ── */
  .col-left {
    flex: 1 1 0;
    min-width: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
    border-right: 1px solid var(--color-border);
  }

  .col-right {
    width: 240px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    overflow-y: auto;
  }

  /* ── Panel header ── */
  .panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-1);
    flex-shrink: 0;
    gap: var(--spacing-sm);
  }

  .panel-title {
    font-family: var(--font-base);
    font-size: var(--font-size-xs);
    font-weight: var(--font-weight-bold);
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: var(--color-text-muted);
  }

  .header-actions {
    display: flex;
    gap: var(--spacing-xs);
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
    padding: 3px 10px;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
  }
  .btn:hover {
    border-color: var(--color-border-focus);
    color: var(--color-text);
  }

  .btn-primary {
    padding: 3px 10px;
    background: var(--color-primary);
    border: 1px solid var(--color-primary);
    color: var(--color-text-inverse);
    font-weight: var(--font-weight-medium);
  }
  .btn-primary:hover {
    background: var(--color-primary-hover);
    border-color: var(--color-primary-hover);
  }

  .btn-ghost {
    padding: 2px 8px;
    background: transparent;
    border: none;
    color: var(--color-text-muted);
  }
  .btn-ghost:hover { color: var(--color-text); }

  .btn-danger {
    padding: 3px 10px;
    background: transparent;
    border: 1px solid var(--color-border);
    color: var(--color-destructive);
  }
  .btn-danger:hover {
    border-color: var(--color-destructive);
  }

  .btn-session {
    padding: 3px 10px;
    border: 1px solid var(--color-border);
    font-weight: var(--font-weight-medium);
  }
  .btn-session.active {
    background: var(--color-success);
    border-color: var(--color-success);
    color: var(--color-text-inverse);
  }
  .btn-session.inactive {
    background: transparent;
    color: var(--color-text-muted);
  }
  .btn-session.inactive:hover {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  /* ── Section label ── */
  .section-label {
    padding: var(--spacing-xs) var(--spacing-sm);
    font-size: var(--font-size-xs);
    color: var(--color-text-disabled);
    letter-spacing: 0.1em;
    text-transform: uppercase;
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-2);
    flex-shrink: 0;
  }

  /* ── Task card ── */
  .task-card {
    border-bottom: 1px solid var(--color-border);
    padding: var(--spacing-sm);
    background: var(--color-surface-1);
  }

  .task-card-header {
    display: flex;
    align-items: flex-start;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .task-title {
    font-family: var(--font-base);
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    flex: 1;
    min-width: 0;
    line-height: var(--line-height-tight);
  }

  .task-desc {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: var(--spacing-xs);
    line-height: var(--line-height-base);
  }

  .tag {
    display: inline-block;
    padding: 1px 7px;
    border-radius: var(--radius-full);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    background: var(--color-surface-2);
    white-space: nowrap;
  }

  .tag-platform {
    border-color: var(--color-primary);
    color: var(--color-primary);
    background: var(--color-primary-glow);
  }

  .task-tags {
    display: flex;
    flex-wrap: wrap;
    gap: var(--spacing-xs);
    margin-bottom: var(--spacing-sm);
  }

  .task-actions {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
  }

  .artifact-chip {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 1px 7px;
    border-radius: var(--radius-sm);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-size: var(--font-size-xs);
    background: var(--color-surface-3);
    cursor: default;
  }

  /* ── Block form ── */
  .block-form {
    margin: var(--spacing-xs) 0 0 0;
    padding: var(--spacing-sm);
    border: 1px solid var(--color-border);
    border-radius: var(--radius-md);
    background: var(--color-surface-2);
  }

  .block-form-title {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: var(--spacing-xs);
  }

  .form-row {
    display: flex;
    gap: var(--spacing-sm);
    margin-bottom: var(--spacing-xs);
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 3px;
    flex: 1;
  }

  label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
  }

  input, select, textarea {
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    background: var(--color-surface-1);
    border: 1px solid var(--color-border);
    color: var(--color-text);
    border-radius: var(--radius-sm);
    padding: 4px 8px;
    outline: none;
    transition: border-color var(--transition-fast);
    width: 100%;
    box-sizing: border-box;
  }
  input:focus, select:focus, textarea:focus {
    border-color: var(--color-border-focus);
  }
  select {
    cursor: pointer;
  }
  textarea {
    resize: vertical;
    min-height: 60px;
  }
  input[type="date"] {
    color-scheme: dark;
  }

  .block-form-actions {
    display: flex;
    gap: var(--spacing-xs);
    margin-top: var(--spacing-xs);
  }

  /* ── Add task form ── */
  .add-task-form {
    padding: var(--spacing-sm);
    background: var(--color-surface-1);
    border-bottom: 1px solid var(--color-border);
  }

  .enjoyability-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-xs);
    margin-top: 3px;
  }

  .enjoy-option {
    border: 1px solid var(--color-border);
    border-radius: var(--radius-sm);
    padding: var(--spacing-xs);
    cursor: pointer;
    transition: border-color var(--transition-fast), background var(--transition-fast);
    background: var(--color-surface-2);
  }
  .enjoy-option:hover {
    border-color: var(--color-border-focus);
  }
  .enjoy-option.selected {
    border-color: var(--color-primary);
    background: var(--color-primary-glow);
  }
  .enjoy-option .enjoy-label {
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
    font-size: var(--font-size-xs);
    display: block;
    margin-bottom: 1px;
  }
  .enjoy-option .enjoy-desc {
    font-size: 10px;
    color: var(--color-text-muted);
    line-height: 1.3;
  }

  .enjoy-option.full-width {
    grid-column: 1 / -1;
  }

  .attachment-row {
    display: flex;
    gap: var(--spacing-xs);
    flex-wrap: wrap;
    align-items: center;
    margin-top: 3px;
  }

  .form-actions {
    display: flex;
    gap: var(--spacing-xs);
    justify-content: flex-end;
    margin-top: var(--spacing-sm);
  }

  /* ── Empty queue ── */
  .empty-queue {
    padding: var(--spacing-lg) var(--spacing-md);
    text-align: center;
    color: var(--color-text-disabled);
    font-size: var(--font-size-xs);
  }

  /* ── Right column ── */
  .right-header {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
    background: var(--color-surface-1);
    flex-shrink: 0;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .right-header-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.1em;
  }

  .perf-score {
    font-family: var(--font-base);
    font-size: var(--font-size-xl);
    font-weight: var(--font-weight-bold);
    color: var(--color-success);
    line-height: 1;
  }

  .health-signals {
    padding: var(--spacing-xs) 0;
    flex-shrink: 0;
  }

  .signal-row {
    display: flex;
    flex-direction: column;
    padding: var(--spacing-xs) var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
  }

  .signal-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    margin-bottom: 1px;
  }

  .signal-value {
    font-size: var(--font-size-sm);
    font-weight: var(--font-weight-medium);
    color: var(--color-text);
  }

  .signal-value.warn { color: var(--color-warning); }
  .signal-value.ok   { color: var(--color-success); }
  .signal-value.err  { color: var(--color-destructive); }

  .alert-banner {
    margin: var(--spacing-xs) var(--spacing-sm);
    padding: var(--spacing-xs) var(--spacing-sm);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
    border: 1px solid var(--color-warning);
    color: var(--color-warning);
    background: rgba(250, 204, 21, 0.06);
  }

  /* ── Hyperparameter tuner ── */
  .hp-section {
    padding: var(--spacing-xs) var(--spacing-sm);
    border-bottom: 1px solid var(--color-border);
  }

  .hp-section-label {
    font-size: var(--font-size-xs);
    color: var(--color-text-disabled);
    text-transform: uppercase;
    letter-spacing: 0.1em;
    padding: var(--spacing-xs) 0 3px 0;
  }

  .hp-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--spacing-xs);
    padding: 3px 0;
  }

  .hp-key {
    font-size: var(--font-size-xs);
    color: var(--color-text-muted);
    flex: 1;
    min-width: 0;
    line-height: var(--line-height-tight);
  }

  .hp-input {
    width: 52px;
    flex-shrink: 0;
    text-align: right;
    padding: 2px 5px;
  }

  .hp-save-row {
    padding: var(--spacing-xs) var(--spacing-sm) var(--spacing-sm);
  }

  .hp-save-btn {
    width: 100%;
    padding: 5px;
    background: var(--color-surface-2);
    border: 1px solid var(--color-border);
    color: var(--color-text-muted);
    font-family: var(--font-mono);
    font-size: var(--font-size-xs);
    cursor: pointer;
    border-radius: var(--radius-sm);
    transition: border-color var(--transition-fast), color var(--transition-fast);
    letter-spacing: 0.06em;
  }
  .hp-save-btn:hover {
    border-color: var(--color-primary);
    color: var(--color-primary);
  }

  .hp-save-btn.saved {
    border-color: var(--color-success);
    color: var(--color-success);
  }

  /* ── Utility ── */
  .divider { height: 1px; background: var(--color-border); }
  .spacer  { flex: 1; }
  .error-msg {
    padding: var(--spacing-sm);
    color: var(--color-destructive);
    font-size: var(--font-size-xs);
  }
  .loading {
    padding: var(--spacing-sm);
    color: var(--color-text-disabled);
    font-size: var(--font-size-xs);
  }
`;

const ENJOYABILITY_OPTIONS = [
  { value: 'PLEASANT',   label: 'Pleasant',   desc: 'Satisfying. Some friction but it doesn\'t cost you.' },
  { value: 'NEUTRAL',    label: 'Neutral',    desc: 'Neither draws nor drains. It needs doing.' },
  { value: 'DIFFICULT',  label: 'Difficult',  desc: 'Costs something. You finish it but feel it.' },
  { value: 'DREAD',      label: 'Dread',      desc: 'Actively avoided. Significant resistance.' },
  { value: 'ENJOYABLE',  label: 'Enjoyable',  desc: 'Flows naturally. No meaningful friction. You\'d do this unprompted.', fullWidth: true },
];

const WORK_TYPES = ['DEEP_WORK', 'LIGHT_WORK', 'PHONE_WORK'];
const BLOCK_TYPES = ['DATE', 'TIMER', 'TASK'];

const HP_GROUPS = {
  'Aging':     ['aging_rate', 'top_n_threshold'],
  'Queue':     ['bucket_0_slots', 'bucket_1_slots', 'bucket_2_slots', 'bucket_3_slots'],
  'Difficulty':['step_threshold', 'difficulty_ceiling', 'difficulty_target'],
  'Session':   ['max_mounted_cards', 'break_budget_ratio', 'aging_sweep_interval'],
};

const HP_LABELS = {
  aging_rate:           'Aging rate',
  top_n_threshold:      'Top N threshold',
  bucket_0_slots:       'Bucket 0 slots',
  bucket_1_slots:       'Bucket 1 slots',
  bucket_2_slots:       'Bucket 2 slots',
  bucket_3_slots:       'Bucket 3 slots',
  step_threshold:       'Step threshold',
  difficulty_ceiling:   'Ceiling',
  difficulty_target:    'Target',
  max_mounted_cards:    'Max mounted',
  break_budget_ratio:   'Break ratio',
  aging_sweep_interval: 'Sweep interval (min)',
};

class TaskManagementPanel extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
    this._apiBase = '';
    this._serviceUrl = '';

    // State
    this._queue = [];
    this._mounted = [];
    this._platforms = [];
    this._hyperparameters = {};
    this._hpEdits = {};
    this._session = null;
    this._healthSignals = [];
    this._loading = true;
    this._error = null;

    // UI state
    this._showAddTask = false;
    this._blockingTaskId = null;
    this._hpSaved = false;

    // Add task form state
    this._form = {
      title: '', platform: 'Manual', work_type: 'DEEP_WORK',
      due_date: '', estimated_duration: '', description: '',
      enjoyability: 'NEUTRAL', attachments: [],
    };
  }

  connectedCallback() {
    this._serviceUrl = this.getAttribute('service-url') || '';
    this._apiBase = this._serviceUrl + (this.getAttribute('api-base') || '/api');
    this._render();
    this._bootstrap();
  }

  // ── API ──────────────────────────────────────────────────────────────────

  async _api(path, opts = {}) {
    const token = this._getToken();
    const headers = { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    const res = await fetch(this._apiBase + path, { ...opts, headers: { ...headers, ...(opts.headers || {}) } });
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    if (res.status === 204) return null;
    return res.json();
  }

  _getToken() {
    // Token injected by dashboard shell via attribute or window
    return this.getAttribute('auth-token') || window.__UNION_JWT__ || '';
  }

  async _bootstrap() {
    try {
      await Promise.all([
        this._loadQueue(),
        this._loadPlatforms(),
        this._loadHyperparameters(),
        this._loadSession(),
        this._loadHealthSignals(),
      ]);
      this._loading = false;
    } catch (e) {
      this._error = e.message;
      this._loading = false;
    }
    this._render();
  }

  async _loadQueue() {
    const tasks = await this._api('/queue');
    const maxMounted = parseInt(this._hyperparameters['max_mounted_cards'] ?? 3);
    this._queue = tasks;
    this._mounted = tasks.filter(t => t._mounted);
    // tasks that aren't mounted, up to top_n display
    this._queueDisplay = tasks.slice(0, 20);
  }

  async _loadPlatforms() {
    const data = await this._api('/tasks?limit=0');
    // fetch platforms separately — there's no dedicated endpoint, derive from task data
    // but actually load from a GET /tasks call to get platform list isn't ideal
    // use hardcoded seed list and refresh from tasks
    this._platforms = ['HackerOne', 'Bugcrowd', 'BTLO', 'HTB', 'FHSU', 'Manual'];
  }

  async _loadHyperparameters() {
    const data = await this._api('/hyperparameters');
    this._hyperparameters = {};
    for (const hp of data) {
      this._hyperparameters[hp.key] = hp.value;
    }
    this._hpEdits = { ...this._hyperparameters };
  }

  async _loadSession() {
    try {
      this._session = await this._api('/session/current');
    } catch { this._session = null; }
  }

  async _loadHealthSignals() {
    try {
      this._healthSignals = await this._api('/health/signals');
    } catch { this._healthSignals = []; }
  }

  // ── Actions ──────────────────────────────────────────────────────────────

  async _startSession() {
    try {
      this._session = await this._api('/session/start', { method: 'POST', body: '{}' });
      this._render();
    } catch (e) { this._showError(e.message); }
  }

  async _endSession() {
    if (!this._session) return;
    try {
      const active = Math.floor((Date.now() - new Date(this._session.started_at).getTime()) / 60000);
      this._session = await this._api('/session/end', {
        method: 'POST',
        body: JSON.stringify({ session_id: this._session.id, active_minutes: active, break_minutes: 0 }),
      });
      this._render();
    } catch (e) { this._showError(e.message); }
  }

  async _completeTask(id) {
    try {
      await this._api(`/tasks/${id}/complete`, { method: 'PATCH', body: '{}' });
      await this._reloadQueue();
    } catch (e) { this._showError(e.message); }
  }

  async _blockTask(id, blockType, until) {
    try {
      const body = { block_type: blockType };
      if (until) body.block_until = until;
      await this._api(`/tasks/${id}/block`, { method: 'PATCH', body: JSON.stringify(body) });
      this._blockingTaskId = null;
      await this._reloadQueue();
    } catch (e) { this._showError(e.message); }
  }

  async _setMounted(id) {
    // "Set" = mount the card for multitasking — stored client-side for now
    // V2 will persist this to backend
    const task = this._queue.find(t => t.id === id);
    if (task) task._mounted = !task._mounted;
    this._render();
  }

  async _recompute() {
    try {
      this._queue = await this._api('/queue/recompute', { method: 'POST', body: '{}' });
      this._render();
    } catch (e) { this._showError(e.message); }
  }

  async _addTask() {
    const f = this._form;
    if (!f.title.trim()) return;
    const body = {
      title: f.title.trim(),
      platform_id: null,
      work_type: f.work_type,
      enjoyability: f.enjoyability,
      description: f.description || null,
      due_date: f.due_date || null,
      estimated_duration: f.estimated_duration ? parseInt(f.estimated_duration) : null,
    };
    // Resolve platform name to id — for now we POST with platform name via description
    // The backend POST /api/tasks takes platform_id — we'll need the platform list endpoint
    // For V1 use null platform_id and note it in description if platform selected
    if (f.platform && f.platform !== 'Manual') {
      body.description = (body.description ? body.description + '\n' : '') + `Platform: ${f.platform}`;
    }
    try {
      await this._api('/tasks', { method: 'POST', body: JSON.stringify(body) });
      this._form = { title: '', platform: 'Manual', work_type: 'DEEP_WORK', due_date: '', estimated_duration: '', description: '', enjoyability: 'NEUTRAL', attachments: [] };
      this._showAddTask = false;
      await this._reloadQueue();
    } catch (e) { this._showError(e.message); }
  }

  async _saveHyperparameters() {
    try {
      await Promise.all(
        Object.entries(this._hpEdits).map(([key, value]) =>
          this._api(`/hyperparameters/${key}`, { method: 'PATCH', body: JSON.stringify({ value: String(value) }) })
        )
      );
      this._hyperparameters = { ...this._hpEdits };
      this._hpSaved = true;
      this._render();
      setTimeout(() => { this._hpSaved = false; this._render(); }, 1500);
    } catch (e) { this._showError(e.message); }
  }

  async _reloadQueue() {
    await this._loadQueue();
    this._render();
  }

  _showError(msg) {
    console.error('[task-management]', msg);
  }

  // ── Render ───────────────────────────────────────────────────────────────

  _render() {
    const root = this.shadowRoot;
    root.innerHTML = '';

    const style = document.createElement('style');
    style.textContent = STYLES;
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
    host.style.cssText = 'display:flex;flex-direction:row;width:100%;height:100%;overflow:hidden;';

    host.appendChild(this._renderLeft());
    host.appendChild(this._renderRight());
    root.appendChild(host);

    this._attachEvents(root);
  }

  _renderLeft() {
    const col = document.createElement('div');
    col.className = 'col-left';

    // Header
    const header = document.createElement('div');
    header.className = 'panel-header';
    header.innerHTML = `
      <span class="panel-title">Task Manager</span>
      <div class="header-actions">
        ${this._session
          ? `<button class="btn-session active" data-action="end-session">Session active</button>
             <button class="btn" data-action="break">Break</button>`
          : `<button class="btn-session inactive" data-action="start-session">Start session</button>`
        }
        <button class="btn btn-primary" data-action="toggle-add">Add task</button>
      </div>
    `;
    col.appendChild(header);

    // Top queue task (active)
    const topTask = this._queue.find(t => !t._mounted);
    if (topTask) {
      col.appendChild(this._renderTaskCard(topTask, true));
    } else if (!this._showAddTask) {
      const empty = document.createElement('div');
      empty.className = 'empty-queue';
      empty.innerHTML = `No tasks queued. Add one or recompute.<br><br>
        <button class="btn" data-action="recompute" style="margin-top:4px">Recompute queue</button>`;
      col.appendChild(empty);
    }

    // Mounted
    const mountedTasks = this._queue.filter(t => t._mounted);
    if (mountedTasks.length > 0) {
      const lbl = document.createElement('div');
      lbl.className = 'section-label';
      lbl.textContent = 'Mounted';
      col.appendChild(lbl);
      mountedTasks.forEach(t => col.appendChild(this._renderTaskCard(t, false)));
    }

    // Add task form
    if (this._showAddTask) {
      col.appendChild(this._renderAddTaskForm());
    }

    // Queue recompute row
    const recomputeRow = document.createElement('div');
    recomputeRow.style.cssText = 'padding:var(--spacing-xs) var(--spacing-sm);border-top:1px solid var(--color-border);display:flex;gap:var(--spacing-xs);align-items:center;flex-shrink:0;margin-top:auto;';
    recomputeRow.innerHTML = `<span style="font-size:var(--font-size-xs);color:var(--color-text-disabled);flex:1;">${this._queue.length} tasks queued</span><button class="btn" data-action="recompute">Recompute</button>`;
    col.appendChild(recomputeRow);

    return col;
  }

  _renderTaskCard(task, isTop) {
    const card = document.createElement('div');
    card.className = 'task-card';

    const platformName = task.platform_name || '';
    const workType = (task.work_type || '').replace(/_/g, '-').toLowerCase();
    workType.charAt(0).toUpperCase() + workType.slice(1);

    const artifacts = task.artifacts || [];

    card.innerHTML = `
      <div class="task-card-header">
        <span class="task-title">${this._esc(task.title)}</span>
        ${platformName ? `<span class="tag tag-platform">${this._esc(platformName)}</span>` : ''}
        ${task.work_type ? `<span class="tag">${workType}</span>` : ''}
      </div>
      ${task.description ? `<div class="task-desc">${this._esc(task.description)}</div>` : ''}
      ${artifacts.length > 0 ? `
        <div class="task-tags">
          ${artifacts.map(a => `<span class="artifact-chip">⟁ ${this._esc(a.label)}</span>`).join('')}
        </div>
      ` : ''}
      <div class="task-actions" data-task-id="${task.id}">
        <button class="btn btn-primary" data-action="complete" data-id="${task.id}">Complete</button>
        <button class="btn" data-action="block-open" data-id="${task.id}">Block</button>
        ${isTop
          ? `<button class="btn" data-action="set-mounted" data-id="${task.id}">Set</button>
             <button class="btn" data-action="recompute">Recompute</button>`
          : `<button class="btn" data-action="unset-mounted" data-id="${task.id}">Unset</button>`
        }
      </div>
      ${this._blockingTaskId === task.id ? this._renderBlockFormHTML(task.id) : ''}
    `;
    return card;
  }

  _renderBlockFormHTML(taskId) {
    return `
      <div class="block-form" data-block-form="${taskId}">
        <div class="block-form-title">Block task</div>
        <div class="form-group" style="margin-bottom:var(--spacing-xs)">
          <label>Block type</label>
          <select data-field="block-type">
            <option value="DATE">Date — until a specific date</option>
            <option value="TIMER">Timer — fixed duration</option>
            <option value="TASK">Task — until another task completes</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom:var(--spacing-xs)">
          <label>Until date</label>
          <input type="date" data-field="block-until" />
        </div>
        <div class="block-form-actions">
          <button class="btn btn-primary" data-action="confirm-block" data-id="${taskId}">Confirm block</button>
          <button class="btn" data-action="cancel-block">Cancel</button>
        </div>
      </div>
    `;
  }

  _renderAddTaskForm() {
    const f = this._form;
    const container = document.createElement('div');
    container.className = 'add-task-form';

    container.innerHTML = `
      <div class="section-label" style="margin: 0 calc(-1*var(--spacing-sm)) var(--spacing-sm);padding-left:0">Add task</div>
      <div class="form-group" style="margin-bottom:var(--spacing-xs)">
        <label>Title</label>
        <input type="text" data-field="title" value="${this._esc(f.title)}" placeholder="Task title" />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Platform</label>
          <select data-field="platform">
            ${this._platforms.map(p => `<option value="${p}" ${f.platform === p ? 'selected' : ''}>${p}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label>Work type</label>
          <select data-field="work_type">
            ${WORK_TYPES.map(w => `<option value="${w}" ${f.work_type === w ? 'selected' : ''}>${w.replace(/_/g, '-').toLowerCase()}</option>`).join('')}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Due date (optional)</label>
          <input type="date" data-field="due_date" value="${f.due_date}" />
        </div>
        <div class="form-group">
          <label>Est. duration — min (optional)</label>
          <input type="number" data-field="estimated_duration" value="${f.estimated_duration}" placeholder="e.g. 45" min="1" />
        </div>
      </div>
      <div class="form-group" style="margin-bottom:var(--spacing-xs)">
        <label>Description (optional)</label>
        <textarea data-field="description" placeholder="Notes, context, links…">${this._esc(f.description)}</textarea>
      </div>
      <div class="form-group" style="margin-bottom:var(--spacing-xs)">
        <label>Enjoyability</label>
        <div class="enjoyability-grid">
          ${ENJOYABILITY_OPTIONS.map(o => `
            <div class="enjoy-option ${f.enjoyability === o.value ? 'selected' : ''} ${o.fullWidth ? 'full-width' : ''}"
                 data-action="set-enjoyability" data-value="${o.value}">
              <span class="enjoy-label">${o.label}</span>
              <span class="enjoy-desc">${o.desc}</span>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="form-actions">
        <button class="btn" data-action="cancel-add">Cancel</button>
        <button class="btn btn-primary" data-action="submit-add">Add task</button>
      </div>
    `;
    return container;
  }

  _renderRight() {
    const col = document.createElement('div');
    col.className = 'col-right';

    // Performance score header
    const scoreHeader = document.createElement('div');
    scoreHeader.className = 'right-header';
    const score = this._session?.performance_score ?? null;
    const scoreDisplay = score !== null ? Math.round(score) : (this._session ? '—' : '—');
    const scoreColor = score !== null ? (score >= 70 ? 'var(--color-success)' : score >= 40 ? 'var(--color-warning)' : 'var(--color-destructive)') : 'var(--color-text-disabled)';
    scoreHeader.innerHTML = `
      <span class="right-header-label">Queue health</span>
      <span class="perf-score" style="color:${scoreColor}">${scoreDisplay}</span>
    `;
    col.appendChild(scoreHeader);

    // Health signals
    const signals = document.createElement('div');
    signals.className = 'health-signals';

    // Derived session stats
    if (this._session) {
      const started = new Date(this._session.started_at);
      const activeMin = Math.floor((Date.now() - started.getTime()) / 60000);
      const breakBudget = this._hyperparameters['break_budget_ratio'] || 0.2;
      const budgetMin = Math.floor(activeMin * parseFloat(breakBudget));

      const dreadCount = this._queue.filter(t => t.enjoyability === 'DREAD').length;

      const rows = [
        { label: 'Active time', value: `${activeMin}m` },
        { label: 'Break budget', value: `${budgetMin}m`, cls: '' },
        { label: 'Tasks done', value: this._session.tasks_completed ?? 0 },
        { label: 'Dread accumulation', value: `${dreadCount} task${dreadCount !== 1 ? 's' : ''}`, cls: dreadCount >= 2 ? 'warn' : '' },
      ];

      // Alert banner for dread accumulation
      if (dreadCount >= 2) {
        const banner = document.createElement('div');
        banner.className = 'alert-banner';
        banner.textContent = 'Dread accumulation elevated';
        signals.appendChild(banner);
      }

      rows.forEach(({ label, value, cls }) => {
        const row = document.createElement('div');
        row.className = 'signal-row';
        row.innerHTML = `<span class="signal-label">${label}</span><span class="signal-value ${cls || ''}">${value}</span>`;
        signals.appendChild(row);
      });
    } else {
      const row = document.createElement('div');
      row.className = 'signal-row';
      row.innerHTML = `<span class="signal-label" style="padding:var(--spacing-xs) 0">No active session</span>`;
      signals.appendChild(row);
    }

    col.appendChild(signals);

    // HP Tune button / section
    const tuneHeader = document.createElement('div');
    tuneHeader.className = 'right-header';
    tuneHeader.style.cursor = 'pointer';
    tuneHeader.setAttribute('data-action', 'toggle-hp');
    tuneHeader.innerHTML = `<span class="right-header-label">Tune hyperparameters</span><span style="color:var(--color-text-disabled);font-size:var(--font-size-xs)">${this._showHp ? '▲' : '▼'}</span>`;
    col.appendChild(tuneHeader);

    if (this._showHp) {
      const hpContainer = document.createElement('div');

      Object.entries(HP_GROUPS).forEach(([group, keys]) => {
        const section = document.createElement('div');
        section.className = 'hp-section';
        section.innerHTML = `<div class="hp-section-label">${group}</div>`;

        keys.forEach(key => {
          const row = document.createElement('div');
          row.className = 'hp-row';
          row.innerHTML = `
            <span class="hp-key">${HP_LABELS[key] || key}</span>
            <input class="hp-input" type="number" step="any" data-hp-key="${key}" value="${this._hpEdits[key] ?? ''}" />
          `;
          section.appendChild(row);
        });

        hpContainer.appendChild(section);
      });

      const saveRow = document.createElement('div');
      saveRow.className = 'hp-save-row';
      saveRow.innerHTML = `<button class="hp-save-btn ${this._hpSaved ? 'saved' : ''}" data-action="save-hp">${this._hpSaved ? 'Saved' : 'Save'}</button>`;
      hpContainer.appendChild(saveRow);

      col.appendChild(hpContainer);
    }

    return col;
  }

  // ── Events ───────────────────────────────────────────────────────────────

  _attachEvents(root) {
    root.addEventListener('click', e => {
      const action = e.target.closest('[data-action]')?.dataset?.action;
      if (!action) return;

      const id = e.target.closest('[data-action]')?.dataset?.id;

      switch (action) {
        case 'start-session':   this._startSession(); break;
        case 'end-session':     this._endSession(); break;
        case 'break':           break; // TODO
        case 'toggle-add':
          this._showAddTask = !this._showAddTask;
          this._render();
          break;
        case 'cancel-add':
          this._showAddTask = false;
          this._render();
          break;
        case 'submit-add':      this._addTask(); break;
        case 'complete':        this._completeTask(id); break;
        case 'block-open':
          this._blockingTaskId = this._blockingTaskId === id ? null : id;
          this._render();
          break;
        case 'cancel-block':
          this._blockingTaskId = null;
          this._render();
          break;
        case 'confirm-block': {
          const form = root.querySelector(`[data-block-form="${id}"]`);
          const blockType = form?.querySelector('[data-field="block-type"]')?.value || 'DATE';
          const until = form?.querySelector('[data-field="block-until"]')?.value || null;
          this._blockTask(id, blockType, until ? until + 'T00:00:00Z' : null);
          break;
        }
        case 'set-mounted':     this._setMounted(id); break;
        case 'unset-mounted':   this._setMounted(id); break;
        case 'recompute':       this._recompute(); break;
        case 'set-enjoyability':
          this._form.enjoyability = e.target.closest('[data-value]')?.dataset?.value || this._form.enjoyability;
          this._render();
          break;
        case 'toggle-hp':
          this._showHp = !this._showHp;
          this._render();
          break;
        case 'save-hp':         this._saveHyperparameters(); break;
      }
    });

    root.addEventListener('input', e => {
      const field = e.target.dataset?.field;
      const hpKey = e.target.dataset?.hpKey;

      if (field && field in this._form) {
        this._form[field] = e.target.value;
      }
      if (hpKey) {
        this._hpEdits[hpKey] = e.target.value;
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

customElements.define('task-management-panel', TaskManagementPanel);
