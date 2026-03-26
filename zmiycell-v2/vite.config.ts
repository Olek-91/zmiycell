import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.GAS_URL = env.GAS_URL

  return {
    plugins: [
      react(),
      {
        name: 'gas-proxy',
        configureServer(server) {
          server.middlewares.use('/api/gas', async (req, res) => {
            try {
              if (req.method === 'POST') {
                let body = ''
                for await (const chunk of req) body += chunk
                try { req.body = JSON.parse(body || '{}') } catch { /* ignore */ }
              }
              const url = new URL(req.url || '', `http://${req.headers.host}`)
              req.query = Object.fromEntries(url.searchParams)
              
              // @ts-expect-error - Ignore TS error on JS import
              const handler = (await import('./api/gas.js')).default
              
              const mockRes = {
                setHeader: (k: string, v: string) => res.setHeader(k, v),
                status: (code: number) => { res.statusCode = code; return mockRes },
                json: (data: unknown) => {
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify(data))
                },
                end: () => res.end()
              }
              
              await handler(req, mockRes)
            } catch(e: unknown) {
              res.statusCode = 500
              const msg = e instanceof Error ? e.message : String(e)
              res.end(msg)
            }
          })
        }
      }
    ]
  }
})
