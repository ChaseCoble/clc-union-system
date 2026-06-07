const BASE = ''  // same origin — Vite proxies in dev, nginx in prod

async function request(method, path, body) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  }
  if (body) opts.body = JSON.stringify(body)
  const res = await fetch(`${BASE}${path}`, opts)
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`)
  if (res.status === 204) return null
  return res.json()
}

// Auth
export const authVerify  = ()           => request('GET',  '/api/auth/verify')
export const authLogin   = (u, p)       => request('POST', '/api/auth/login',   { username: u, password: p })
export const authLogout  = ()           => request('POST', '/api/auth/logout')

// Panels
export const getPanels   = ()           => request('GET',  '/ui/panels')

// Tabs
export const getTabs     = (userId)     => request('GET',  `/tabs?user_id=${userId}`)
export const createTab   = (userId, d)  => request('POST', `/tabs?user_id=${userId}`, d)
export const updateTab   = (id, d)      => request('PATCH', `/tabs/${id}`, d)
export const deleteTab   = (id)         => request('DELETE', `/tabs/${id}`)

// UI State
export const getUIState  = (userId)     => request('GET',  `/ui/state/${userId}`)
export const saveUIState = (userId, d)  => request('POST', `/ui/state/${userId}`, d)

// Focus
export const getFocus    = ()           => request('GET',  '/focus')
export const rebuildFocus = ()          => request('POST', '/focus/rebuild')
