const call = async (apiBase, path, opts = {}) => {
  const res = await fetch(apiBase + path, {
    ...opts,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
    },
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return null
  return res.json()
}

const callRaw = async (apiBase, path, opts = {}) => {
  const res = await fetch(apiBase + path, {
    ...opts,
    credentials: 'include',
  })
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`)
  if (res.status === 204) return null
  return res.json()
}

export const api = (apiBase) => ({
  // Queue
  getQueue:      (mode = 'DEEP_WORK') => call(apiBase, `/queue?mode=${mode}`),
  recompute:     (mode = 'DEEP_WORK') => call(apiBase, `/queue/recompute?mode=${mode}`, { method: 'POST' }),

  // Blocked tasks
  getBlocked:       (page = 1, limit = 10) =>
    call(apiBase, `/tasks/blocked?page=${page}&limit=${limit}`),
  getBlockedUrgent: (page = 1, limit = 10) =>
    call(apiBase, `/tasks/blocked/urgent?page=${page}&limit=${limit}`),
  getBlockedCount:  () =>
    call(apiBase, `/tasks/blocked/count`),

  // Forbidden tasks (dropped by rule pipeline)
  getForbidden:       (mode = 'DEEP_WORK', page = 1, limit = 10) =>
    call(apiBase, `/queue/forbidden?mode=${mode}&page=${page}&limit=${limit}`),
  getForbiddenUrgent: (mode = 'DEEP_WORK', page = 1, limit = 10) =>
    call(apiBase, `/queue/forbidden/urgent?mode=${mode}&page=${page}&limit=${limit}`),
  getForbiddenCount:  (mode = 'DEEP_WORK') =>
    call(apiBase, `/queue/count/forbidden?mode=${mode}`),

  // Session
  getSession:    ()                   => call(apiBase, '/session/current'),
  startSession:  ()                   => call(apiBase, '/session/start', { method: 'POST', body: '{}' }),
  endSession:    (active, brk)        => call(apiBase, '/session/end', {
    method: 'POST',
    body: JSON.stringify({ active_minutes: active, break_minutes: brk }),
  }),

  // Tasks
  getTask:       (id)                 => call(apiBase, `/tasks/${id}`),
  createTask:    (payload)            => call(apiBase, '/tasks', { method: 'POST', body: JSON.stringify(payload) }),
  completeTask:  (id, duration)       => call(apiBase, `/tasks/${id}/complete`, {
    method: 'PATCH',
    body: JSON.stringify({ actual_duration: duration ?? null }),
  }),
  blockTask:     (id, payload)        => call(apiBase, `/tasks/${id}/block`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }),
  unblockTask:   (id)                 => call(apiBase, `/tasks/${id}/unblock`, { method: 'PATCH', body: '{}' }),
  mountTask:     (id)                 => call(apiBase, `/tasks/${id}/mount`,   { method: 'PATCH', body: '{}' }),
  unmountTask:   (id)                 => call(apiBase, `/tasks/${id}/unmount`, { method: 'PATCH', body: '{}' }),

  // Hyperparameters
  getHyperparams: ()                  => call(apiBase, '/hyperparameters'),
  setHyperparam:  (key, value)        => call(apiBase, `/hyperparameters/${key}`, {
    method: 'PATCH',
    body: JSON.stringify({ value: String(value) }),
  }),

  // Health signals
  getSignals:    (limit = 50)         => call(apiBase, `/health/signals?limit=${limit}`),

  // Artifacts — backend uses query params not JSON body
  addArtifact:   (taskId, label, url) => callRaw(apiBase,
    `/tasks/${taskId}/artifacts?artifact_type=LINK&label=${encodeURIComponent(label)}&url=${encodeURIComponent(url)}`,
    { method: 'POST' }
  ),
  deleteArtifact: (taskId, artifactId) => callRaw(apiBase,
    `/tasks/${taskId}/artifacts/${artifactId}`,
    { method: 'DELETE' }
  ),
})
