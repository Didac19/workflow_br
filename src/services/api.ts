import axios from 'axios';
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

const isTauri = typeof window !== 'undefined' && ('__TAURI_INTERNALS__' in window || '__TAURI__' in window);

const client = {
    post: async (url: string, data: any, config?: any) => {
        let serverUrl = config?.headers?.['x-server-url'];

        if (!serverUrl) {
            const stored = localStorage.getItem('odoo_auth');
            if (stored) {
                try {
                    const creds = JSON.parse(stored);
                    serverUrl = creds.serverUrl;
                } catch (e) { }
            }
        }

        const headers: Record<string, string> = {
            'Content-Type': 'application/json',
            ...(config?.headers || {})
        };

        if (isTauri) {
            let targetUrl = url;
            if (serverUrl && targetUrl.startsWith('/')) {
                targetUrl = serverUrl.replace(/\/$/, '') + targetUrl;
            }
            const res = await tauriFetch(targetUrl, {
                method: 'POST',
                headers,
                body: JSON.stringify(data),
            });
            const responseData = await res.json();
            return { data: responseData };
        } else {
            if (serverUrl) {
                headers['x-server-url'] = serverUrl;
            }
            const res = await axios.post(url, data, { ...config, headers });
            return { data: res.data };
        }
    }
};

const getAuthParams = () => {
    const stored = localStorage.getItem('odoo_auth');
    if (stored) {
        try {
            const creds = JSON.parse(stored);
            return {
                url: `/jsonrpc`,
                db: creds.database,
                uid: creds.uid,
                password: creds.password,
            };
        } catch (e) {
            return null;
        }
    }
    return null;
};

export const authenticate = async (serverUrl: string, database: string, username: string, password: string): Promise<number | null> => {
    try {
        const response = await client.post(`/jsonrpc`, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "common",
                method: "authenticate",
                args: [database, username, password, {}]
            }
        }, {
            headers: {
                'x-server-url': serverUrl
            }
        });

        if (response.data.error) {
            console.error('JSON-RPC Auth Error:', response.data.error);
            return null;
        }

        return response.data.result || null;
    } catch (error) {
        console.error('API Auth Error:', error);
        return null;
    }
};

export interface Product {
    id: number;
    name: string;
}

export interface SuggestedAction {
    id: number;
    name: string;
    parent_id?: number | false;
    related_line_ids?: number[];
    action_description?: string;
    priority?: string | number;
    completes_order_line?: boolean;
    is_automatic?: boolean;
    require_evidence?: boolean;
    state?: 'draft' | 'in_progress' | 'done' | 'cancelled';
    stage_id?: [number, string] | number | false;
}

export interface OrderState {
    id: number;
    name: string;
}

export const getProducts = async (): Promise<Product[]> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return [];

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.webservice",
                    "get_products_data",
                    0
                ]
            }
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return [];
        }

        return response.data.result?.products || [];
    } catch (error) {
        console.error('API Fetch Error:', error);
        return [];
    }
};

export const getWorkflowLines = async (productId: number): Promise<SuggestedAction[]> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return [];

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.workflow.line",
                    "search_read",
                    [
                        [
                            ["product_id", "=", productId],
                            ["is_template", "=", true]
                        ]
                    ],
                    {}
                ]
            },
            id: 1
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return [];
        }

        return response.data.result || [];
    } catch (error) {
        console.error('API Fetch Error:', error);
        return [];
    }
};

export const createWorkflowLine = async (productId: number, name: string, extraData: Partial<SuggestedAction> = {}): Promise<number | null> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return null;

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.workflow.line",
                    "create",
                    [
                        {
                            name,
                            product_id: productId,
                            is_template: true,
                            ...extraData
                        }
                    ]
                ]
            },
            id: 1
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return null;
        }

        return response.data.result || null;
    } catch (error) {
        console.error('API Create Error:', error);
        return null;
    }
};

export const updateWorkflowLine = async (id: number, data: Partial<SuggestedAction>): Promise<boolean> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return false;

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.workflow.line",
                    "write",
                    [
                        [id],
                        data
                    ]
                ]
            },
            id: 1
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return false;
        }

        return !!response.data.result;
    } catch (error) {
        console.error('API Update Error:', error);
        return false;
    }
};

export const deleteWorkflowLine = async (id: number): Promise<boolean> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return false;

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.workflow.line",
                    "unlink",
                    [[id]]
                ]
            },
            id: 1
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return false;
        }

        return !!response.data.result;
    } catch (error) {
        console.error('API Delete Error:', error);
        return false;
    }
};

export const addWorkflowConnection = async (sourceId: number, targetId: number): Promise<boolean> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return false;

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.workflow.line",
                    "write",
                    [
                        [sourceId],
                        {
                            related_line_ids: [[4, targetId]]
                        }
                    ]
                ]
            },
            id: 1
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return false;
        }

        return !!response.data.result;
    } catch (error) {
        console.error('API Connection Error:', error);
        return false;
    }
};

export const removeWorkflowConnection = async (sourceId: number, targetId: number): Promise<boolean> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return false;

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.workflow.line",
                    "write",
                    [
                        [sourceId],
                        {
                            related_line_ids: [[3, targetId]]
                        }
                    ]
                ]
            },
            id: 1
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return false;
        }

        return !!response.data.result;
    } catch (error) {
        console.error('API Connection Removal Error:', error);
        return false;
    }
};

export const getOrderStates = async (): Promise<OrderState[]> => {
    const auth = getAuthParams();
    if (!auth || !auth.uid) return [];

    try {
        const response = await client.post(auth.url, {
            jsonrpc: "2.0",
            method: "call",
            params: {
                service: "object",
                method: "execute_kw",
                args: [
                    auth.db,
                    auth.uid,
                    auth.password,
                    "dpi.order.state",
                    "search_read",
                    [[]],
                    { "fields": ["id", "name"] }
                ]
            },
            id: 1
        });

        if (response.data.error) {
            console.error('JSON-RPC Error:', response.data.error);
            return [];
        }

        return response.data.result || [];
    } catch (error) {
        console.error('API Fetch Order States Error:', error);
        return [];
    }
};
