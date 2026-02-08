import type { WebhookPayload, WebhookResponse } from '../types';

// Use empty string to use relative path (proxy) in dev, or env var in prod
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export const api = {
    async sendMessage(payload: WebhookPayload): Promise<WebhookResponse | WebhookResponse[]> {
        // Production path vs Test path handling could be improved here
        // For now using the test webhook path as per requirements, but configurable
        const url = `${API_BASE_URL}/webhook/chat`;

        try {

            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([payload]), // n8n expects an array
            });

            if (!response.ok) {
                throw new Error(`API Error: ${response.statusText}`);
            }

            const data = await response.json();
            return data; // Expecting array [{ reply: ... }]
        } catch (error) {
            console.error('API Call Failed Details:', {
                message: error instanceof Error ? error.message : String(error),
                url, // Log the URL being hit
                payload // Log the payload
            });
            throw error;
        }
    },

    async blockUser(email: string): Promise<void> {
        const url = `${API_BASE_URL}/webhook/api/v1/bloqueio`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
    },

    async unblockUser(email: string): Promise<void> {
        const url = `${API_BASE_URL}/webhook/api/v1/desbloqueio`;
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email }),
        });
    },

    async getMessages(userId: string, afterTs?: string): Promise<{ messages: any[], next_after_ts: string }> {
        const baseUrl = API_BASE_URL || window.location.origin;
        const endpoint = new URL(`${baseUrl}/webhook/get-messages`);

        endpoint.searchParams.append('user_id', userId);
        if (afterTs) {
            endpoint.searchParams.append('after_ts', afterTs);
        }

        try {
            const response = await fetch(endpoint.toString());
            if (!response.ok) {
                // If 404 or other error, mostly likely n8n workflow not active or path wrong
                // Treat as empty for now to avoid crashing the poller loop
                console.warn(`Polling failed: ${response.statusText}`);
                return { messages: [], next_after_ts: afterTs || '' };
            }
            return await response.json();
        } catch (error) {
            console.error('Polling Error:', error);
            // Return empty to keep loop running
            return { messages: [], next_after_ts: afterTs || '' };
        }
    }
};
