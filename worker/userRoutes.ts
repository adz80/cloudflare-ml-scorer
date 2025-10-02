import { Hono } from "hono";
import { Env } from './core-utils';
export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Add more routes like this. **DO NOT MODIFY CORS OR OVERRIDE ERROR HANDLERS**
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'this works' }}));
    app.post('/api/inspect', async (c) => {
        const headers = c.req.header();
        // Helper to perform a case-insensitive header lookup.
        const getHeaderValue = (name: string): string | undefined => {
            const lowerCaseName = name.toLowerCase();
            for (const [key, value] of Object.entries(headers)) {
                if (key.toLowerCase() === lowerCaseName) {
                    return value;
                }
            }
            return undefined;
        };
        // In a real Cloudflare environment, headers are often prefixed, e.g., 'cf-'.
        // This logic correctly checks for the primary header name and then its fallback.
        const securityScores = {
            'Bot-Score': getHeaderValue('Bot-Score') ?? getHeaderValue('cf-bot-score') ?? 'N/A',
            'Waf-Attack-Score': getHeaderValue('Waf-Attack-Score') ?? getHeaderValue('cf-threat-score') ?? 'N/A',
            'Waf-Rce-Score': getHeaderValue('Waf-Rce-Score') ?? 'N/A',
            'Waf-Sqi-Score': getHeaderValue('Waf-Sqi-Score') ?? 'N/A',
            'Waf-Xss-Score': getHeaderValue('Waf-Xss-Score') ?? 'N/A',
        };
        return c.json(securityScores);
    });
}