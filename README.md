# Express Cloudflare middleware

## Overview

express-cloudflare is an Express.js middleware that validates and manages requests originating from Cloudflare's proxy services. It provides IP validation, automatic updates of Cloudflare IP ranges, and request IP management.

## Features

- Validates requests from Cloudflare IPs
- Automatic updates of Cloudflare IP ranges
- Configurable strict mode
- Custom error handling
- IP override capabilities
- Support for both IPv4 and IPv6

## Installation

```bash
npm install -d express-cloudflare
```

## Basic Usage

```javascript
import express from 'express'
import ExpressCloudflareMiddleware from 'express-cloudflare'

const app = express()

const middleware = new ExpressCloudflareMiddleware()

app.use(middleware.middleware())
```

## Configuration Options

The middleware accepts the following configuration options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `updateInterval` | number | 3600000 | Update interval for IP ranges in milliseconds |
| `strict` | boolean | true | Enforces Cloudflare IP validation |
| `errorHandler` | function | `(req, res) => res.status(403).send('')` | Custom error handler |
| `updateClientIP` | boolean | true | Updates request IP with CF-Connecting-IP |
| `paths` | object | See below | File paths for IP ranges |
| `urls` | object | See below | URLs for IP range updates |

### Default Paths and URLs

```javascript
{
  paths: {
    v4: './data/ips-v4.txt',
    v6: './data/ips-v6.txt'
  },
  urls: {
    v4: 'https://www.cloudflare.com/ips-v4',
    v6: 'https://www.cloudflare.com/ips-v6'
  }
}
```

## Advanced Configuration

```javascript
const middleware = new ExpressCloudflareMiddleware({
  updateInterval: 3600000,
  errorHandler: (req, res) => {
    res.status(403).json({ error: 'Invalid IP origin' })
  },
  updateClientIP: false,
  strict: false
})
```

## Request Object Modifications

The middleware modifies the Express request object with the following properties:

- `req.cloudflareIP`: Original IP address of the request
- `req.ip`: Modified to return CF-Connecting-IP when available (if updateClientIP is true)

## IP Resolution Logic

1. Original IP is stored in `req.cloudflareIP`
2. If `updateClientIP` is true and `cf-connecting-ip` header is present:
    - `req.ip` getter is modified to return the Cloudflare IP
3. In strict mode:
    - Request is validated against known Cloudflare IP ranges
    - Non-Cloudflare IPs are rejected with 403 status

## Runtime Control

### Strict Mode Toggle

```javascript
// Disable strict mode
middleware.setStrict(false)

// Enable strict mode
middleware.setStrict(true)
```

## IP Range Updates

### File Structure
IP range files should contain one CIDR range per line:

```text
// ips-v4.txt
103.21.244.0/22
103.22.200.0/22
...

// ips-v6.txt
2606:4700::/44
2606:4700:3::/48
...
```

### Update Process

1. Initial load from local files
2. Immediate URL update on startup
3. Periodic updates based on `updateInterval`
4. Graceful fallback to existing ranges on update failure

## Best Practices

1. Enable trust proxy in Express when behind Cloudflare:
   ```javascript
   app.set('trust proxy', true)
   ```

> When running behind a proxy, the `updateClientIP` option should be set to `false`. This is important because the proxy adds Cloudflare's IP address to the X-Forwarded-For header, and you don't want to override the IP resolution behavior in this case.
> For more information about how Cloudflare handles request headers, see: https://developers.cloudflare.com/fundamentals/reference/http-request-headers/#x-forwarded-for

2. Implement custom error handling for production:

   ```javascript
   const middleware = new ExpressCloudflareMiddleware({
     errorHandler: (req, res) => {
       console.error(`Invalid IP: ${req.cloudflareIP}`)
       res.status(403).json({ error: 'Access denied' })
     }
   })
   ```

> It is recommended not to expose detailed error information in production.

3. When using your own proxy server (such as Nginx, Caddy, or other web servers), it is recommended to handle Cloudflare IP validation at the proxy level rather than using this middleware. Most proxy servers already have built-in solutions for this purpose.

## License

MIT License - see LICENSE file for details.