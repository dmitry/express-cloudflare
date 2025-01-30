import { Request, Response, NextFunction } from 'express';

interface IPRanges {
    v4: string[];
    v6: string[];
}

interface CloudflareIPManagerOptions {
    paths: {
        v4: string;
        v6: string;
    };
    urls: {
        v4: string;
        v6: string;
    };
    updateInterval?: number;
}

interface ExpressCloudflareMiddlewareOptions {
    /**
     * Update interval in milliseconds. Default: 3600000 (1 hour)
     */
    updateInterval?: number;
    /**
     * Whether to strictly validate IPs. Default: true
     */
    strict?: boolean;
    /**
     * Custom error handler for invalid IPs
     */
    errorHandler?: (req: Request, res: Response) => void;
    /**
     * Whether to update client IP with CF-Connecting-IP header. Default: true
     */
    updateClientIP?: boolean;
    /**
     * Custom IP manager options
     */
    ipManagerOptions?: CloudflareIPManagerOptions;
    /**
     * URLs for Cloudflare IP ranges
     */
    urls?: {
        v4: string;
        v6: string;
    };
    /**
     * Paths to local IP range files
     */
    paths?: {
        v4: string;
        v6: string;
    };
}

declare class CloudflareIPManager {
    private ipRanges: IPRanges;
    private updateTimer: NodeJS.Timer | null;
    private options: CloudflareIPManagerOptions;

    constructor(options: CloudflareIPManagerOptions);

    private _parseRanges(content: string): string[];
    private loadFromFiles(): void;
    private _readFileSync(filePath: string): string[];
    private loadFromUrls(): Promise<void>;
    private _fetchRanges(url: string): Promise<string[]>;

    startUpdates(): void;
    stopUpdates(): void;
    isCloudflareIP(ip: string): boolean;
}

declare class ExpressCloudflareMiddleware {
    private options: ExpressCloudflareMiddlewareOptions;
    private ipManager: CloudflareIPManager;

    constructor(options?: ExpressCloudflareMiddlewareOptions);

    /**
     * Set strict mode for IP validation
     */
    setStrict(strict: boolean): void;

    /**
     * Express middleware function
     */
    middleware(): (req: Request & { cloudflareIP?: string }, res: Response, next: NextFunction) => void;
}

export default ExpressCloudflareMiddleware;
