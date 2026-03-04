// ─── API клієнт ───────────────────────────────────────────
// Всі запити йдуть через /api/gas (Vercel Serverless Function)
// яка проксіює до Google Apps Script — без CORS проблем

export async function gasCall(action, params = []) {
  const encodedParams = encodeURIComponent(JSON.stringify(params))
  const url = `/api/gas?action=${action}&params=${encodedParams}`

  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)

  const data = await res.json()
  if (data && data.ok === false) throw new Error(data.error || 'API error')
  return data
}
