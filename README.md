# Express Cloudflare middleware

## Overview

🛡️ Make your Express.js app securely work with Cloudflare! This middleware ensures only real Cloudflare IPs can access your app, handles user IPs correctly, and stays up-to-date with Cloudflare's network.

## Features

- Validates requests from Cloudflare IPs
- Automatic updates of Cloudflare IP ranges
- Configurable strict mode
- Custom error handling
- IP override capabilities
- Support for both IPv4 and IPv6

## Installation

```bash
npm install express-cloudflare-middleware
```

## Basic Usage

```javascript
import express from 'express'
import ExpressCloudflareMiddleware from 'express-cloudflare-middleware'

const app = express()

const cloudflare = new ExpressCloudflareMiddleware()

app.use(cloudflare.middleware())
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
   strict: false,
   paths: {
      v4: './custom/path/ips-v4.txt',
      v6: './custom/path/ips-v6.txt'
   }
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

## IP Manager Configuration

The middleware uses an internal `CloudflareIPManager` class that can be configured using the `ipManagerOptions` parameter. If not provided, it will use the main middleware options for configuration.

### IP Manager Features
- Initial loading of IP ranges from local files on instantiation
- Initial loading of IP ranges from URLs on instantiation
- Periodic updates from Cloudflare URLs when updates are enabled
- Error handling for failed loads and updates
- Support for both IPv4 and IPv6 ranges

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

1. Implement custom error handling for production:

   ```javascript
   const middleware = new ExpressCloudflareMiddleware({
     errorHandler: (req, res) => {
       console.error(`Invalid IP: ${req.cloudflareIP}`)
       res.status(403).json({ error: 'Access denied' })
     }
   })
   ```

> It is recommended not to expose detailed error information in production.

2. When using your own proxy server (such as Nginx, Caddy, or other web servers), it is recommended to handle Cloudflare IP validation at the proxy level rather than using this middleware. Most proxy servers already have built-in solutions for this purpose.

## Notes

- The middleware uses ES modules (`import`/`export`)
- All file paths are resolved relative to the middleware's location
- Default IP range files are stored in the `data` directory within the package
- The middleware requires `fetch` API support

## License

MIT License - see LICENSE file for details.
