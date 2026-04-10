import type { AuraTool, ToolResultContent } from "../types/index.js";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number | string;
  method: string;
  params?: any;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number | string;
  result?: any;
  error?: { code: number; message: string; data?: any };
}

export class SseMcpClient {
  private eventSource: EventSource | null = null;
  private messageEndpoint: string | null = null;
  private messageIdCounter = 1;
  private pendingRequests = new Map<
    number | string,
    {
      resolve: (val: any) => void;
      reject: (err: any) => void;
    }
  >();
  private serverInfo: { name: string; version: string; instructions?: string; description?: string } | null = null;

  constructor(
    private url: string,
    private serverId: string,
  ) {}

  async connect(): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      try {
        const urlWithParams = new URL(this.url);
        this.eventSource = new EventSource(urlWithParams.toString());

        this.eventSource.onerror = () => {
          if (!this.messageEndpoint) {
            reject(new Error(`Failed to connect to MCP SSE at ${this.url}`));
            this.disconnect();
          }
        };

        this.eventSource.addEventListener("endpoint", (e: MessageEvent) => {
          try {
            // URL resolution logic to handle relative endpoints
            const endpointUrl = new URL(e.data, this.url).toString();
            this.messageEndpoint = endpointUrl;
            resolve();
          } catch (err) {
            reject(new Error(`Invalid endpoint URL received: ${e.data}`));
          }
        });

        this.eventSource.onmessage = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data) as JsonRpcResponse;
            if (data.id && this.pendingRequests.has(data.id)) {
              const { resolve, reject } = this.pendingRequests.get(data.id)!;
              this.pendingRequests.delete(data.id);
              if (data.error) {
                reject(new Error(data.error.message));
              } else {
                resolve(data.result);
              }
            }
          } catch (err) {
            console.error("Failed to parse MCP message", err);
          }
        };
      } catch (err) {
        reject(err);
      }
    });

    const initRes = await this.sendRequest("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: {
        name: "AuraSettingsClient",
        version: "1.0.0"
      }
    });
    this.serverInfo = {
      ...initRes?.serverInfo,
      instructions: initRes?.instructions || initRes?.serverInfo?.instructions,
      description: initRes?.description || initRes?.serverInfo?.description
    };

    await this.sendNotification("notifications/initialized");
  }

  async sendNotification(method: string, params?: any): Promise<void> {
    if (!this.messageEndpoint) {
      throw new Error("Not connected to MCP server");
    }
    const req = {
      jsonrpc: "2.0",
      method,
      params,
    };

    const res = await fetch(this.messageEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      throw new Error(`HTTP Error ${res.status} posting notification to MCP endpoint`);
    }
  }

  async sendRequest(method: string, params?: any): Promise<any> {
    if (!this.messageEndpoint) {
      throw new Error("Not connected to MCP server");
    }
    const id = this.messageIdCounter++;
    const req: JsonRpcRequest = {
      jsonrpc: "2.0",
      id,
      method,
      params,
    };

    const promise = new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
    });

    const res = await fetch(this.messageEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });

    if (!res.ok) {
      this.pendingRequests.delete(id);
      throw new Error(`HTTP Error ${res.status} posting to MCP endpoint`);
    }

    return promise;
  }

  async getTools(): Promise<AuraTool[]> {
    const response = await this.sendRequest("tools/list");
    const mcpTools: any[] = response?.tools || [];

    return mcpTools.map((mcpTool) => ({
      name: `mcp:${this.serverId}:${mcpTool.name}`,
      description: mcpTool.description,
      inputSchema: mcpTool.inputSchema,
      execute: async (args) => {
        try {
          const callRes = await this.sendRequest("tools/call", {
            name: mcpTool.name,
            arguments: args,
          });
          return {
            content: (callRes?.content || []).map((item: any) =>
              item.type === "text"
                ? { type: "text", text: item.text ?? "" }
                : { type: "json", data: item },
            ) as ToolResultContent[],
            isError: callRes?.isError || false,
          };
        } catch (err) {
          return {
            content: [
              {
                type: "text",
                text: err instanceof Error ? err.message : String(err),
              },
            ],
            isError: true,
          };
        }
      },
    }));
  }

  getServerInfo() {
    return this.serverInfo;
  }

  disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.messageEndpoint = null;
    for (const { reject } of this.pendingRequests.values()) {
      reject(new Error("Connection closed"));
    }
    this.pendingRequests.clear();
  }
}
