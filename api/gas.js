// api/gas.js — Vercel Serverless Function (ESM)
// Проксіює запити від браузера до Google Apps Script через GET.
// Великі payload-и стискаються на стороні App.jsx (strip зайвих полів).

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  const gasUrl = process.env.GAS_URL
  if (!gasUrl) {
    res.status(500).json({ ok: false, error: 'GAS_URL not set in Vercel Environment Variables' })
    return
  }

  const action = req.method === 'POST' ? req.body?.action : req.query.action
  const params = req.method === 'POST' ? (req.body?.params || []) : JSON.parse(req.query.params || '[]')

  if (!action) {
    res.status(400).json({ ok: false, error: 'Missing action' })
    return
  }

  try {
    const isPost = req.method === 'POST'
    const url = new URL(gasUrl)
    
    let fetchOpts
    if (isPost) {
      // For POST, we don't put params in URL, we send them in body
      const bodyStr = JSON.stringify({ action, params })
      fetchOpts = {
        method: 'POST',
        redirect: 'manual',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: bodyStr
      }
    } else {
      url.searchParams.set('action', action)
      url.searchParams.set('params', JSON.stringify(params))
      fetchOpts = {
        method: 'GET',
        redirect: 'manual',
        headers: { 'Accept': 'application/json' },
      }
    }

    let gasRes = await fetch(url.toString(), fetchOpts)

    // Follow single redirect (GAS завжди робить redirect)
    if (gasRes.status >= 300 && gasRes.status < 400) {
      const location = gasRes.headers.get('location')
      if (location) {
        if (isPost) {
          // Send original POST body to the redirected URL
          gasRes = await fetch(location, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: fetchOpts.body
          })
        } else {
          gasRes = await fetch(location, {
            method: 'GET',
            headers: { 'Accept': 'application/json' },
          })
        }
      }
    }

    const text = await gasRes.text()
    let data
    try { data = JSON.parse(text) }
    catch (_) { data = { ok: false, error: 'Invalid JSON from Apps Script: ' + text.slice(0, 300) } }

    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message })
  }
}
