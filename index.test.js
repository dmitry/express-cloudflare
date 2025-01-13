import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ExpressCloudflareMiddleware from './index'
import express from 'express'

describe('ExpressCloudflareMiddleware', () => {
  let app
  let middleware
  let server

  const makeRequest = async (path, headers = {}) => {
    const port = server.address().port
    const response = await fetch(`http://localhost:${port}${path}`, {
      headers
    })
    return response
  }

  beforeEach(async () => {
    app = express()
    middleware = new ExpressCloudflareMiddleware()
    app.set('trust proxy', true)

    app.use((req, _res, next) => {
      next()
    })

    await new Promise(resolve => setTimeout(resolve, 0))

    app.use(middleware.middleware())
    app.get('/', (req, res) =>
      res.json({
        ip: req.ip,
        cloudflareIp: req.cloudflareIp
      })
    )
    server = app.listen(0)
  })

  afterEach(() => {
    server?.close()
    vi.clearAllMocks()
  })

  it('should block non-cloudflare ip v4 in strict mode', async () => {
    const response = await makeRequest('/', {
      'x-forwarded-for': '192.168.1.1'
    })

    expect(response.status).toBe(403)
  })

  it('should accept non-cloudflare ip v4 in non-strict mode', async () => {
    middleware.setStrict(false)

    const response = await makeRequest('/', {
      'x-forwarded-for': '192.168.1.1'
    })

    expect(response.status).toBe(200)
  })

  it('should accept cloudflare ip v4 in strict mode', async () => {
    const response = await makeRequest('/', {
      'x-forwarded-for': '103.21.245.1',
      'cf-connecting-ip': '82.131.86.167'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ip: '82.131.86.167'})
  })

  it('should not update request ip address', async () => {
    middleware.options.updateClientIP = false

    const response = await makeRequest('/', {
      'x-forwarded-for': '103.21.245.1',
      'cf-connecting-ip': '82.131.86.167'
    })

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ip: '103.21.245.1'})
  })

  it('should accept cloudflare ip v6 in strict mode', async () => {
    const response = await makeRequest('/', {
      'x-forwarded-for': '2606:4700:0000:0000:0000:0000:0000:0001'
    })

    expect(response.status).toBe(200)
  })
})