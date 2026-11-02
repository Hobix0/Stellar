/* ==================================================================
   Stellar · Kleiner fetch-Wrapper für die JSON-API
   Wirft bei Fehlern einen ApiError mit der Meldung des Servers.
   ================================================================== */

export class ApiError extends Error {
    constructor(
        public readonly status: number,
        message: string,
    ) {
        super(message);
    }
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

async function request<Result>(method: HttpMethod, url: string, body?: unknown): Promise<Result> {
    const response = await fetch(url, {
        method,
        headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
        const message = (data as { error?: string } | null)?.error ?? `Fehler ${response.status}`;
        throw new ApiError(response.status, message);
    }
    return data as Result;
}

export const http = {
    get: <Result>(url: string) => request<Result>('GET', url),
    post: <Result>(url: string, body: unknown = {}) => request<Result>('POST', url, body),
    patch: <Result>(url: string, body: unknown) => request<Result>('PATCH', url, body),
    delete: <Result = { ok: true }>(url: string) => request<Result>('DELETE', url),
};
