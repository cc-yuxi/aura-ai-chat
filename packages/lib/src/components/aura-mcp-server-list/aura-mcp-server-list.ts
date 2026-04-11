import { LitElement, html, nothing, unsafeCSS, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@material/web/icon/icon.js";
import "../aura-json-view/aura-json-view.js";
import styles from "./aura-mcp-server-list.css?inline";
import type { AuraTool, McpServerConfig } from "../../types/index.js";

type McpServerStatus = "connecting" | "connected" | "reconnecting" | "error";
type McpServerInfo = { name: string; version: string; description?: string; instructions?: string };

@customElement("aura-mcp-server-list")
export class AuraMcpServerListElement extends LitElement {
  static override styles = [unsafeCSS(styles)];

  @property({ type: Boolean }) webMcpEnabled = false;
  @property({ type: Boolean }) webMcpReadonly = false;
  @property({ type: Array }) servers: McpServerConfig[] = [];
  @property({ attribute: false }) toolsByServer = new Map<string, AuraTool[]>();
  @property({ attribute: false }) loadingServerIds = new Set<string>();
  @property({ attribute: false }) statusByServer = new Map<string, McpServerStatus>();
  @property({ attribute: false }) infoByServer = new Map<string, McpServerInfo>();

  private readonly handleTooltipOver = this.onTooltipOver.bind(this);
  private readonly handleTooltipOut = this.onTooltipOut.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    this.renderRoot.addEventListener("mouseover", this.handleTooltipOver);
    this.renderRoot.addEventListener("focusin", this.handleTooltipOver);
    this.renderRoot.addEventListener("mouseout", this.handleTooltipOut);
    this.renderRoot.addEventListener("focusout", this.handleTooltipOut);
  }

  override disconnectedCallback(): void {
    this.renderRoot.removeEventListener("mouseover", this.handleTooltipOver);
    this.renderRoot.removeEventListener("focusin", this.handleTooltipOver);
    this.renderRoot.removeEventListener("mouseout", this.handleTooltipOut);
    this.renderRoot.removeEventListener("focusout", this.handleTooltipOut);
    super.disconnectedCallback();
  }

  private onTooltipOver(event: Event): void {
    const target = event.target as HTMLElement | null;
    const trigger = target?.closest(".mcp-server-list__info") as HTMLElement | null;
    if (!trigger) return;

    const tooltip = trigger.querySelector(".mcp-server-list__tooltip") as HTMLElement | null;
    if (!tooltip) return;

    tooltip.style.display = "block";
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const gap = 10;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = triggerRect.right - tooltipRect.width;
    left = Math.max(gap, Math.min(left, viewportWidth - tooltipRect.width - gap));

    let top = triggerRect.top - tooltipRect.height - gap;
    if (top < gap) {
      top = Math.min(triggerRect.bottom + gap, viewportHeight - tooltipRect.height - gap);
    }

    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }

  private onTooltipOut(event: Event): void {
    const target = event.target as HTMLElement | null;
    const trigger = target?.closest(".mcp-server-list__info") as HTMLElement | null;
    if (!trigger) return;

    const relatedTarget = event instanceof FocusEvent || event instanceof MouseEvent
      ? event.relatedTarget as Node | null
      : null;
    if (relatedTarget && trigger.contains(relatedTarget)) {
      return;
    }

    const tooltip = trigger.querySelector(".mcp-server-list__tooltip") as HTMLElement | null;
    if (tooltip) {
      tooltip.style.display = "none";
    }
  }

  private emitWebMcpToggle(): void {
    this.dispatchEvent(new CustomEvent("webmcp-toggle", {
      bubbles: true,
      composed: true,
      detail: { enabled: !this.webMcpEnabled },
    }));
  }

  private emitServerToggle(server: McpServerConfig): void {
    this.dispatchEvent(new CustomEvent("server-toggle", {
      bubbles: true,
      composed: true,
      detail: { serverId: server.id, enabled: !server.enabled },
    }));
  }

  private emitToolToggle(server: McpServerConfig, toolName: string, enabled: boolean): void {
    this.dispatchEvent(new CustomEvent("server-tool-toggle", {
      bubbles: true,
      composed: true,
      detail: { serverId: server.id, toolName, enabled },
    }));
  }

  private renderInfoButton(content: unknown): TemplateResult {
    return html`
      <span class="mcp-server-list__info" tabindex="0" aria-label="Show details">
        <md-icon>info</md-icon>
        <span class="mcp-server-list__tooltip" role="tooltip">${content}</span>
      </span>
    `;
  }

  private getStatusMeta(status?: McpServerStatus): { label: string; className: string; icon: string } {
    switch (status) {
      case "connected":
        return { label: "Connected", className: "mcp-server-list__badge--connected", icon: "check_circle" };
      case "error":
        return { label: "Error", className: "mcp-server-list__badge--error", icon: "error" };
      case "connecting":
        return { label: "Connecting", className: "mcp-server-list__badge--busy mcp-server-list__status-blink", icon: "sync" };
      case "reconnecting":
        return { label: "Reconnecting", className: "mcp-server-list__badge--busy mcp-server-list__status-blink", icon: "sync" };
      default:
        return { label: "Unknown", className: "", icon: "help" };
    }
  }

  private renderServerTooltip(server: McpServerConfig): TemplateResult {
    const status = this.statusByServer.get(server.id) ?? "error";
    const info = this.infoByServer.get(server.id);

    return html`
      <span class="mcp-server-list__tooltip-heading">${server.id}</span>
      <div><strong>URL:</strong> ${server.url}</div>
      <div><strong>Status:</strong> ${status}</div>
      ${info
        ? html`
            <div><strong>Server:</strong> ${info.name} (${info.version})</div>
            ${info.description ? html`<div><strong>Description:</strong> ${info.description}</div>` : nothing}
            ${info.instructions
              ? html`
                  <span class="mcp-server-list__tooltip-label">Instructions</span>
                  <div>${info.instructions}</div>
                `
              : nothing}
          `
        : nothing}
    `;
  }

  private renderToolTooltip(tool: AuraTool): TemplateResult {
    return html`
      <span class="mcp-server-list__tooltip-heading">${tool.name}</span>
      <div>${tool.description}</div>
      <span class="mcp-server-list__tooltip-label">Input Schema</span>
      <div class="mcp-server-list__tooltip-code">
        <aura-json-view .data=${tool.inputSchema}></aura-json-view>
      </div>
    `;
  }

  private renderServerCard(server: McpServerConfig): TemplateResult {
    const tools = this.toolsByServer.get(server.id) ?? [];
    const disabledSet = new Set(server.disabledTools ?? []);
    const loading = this.loadingServerIds.has(server.id);
    const statusMeta = this.getStatusMeta(this.statusByServer.get(server.id));
    const activeTools = tools.filter((tool) => !disabledSet.has(tool.name.split(":").pop() || "")).length;

    return html`
      <div class="mcp-server-list__card">
        <div class="mcp-server-list__card-top">
          <input
            class="mcp-server-list__checkbox"
            type="checkbox"
            .checked=${server.enabled}
            @change=${() => this.emitServerToggle(server)}
          />
          <div class="mcp-server-list__meta">
            <div class="mcp-server-list__title-row">
              <md-icon>dns</md-icon>
              <span class="mcp-server-list__name">${server.id}</span>
              ${this.renderInfoButton(this.renderServerTooltip(server))}
            </div>
            <div class="mcp-server-list__subtitle">${server.url}</div>
          </div>
          <div class="mcp-server-list__badges">
            <span class="mcp-server-list__badge ${statusMeta.className}">
              <md-icon>${statusMeta.icon}</md-icon>
              ${statusMeta.label}
            </span>
            <span class="mcp-server-list__badge">${activeTools}/${tools.length} active</span>
          </div>
        </div>

        <div class="mcp-server-list__tools">
          ${loading
            ? html`<p class="mcp-server-list__hint">Loading tools...</p>`
            : tools.length === 0
              ? html`<p class="mcp-server-list__hint">No tools discovered</p>`
              : tools.map((tool) => {
                  const shortName = tool.name.split(":").pop() || "";
                  const enabled = !disabledSet.has(shortName);
                  return html`
                    <div class="mcp-server-list__tool">
                      <input
                        class="mcp-server-list__checkbox"
                        type="checkbox"
                        .checked=${enabled}
                        @change=${() => this.emitToolToggle(server, shortName, !enabled)}
                      />
                      <div class="mcp-server-list__tool-meta">
                        <div class="mcp-server-list__tool-name-row">
                          <span class="mcp-server-list__tool-name">${shortName}</span>
                          ${this.renderInfoButton(this.renderToolTooltip(tool))}
                        </div>
                      </div>
                    </div>
                  `;
                })}
        </div>
      </div>
    `;
  }

  override render(): TemplateResult {
    return html`
      <div class="mcp-server-list">
        <label class="mcp-server-list__toggle">
          <input
            class="mcp-server-list__checkbox"
            type="checkbox"
            .checked=${this.webMcpEnabled}
            ?disabled=${this.webMcpReadonly}
            @change=${this.emitWebMcpToggle}
          />
          <span>Enable WebMCP Client Integration</span>
        </label>

        <section class="mcp-server-list__section">
          <div class="mcp-server-list__section-header">
            <md-icon>hub</md-icon>
            <span>MCP Servers</span>
            <span class="mcp-server-list__count">${this.servers.length}</span>
          </div>
          ${this.servers.length > 0
            ? this.servers.map((server) => this.renderServerCard(server))
            : html`<p class="mcp-server-list__hint">No MCP servers configured.</p>`}
        </section>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "aura-mcp-server-list": AuraMcpServerListElement;
  }
}
