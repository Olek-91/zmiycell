// api/gas.js — Vercel Serverless Function (ESM)
// Проксіює запити від браузера до Google Apps Script
// Вирішує проблему CORS: браузер → Vercel → Apps Script

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
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
  const paramsStr = req.method === 'POST' ? (req.body?.params ? JSON.stringify(req.body.params) : '') : req.query.params
  
  if (!action) {
    res.status(400).json({ ok: false, error: 'Missing action' })
    return
  }

  try {
    const url = new URL(gasUrl)
    
    let fetchOptions = {}
    if (req.method === 'POST') {
      fetchOptions = {
        method: 'POST',
        redirect: 'follow',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ action: action, params: req.body?.params || [] })
      }
    } else {
      url.searchParams.set('action', action)
      if (paramsStr) url.searchParams.set('params', paramsStr)
      fetchOptions = {
        method: 'GET',
        redirect: 'follow',
        headers: { 'Accept': 'application/json' },
      }
    }

    const gasRes = await fetch(url.toString(), fetchOptions)

    const text = await gasRes.text()

    let data
    try { data = JSON.parse(text) }
    catch (_) { data = { ok: false, error: 'Invalid JSON from Apps Script: ' + text.slice(0, 200) } }

    res.status(200).json(data)
  } catch (err) {
    res.status(502).json({ ok: false, error: err.message })
  }
}
