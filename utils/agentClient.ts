type ToolResultHandler = (tool: string, result: any) => void;

interface AgentClientOptions {
    onOpen?: () => void;
    onToolResult?: ToolResultHandler;
    onError?: (err: any) => void;
}

export class AgentClient {
    private ws: WebSocket | null = null;
    private url: string;
    private opts: AgentClientOptions = {};

    constructor(url: string) {
        this.url = url;
    }

    connect(opts: AgentClientOptions = {}): Promise<void> {
        this.opts = opts;
        return new Promise((resolve, reject) => {
            try {
                this.ws = new WebSocket(this.url);
                this.ws.onopen = () => {
                    this.ws!.onmessage = (ev) => this.handleMessage(ev.data as string);
                    if (this.opts.onOpen) this.opts.onOpen();
                    resolve();
                };
                this.ws.onerror = (err) => {
                    if (this.opts.onError) this.opts.onError(err);
                    reject(err);
                };
                this.ws.onclose = () => {
                    this.ws = null;
                };
            } catch (e) {
                reject(e);
            }
        });
    }

    private handleMessage(raw: string) {
        try {
            const msg = JSON.parse(raw);
            if (msg.type === 'tool_result' && this.opts.onToolResult) {
                this.opts.onToolResult(msg.data?.tool, msg.data?.result);
            }
        } catch (e) {
            // ignore
        }
    }

    authenticate(token: string) {
        if (!this.ws) throw new Error('Not connected');
        this.ws.send(JSON.stringify({ type: 'agent_auth', token }));
    }

    callTool(toolName: string, args?: any) {
        if (!this.ws) throw new Error('Not connected');
        this.ws.send(JSON.stringify({ type: 'tool_call', toolName, args }));
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
    }
}

export default AgentClient;
