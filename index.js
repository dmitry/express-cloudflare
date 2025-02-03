const fs = require('fs')
const path = require('path')
const ipRangeCheck = require('ip-range-check')

class CloudflareIPManager {
  ipRanges = { v4: [], v6: [] }
  updateTimer = null

  constructor(options) {
    if (!options.paths || !options.urls) {
      throw new Error('File paths and URLs must be provided')
    }

    this.options = options

    this.loadFromFiles()
    this.loadFromUrls()
  }

  _parseRanges(content) {
    return content.trim().split('\n')
  }

  loadFromFiles() {
    try {
      this.ipRanges = Object.keys(this.options.paths).reduce((acc, version) => ({
        ...acc,
        [version]: this._readFileSync(this.options.paths[version])
      }), {})
    } catch (error) {
      console.error('Failed to load IP ranges from files:', error.message)
    }
  }

  _readFileSync(filePath) {
    try {
      return this._parseRanges(fs.readFileSync(filePath, 'utf8'))
    } catch (error) {
      console.error(`Failed to read file ${filePath}:`, error.message)
      return []
    }
  }

  async loadFromUrls() {
    console.debug('[CloudflareIPManager] Fetching IP ranges from URLs...')
    const ranges = await Promise.all(
      Object.entries(this.options.urls).map(async ([version, url]) => ({
        version,
        ranges: await this._fetchRanges(url)
      }))
    )

    ranges.forEach(({ version, ranges }) => {
      if (ranges.length > 0) {
        this.ipRanges[version] = ranges
      }
    })

    console.debug('[CloudflareIPManager] IP ranges updated:', this.ipRanges)
  }

  async _fetchRanges(url) {
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      const content = await response.text()
      return this._parseRanges(content)
    } catch (error) {
      console.error(`Failed to fetch from URL ${url}:`, error.message)
      return []
    }
  }

  startUpdates() {
    if (!this.updateTimer) {
      this.updateTimer = setInterval(() => {
        this.loadFromUrls()
      }, this.options.updateInterval)
    }
  }

  stopUpdates() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
    }
  }

  isCloudflareIP(ip) {
    return ipRangeCheck(ip, [...this.ipRanges.v4, ...this.ipRanges.v6])
  }
}

class ExpressCloudflareMiddleware {
  constructor(options = {}) {
    const defaultPath = path.join(__dirname, '/data')
    const defaultOptions = {
      updateInterval: 3600000,
      strict: true,
      errorHandler: (req, res) => res.status(403).send(''),
      updateClientIP: true,
      ipManagerOptions: null,
      urls: {
        v4: 'https://www.cloudflare.com/ips-v4',
        v6: 'https://www.cloudflare.com/ips-v6'
      },
      paths: {
        v4: defaultPath + '/ips-v4.txt',
        v6: defaultPath + '/ips-v6.txt'
      }
    }

    this.options = { ...defaultOptions, ...options }

    const ipManagerOptions = this.options.ipManagerOptions || {
      updateInterval: this.options.updateInterval,
      paths: this.options.paths,
      urls: this.options.urls
    }

    this.ipManager = new CloudflareIPManager(ipManagerOptions)

    if (this.options.strict) {
      this.ipManager.startUpdates()
    }
  }

  setStrict(strict) {
    this.options.strict = strict
    if (strict) {
      this.ipManager.startUpdates()
    } else {
      this.ipManager.stopUpdates()
    }
  }

  middleware() {
    return (req, res, next) => {
      req.cloudflareIP = req.ip

      const cfConnectingIp = req.headers['cf-connecting-ip']
      if (this.options.updateClientIP && cfConnectingIp) {
        Object.defineProperty(req, 'ip', {
          get: function () {
            const newIp = cfConnectingIp || req.ip
            console.debug('[ExpressCloudflareMiddleware] Updated IP to', newIp)
            return newIp
          },
          configurable: true
        })
      }

      const requestIsCloudflareIp = this.ipManager.isCloudflareIP(req.cloudflareIP)
      console.debug('[ExpressCloudflareMiddleware]', {
        url: req.url,
        xForwardedFor:req.headers['x-forwarded-for'],
        remoteAddress: req.socket.remoteAddress,
        originalIp: req.cloudflareIP,
        newIp: req.ip,
        cfConnectingIp,
        requestIsCloudflareIp,
      })

      if (this.options.strict && !requestIsCloudflareIp) {
        return this.options.errorHandler(req, res)
      }

      next()
    }
  }
}

module.exports = ExpressCloudflareMiddleware
