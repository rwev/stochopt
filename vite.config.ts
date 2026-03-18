import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'

// ---------------------------------------------------------------------------
//  Barchart.com proxy plugin
//
//  Establishes a session with barchart.com (captures cookies from an initial
//  page load) then proxies /api/barchart/* requests to their core API with
//  the session credentials. Re-establishes the session automatically on 401.
// ---------------------------------------------------------------------------

function barchartProxy(): Plugin {
  let sessionCookies = ''
  let xsrfToken = ''
  let sessionPromise: Promise<void> | null = null

  const UA =
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

  async function establishSession(): Promise<void> {
    const res = await fetch(
      'https://www.barchart.com/stocks/quotes/SPY/options',
      {
        headers: {
          'User-Agent': UA,
          Accept:
            'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        redirect: 'follow',
      },
    )

    const setCookies: string[] =
      (res.headers as unknown as { getSetCookie?: () => string[] })
        .getSetCookie?.() ?? []

    const parts: string[] = []
    for (const cookie of setCookies) {
      const nameValue = cookie.split(';')[0]
      parts.push(nameValue)

      const eqIdx = nameValue.indexOf('=')
      if (eqIdx !== -1 && nameValue.slice(0, eqIdx) === 'XSRF-TOKEN') {
        xsrfToken = decodeURIComponent(nameValue.slice(eqIdx + 1))
      }
    }

    sessionCookies = parts.join('; ')

    if (sessionCookies) {
      console.log('[barchart-proxy] Session established')
    } else {
      console.warn(
        '[barchart-proxy] No cookies received — API calls may fail',
      )
    }
  }

  async function proxyFetch(
    url: string,
  ): Promise<{ status: number; body: string; ct: string }> {
    const r = await fetch(url, {
      headers: {
        Cookie: sessionCookies,
        'X-XSRF-TOKEN': xsrfToken,
        Referer: 'https://www.barchart.com/',
        Accept: 'application/json',
        'User-Agent': UA,
      },
    })
    return {
      status: r.status,
      body: await r.text(),
      ct: r.headers.get('content-type') ?? 'application/json',
    }
  }

  return {
    name: 'barchart-proxy',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith('/api/barchart/')) return next()

        const apiPath = req.url.replace('/api/barchart/', '')
        const apiUrl = `https://www.barchart.com/proxies/core-api/v1/${apiPath}`

        void (async () => {
          try {
            // Establish session on first request
            if (!sessionCookies) {
              if (!sessionPromise) sessionPromise = establishSession()
              await sessionPromise
            }

            let result = await proxyFetch(apiUrl)

            // Re-establish session on auth failure and retry once
            if (result.status === 401 || result.status === 403) {
              console.log('[barchart-proxy] Auth failed, re-establishing session…')
              sessionCookies = ''
              xsrfToken = ''
              sessionPromise = establishSession()
              await sessionPromise
              result = await proxyFetch(apiUrl)
            }

            res.writeHead(result.status, {
              'Content-Type': result.ct,
              'Access-Control-Allow-Origin': '*',
            })
            res.end(result.body)
          } catch (err) {
            console.error('[barchart-proxy]', err)
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: String(err) }))
          }
        })()
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), barchartProxy()],
  base: '/stochopt/',
})
