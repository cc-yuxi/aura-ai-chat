import { LitElement, html, unsafeCSS, nothing, type TemplateResult } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  AuraConfig,
  SettingsFieldId,
  AuraTool,
  ProviderConfig,
  McpServerConfig,
  Skill,
} from "../../types/index.js";
import { needsConfirmation } from "../../types/index.js";
import styles from "./aura-settings.css?inline";
import type { AuraTheme } from "../../themes/index.js";
import "../aura-json-view/aura-json-view.js";

@customElement("aura-settings")
export class AuraSettings extends LitElement {
  static override styles = [unsafeCSS(styles)];

  @property({ attribute: false }) config?: Partial<AuraConfig>;
  @property({ type: Boolean }) showActions = false;
  @property({ type: String }) applyLabel = "Apply";
  @property({ type: String }) cancelLabel = "Cancel";

  @state() private openSections = new Set<string>();
  @state() private enabledToolList = new Set<string>();
  @state() private _selectedTheme: string | null = null;
  @state() private _themeDropdownOpen = false;

  @state() private activeAgenticTab: 'general' | 'skills' | 'mcp' = 'general';

  @state() private mcpServers: McpServerConfig[] = [];
  @state() private mcpServerFetchedTools = new Map<string, AuraTool[]>();
  @state() private mcpServerLoadingTools = new Set<string>();
  @state() private mcpServerStatus = new Map<string, 'connecting' | 'connected' | 'reconnecting' | 'error'>();
  @state() private mcpServerInfo = new Map<string, { name: string; version: string; instructions?: string }>();
  private _mcpReconnectTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private _mcpInitialized = false;

  private static readonly THEME_OPTIONS: { id: string; label: string }[] = [
    { id: "light", label: "Light" },
    { id: "dark", label: "Dark" },
    { id: "professional-light", label: "Professional Light" },
    { id: "auto", label: "Auto (OS)" },
  ];

  private _toolsInitialized = false;

  private static readonly SECTION_FIELDS: Record<string, SettingsFieldId[]> = {
    identity: ["appId", "teamId", "tenantId", "userId", "aiName"],
    appearance: [
      "theme",
      "headerTitle",
      "headerIcon",
      "welcomeTitle",
      "welcomeMessage",
      "inputPlaceholder",
      "enableAttachments",
      "maxAttachmentSize",
      "loadingMessage",
      "errorMessage",
      "retryLabel",
    ],
    providers: ["copilotRemember"],
    agenticIntelligence: [
      "systemPrompt",
      "safetyInstructions",
      "maxContextTokens",
      "enableStreaming",
      "maxIterations",
      "showThinkingProcess",
      "toolTimeout",
      "enableWebMcp",
    ],
  };

  private isFieldReadonly(fieldId: SettingsFieldId): boolean {
    if (!this.config?.settingsModalConfig?.readonly) return false;
    return !this.config.settingsModalConfig.editableFields?.includes(fieldId);
  }

  private isSectionReadonly(section: string): boolean {
    if (!this.config?.settingsModalConfig?.readonly) return false;
    const fields = AuraSettings.SECTION_FIELDS[section];
    return fields?.every((f) => this.isFieldReadonly(f)) ?? false;
  }

  get isAllReadonly(): boolean {
    if (!this.config?.settingsModalConfig?.readonly) return false;
    return Object.values(AuraSettings.SECTION_FIELDS)
      .flat()
      .every((f) => this.isFieldReadonly(f));
  }

  private get _tools(): AuraTool[] {
    return this.config?.agent?.tools ?? [];
  }

  private get _skills(): Skill[] {
    return this.config?.agent?.skills ?? [];
  }

  private _boundCloseThemeDropdown =
    this._closeThemeDropdownOnOutsideClick.bind(this);

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("click", this._boundCloseThemeDropdown);
  }

  override disconnectedCallback(): void {
    super.disconnectedCallback();
    document.removeEventListener("click", this._boundCloseThemeDropdown);
  }

  private _closeThemeDropdownOnOutsideClick(e: MouseEvent): void {
    if (!this._themeDropdownOpen) return;
    const path = e.composedPath();
    const group = this.shadowRoot?.querySelector(".theme-selector-group");
    if (group && !path.includes(group)) {
      this._themeDropdownOpen = false;
    }
  }

  private builtInProviderCfg(
    providerId: string,
  ): Record<string, unknown> | undefined {
    const pc = this.config?.agent?.providers?.find(
      (p) => p.type === "built-in" && p.id === providerId,
    );
    return pc?.config as Record<string, unknown> | undefined;
  }

  private get _appId(): string {
    return this.config?.identity?.appMetadata?.appId ?? "demo-app";
  }
  private get _teamId(): string {
    return this.config?.identity?.appMetadata?.teamId ?? "demo-team";
  }
  private get _tenantId(): string {
    return this.config?.identity?.appMetadata?.tenantId ?? "";
  }
  private get _userId(): string {
    return this.config?.identity?.appMetadata?.userId ?? "";
  }
  private get _aiName(): string {
    return this.config?.identity?.aiName ?? "";
  }
  private get _theme(): string {
    return this._selectedTheme ?? this.config?.appearance?.theme ?? "light";
  }
  private get _headerTitle(): string {
    return this.config?.appearance?.headerTitle ?? "AI Assistant";
  }
  private get _headerIcon(): string {
    return this.config?.appearance?.headerIcon ?? "";
  }
  private get _welcomeTitle(): string {
    return this.config?.appearance?.welcomeMessageTitle ?? "How can I help?";
  }
  private get _welcomeMessage(): string {
    const wm = this.config?.appearance?.welcomeMessage;
    return typeof wm === "string" ? wm : "";
  }
  private get _inputPlaceholder(): string {
    return this.config?.appearance?.inputPlaceholder ?? "Type a message...";
  }
  private get _enableStreaming(): boolean {
    return this.config?.agent?.enableStreaming ?? true;
  }
  private get _enableAttachments(): boolean {
    return this.config?.appearance?.enableAttachments ?? false;
  }
  private get _maxAttachmentSize(): number {
    return this.config?.appearance?.maxAttachmentSize ?? 10_485_760;
  }
  private get _copilotRemember(): boolean {
    return (
      (this.builtInProviderCfg("gitHubCopilot")?.rememberToken as boolean) ??
      true
    );
  }
  private get _systemPrompt(): string {
    return this.config?.agent?.appSystemPrompt ?? "";
  }
  private get _safetyInstructions(): string {
    return this.config?.agent?.additionalSafetyInstructions ?? "";
  }
  private get _maxContextTokens(): number {
    return this.config?.agent?.maxContextTokens ?? 4096;
  }
  private get _loadingMessage(): string {
    return this.config?.appearance?.loadingMessage ?? "";
  }
  private get _errorMessage(): string {
    return this.config?.appearance?.errorMessage ?? "";
  }
  private get _retryLabel(): string {
    return this.config?.appearance?.retryLabel ?? "";
  }
  private get _maxIterations(): number {
    return this.config?.agent?.maxIterations ?? 10;
  }
  private get _showThinkingProcess(): boolean {
    return this.config?.agent?.showThinkingProcess ?? true;
  }
  private get _toolTimeout(): number {
    return this.config?.agent?.toolTimeout ?? 30_000;
  }
  private get _enableWebMcp(): boolean {
    return this.config?.agent?.enableWebMcp ?? false;
  }

  private val(id: string): string {
    const el = this.shadowRoot?.getElementById(id) as HTMLInputElement;
    return el?.value ?? "";
  }

  private chk(id: string): boolean {
    const el = this.shadowRoot?.getElementById(id) as HTMLInputElement;
    return el?.checked ?? false;
  }

  getValues(): Partial<AuraConfig> {
    const enableAttachments = this.chk("cfg-enableAttachments");
    return {
      identity: {
        appMetadata: {
          appId: this.val("cfg-appId"),
          teamId: this.val("cfg-teamId"),
          tenantId: this.val("cfg-tenantId") || undefined,
          userId: this.val("cfg-userId") || undefined,
        },
        aiName: this.val("cfg-aiName") || undefined,
      },
      appearance: {
        theme: (this._selectedTheme ?? this._theme) as AuraTheme,
        headerTitle: this.val("cfg-headerTitle") || undefined,
        headerIcon: this.val("cfg-headerIcon") || undefined,
        welcomeMessageTitle: this.val("cfg-welcomeTitle"),
        welcomeMessage: this.val("cfg-welcomeMessage"),
        inputPlaceholder: this.val("cfg-inputPlaceholder"),
        enableAttachments,
        maxAttachmentSize: enableAttachments
          ? parseInt(this.val("cfg-maxAttachmentSize"), 10) || 10_485_760
          : undefined,
        loadingMessage: this.val("cfg-loadingMessage") || undefined,
        errorMessage: this.val("cfg-errorMessage") || undefined,
        retryLabel: this.val("cfg-retryLabel") || undefined,
      },
      agent: {
        enableStreaming: this.chk("cfg-enableStreaming"),
        appSystemPrompt: this.val("cfg-systemPrompt"),
        additionalSafetyInstructions:
          this.val("cfg-safetyInstructions") || undefined,
        maxContextTokens:
          parseInt(this.val("cfg-maxContextTokens"), 10) || undefined,
        tools: this.getEnabledTools(),
        skills: this.getEnabledSkills(),
        maxIterations: parseInt(this.val("cfg-maxIterations"), 10) || undefined,
        showThinkingProcess: this.chk("cfg-showThinkingProcess"),
        toolTimeout: parseInt(this.val("cfg-toolTimeout"), 10) || undefined,
        enableWebMcp: this.chk("cfg-enableWebMcp"),
        mcpServers: this.mcpServers,
        providers: [
          {
            type: "built-in",
            id: "gitHubCopilot",
            config: {
              rememberToken: this.chk("cfg-copilotRemember"),
            },
          },
        ] satisfies ProviderConfig[],
      },
    };
  }

  private getEnabledTools(): AuraTool[] {
    return this._tools.filter((t) => this.enabledToolList.has(t.name));
  }

  private getEnabledSkills(): Skill[] {
    return this._skills
      .map((s) => ({
        ...s,
        tools: s.tools.filter((id) => this.enabledToolList.has(id)),
      }))
      .filter((s) => s.tools.length > 0);
  }

  override willUpdate(changed: Map<string, unknown>): void {
    if (
      changed.has("config") &&
      !this._toolsInitialized &&
      this._tools.length > 0
    ) {
      this.enabledToolList = new Set(this._tools.map((t) => t.name));
      this._toolsInitialized = true;
    }
    if (changed.has("config") && this.config) {
      if (!this._mcpInitialized) {
        this.mcpServers = JSON.parse(JSON.stringify(this.config.agent?.mcpServers || []));
        this._mcpInitialized = true;
        for (const srv of this.mcpServers) {
          if (srv.enabled) this.fetchMcpTools(srv);
        }
      }
    }
  }

  override firstUpdated(): void {
    const root = this.renderRoot as ShadowRoot;
    root.addEventListener("mouseover", (e) => {
      const target = (e as MouseEvent).target as HTMLElement;
      const parent = target.closest(
        ".info-icon, .tool-badge",
      ) as HTMLElement | null;
      if (!parent) return;
      const tip = parent.querySelector(".info-tooltip") as HTMLElement | null;
      if (!tip) return;
      const rect = parent.getBoundingClientRect();
      tip.style.display = "block";
      const tipW = tip.offsetWidth;
      const tipH = tip.offsetHeight;
      tip.style.left = `${rect.left + rect.width / 2 - tipW / 2}px`;
      tip.style.top = `${rect.top - tipH - 6}px`;
    });

    root.addEventListener("mouseout", (e) => {
      const target = (e as MouseEvent).target as HTMLElement;
      const parent = target.closest(
        ".info-icon, .tool-badge",
      ) as HTMLElement | null;
      if (!parent) return;
      const related = (e as MouseEvent).relatedTarget as HTMLElement | null;
      if (related && parent.contains(related)) return;
      const tip = parent.querySelector(".info-tooltip") as HTMLElement | null;
      if (tip) tip.style.display = "none";
    });
  }

  private toggleTool(toolId: string): void {
    const next = new Set(this.enabledToolList);
    if (next.has(toolId)) {
      next.delete(toolId);
    } else {
      next.add(toolId);
    }
    this.enabledToolList = next;
  }

  private toggleSkill(skill: Skill): void {
    const allEnabled = skill.tools.every((id) => this.enabledToolList.has(id));
    const next = new Set(this.enabledToolList);
    for (const id of skill.tools) {
      if (allEnabled) {
        next.delete(id);
      } else {
        next.add(id);
      }
    }
    this.enabledToolList = next;
  }

  private isToolLockedBySkill(toolId: string): boolean {
    return this._skills.some(
      (s) =>
        s.tools.includes(toolId) &&
        s.tools.every((id) => this.enabledToolList.has(id)),
    );
  }

  private getSkillsUsingTool(toolId: string): string[] {
    return this._skills
      .filter((s) => s.tools.includes(toolId))
      .map((s) => s.name);
  }

  private renderToolItem(
    tool: AuraTool,
    lockedBySkill = false,
  ): TemplateResult {
    const enabled = this.enabledToolList.has(tool.name);
    const disabled = lockedBySkill;
    const skillNames = this.getSkillsUsingTool(tool.name);
    const skillNote =
      skillNames.length > 0
        ? html`<br /><em>Used by skill: ${skillNames.join(", ")}</em>`
        : nothing;

    return html`
      <div class="tool-item">
        <input
          type="checkbox"
          .checked=${enabled}
          ?disabled=${disabled}
          @change=${() => this.toggleTool(tool.name)}
        />
        <span class="name-with-info">
          <span class="tool-item__name">${tool.name}</span>
          <span class="info-icon"
            >i<span class="info-tooltip"
              >${tool.description}${skillNote}</span
            ></span
          >
        </span>
        <span class="tool-item__badges">
          ${needsConfirmation(tool)
        ? html` <span class="tool-badge tool-badge--confirm"
                >ask confirm<span class="info-tooltip"
                  >Requires user confirmation before executing</span
                ></span
              >`
        : nothing}
        </span>
      </div>
    `;
  }

  private renderSkillsTools(): TemplateResult {
    if (this._tools.length === 0 && this._skills.length === 0) {
      return html`<p class="tools-empty">No tools or skills registered.</p>`;
    }

    return html`
      <!-- Skills -->
      ${this._skills.length > 0
        ? html`
            <div class="field">
              <label>Skills</label>
            </div>
            ${this._skills.map((skill) => {
          const skillTools = skill.tools
            .map((id) => this._tools.find((t) => t.name === id))
            .filter(Boolean) as AuraTool[];
          const allEnabled = skill.tools.every((id) =>
            this.enabledToolList.has(id),
          );
          return html`
                <div class="skill-group">
                  <div class="skill-group__header">
                    <input
                      type="checkbox"
                      .checked=${allEnabled}
                      @change=${() => this.toggleSkill(skill)}
                    />
                    <span class="name-with-info">
                      <span class="skill-group__name">${skill.name}</span>
                      <span class="info-icon"
                        >i<span class="info-tooltip"
                          >${skill.description}</span
                        ></span
                      >
                    </span>
                  </div>
                  <div class="skill-group__tools">
                    ${skillTools.map(
            (t) => html`
                        <div class="skill-group__tool-name">
                          <span class="name-with-info">
                            <span>${t.name}</span>
                            <span class="info-icon"
                              >i<span class="info-tooltip"
                                >${t.description}</span
                              ></span
                            >
                          </span>
                          <span class="tool-item__badges">
                            ${needsConfirmation(t)
                ? html`<span
                                  class="tool-badge tool-badge--confirm"
                                  >ask confirm<span class="info-tooltip"
                                    >Requires user confirmation before
                                    executing</span
                                  ></span
                                >`
                : nothing}
                          </span>
                        </div>
                      `,
          )}
                  </div>
                </div>
              `;
        })}
          `
        : nothing}
      <!-- Tools -->
      ${this._tools.length > 0
        ? html`
            <div class="field">
              <label
                >Tools
                <span class="hint" style="display:inline; margin-left: 6px"
                  >(${this.enabledToolList.size}/${this._tools.length}
                  active)</span
                ></label
              >
            </div>
            <div class="skill-group">
              <div class="skill-group__tools">
                ${this._tools.map((t) =>
          this.renderToolItem(t, this.isToolLockedBySkill(t.name)),
        )}
              </div>
            </div>
          `
        : nothing}
    `;
  }

  private handleApply(): void {
    this.dispatchEvent(
      new CustomEvent("settings-apply", {
        bubbles: true,
        composed: true,
        detail: this.getValues(),
      }),
    );
  }

  private handleCancel(): void {
    this.dispatchEvent(
      new CustomEvent("settings-cancel", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleAttachmentToggle(): void {
    const checked = this.chk("cfg-enableAttachments");
    const row = this.shadowRoot?.getElementById("cfg-attachmentOptions");
    if (row) row.style.display = checked ? "flex" : "none";
  }

  private _toggleThemeDropdown(): void {
    this._themeDropdownOpen = !this._themeDropdownOpen;
  }

  private _selectTheme(themeId: string): void {
    this._selectedTheme = themeId;
    this._themeDropdownOpen = false;
  }

  expandAll(): void {
    this.shadowRoot
      ?.querySelectorAll<HTMLDetailsElement>("details.section")
      .forEach((d) => (d.open = true));
    this.openSections = new Set(Object.keys(AuraSettings.SECTION_FIELDS));
  }

  collapseAll(): void {
    this.shadowRoot
      ?.querySelectorAll<HTMLDetailsElement>("details.section")
      .forEach((d) => (d.open = false));
    this.openSections = new Set();
  }

  private async fetchMcpTools(srv: McpServerConfig, isRetry = false) {
    if (this._mcpReconnectTimers.has(srv.id)) {
      clearTimeout(this._mcpReconnectTimers.get(srv.id)!);
      this._mcpReconnectTimers.delete(srv.id);
    }
    
    if (this.mcpServerLoadingTools.has(srv.id) && !isRetry) return;
    
    if (!isRetry) {
      this.mcpServerLoadingTools = new Set(this.mcpServerLoadingTools).add(srv.id);
    }

    const setStatus = (status: 'connecting' | 'connected' | 'reconnecting' | 'error') => {
      const nextStatus = new Map(this.mcpServerStatus);
      nextStatus.set(srv.id, status);
      this.mcpServerStatus = nextStatus;
    };

    setStatus(isRetry ? 'reconnecting' : 'connecting');

    try {
      const { SseMcpClient } = await import("../../services/mcp-sse-client.js");
      const client = new SseMcpClient(srv.url, srv.id);
      await client.connect();
      const tools = await client.getTools();
      const info = client.getServerInfo();
      client.disconnect();
      
      const updated = new Map(this.mcpServerFetchedTools);
      updated.set(srv.id, tools);
      this.mcpServerFetchedTools = updated;

      if (info) {
        const nextInfo = new Map(this.mcpServerInfo);
        nextInfo.set(srv.id, info);
        this.mcpServerInfo = nextInfo;
      }
      
      setStatus('connected');
    } catch(err) {
      setStatus('error');
      
      const timer = setTimeout(() => {
         const latestSrv = this.mcpServers.find(s => s.id === srv.id);
         if (latestSrv?.enabled) {
            this.fetchMcpTools(latestSrv, true);
         }
      }, 10000);
      this._mcpReconnectTimers.set(srv.id, timer);
    } finally {
      if (!isRetry) {
         const nextLoading = new Set(this.mcpServerLoadingTools);
         nextLoading.delete(srv.id);
         this.mcpServerLoadingTools = nextLoading;
      }
    }
  }

  private toggleMcpServer(id: string) {
    this.mcpServers = this.mcpServers.map(s => {
      if (s.id === id) {
        const next = { ...s, enabled: !s.enabled };
        if (next.enabled) {
          this.fetchMcpTools(next);
        } else {
          if (this._mcpReconnectTimers.has(id)) {
            clearTimeout(this._mcpReconnectTimers.get(id)!);
            this._mcpReconnectTimers.delete(id);
          }
          const nextStatus = new Map(this.mcpServerStatus);
          nextStatus.delete(id);
          this.mcpServerStatus = nextStatus;
        }
        return next;
      }
      return s;
    });
  }

  private toggleMcpTool(serverId: string, toolName: string) {
    this.mcpServers = this.mcpServers.map(s => {
      if (s.id === serverId) {
        const disabled = new Set(s.disabledTools || []);
        if (disabled.has(toolName)) disabled.delete(toolName);
        else disabled.add(toolName);
        return { ...s, disabledTools: Array.from(disabled) };
      }
      return s;
    });
  }

  private renderMcpServers(): TemplateResult {
    return html`
      <div class="toggle" style="margin-bottom: 16px;">
        <input
          type="checkbox"
          id="cfg-enableWebMcp"
          .checked=${this._enableWebMcp}
          ?disabled=${this.ro("enableWebMcp")}
        />
        <label for="cfg-enableWebMcp">Enable WebMCP Client Integration</label>
      </div>

      <div class="field">
        <label>MCP Servers (SSE Transport)</label>
        ${this.mcpServers.map(srv => {
          const loading = this.mcpServerLoadingTools.has(srv.id);
          const tools = this.mcpServerFetchedTools.get(srv.id) || [];
          const disabledSet = new Set(srv.disabledTools || []);
          return html`
            <div class="skill-group" style="margin-bottom:12px;">
              <div class="skill-group__header" style="display:flex; align-items:center; gap: 8px;">
                <input type="checkbox" .checked=${srv.enabled} @change=${() => this.toggleMcpServer(srv.id)} style="margin: 0;"/>
                <input type="text" .value=${srv.id} style="flex:0.3; min-width: 80px;" disabled />
                <input type="text" .value=${srv.url} style="flex:0.7" disabled />
                <span class="info-icon" style="margin-left: 4px;">
                  i<span class="info-tooltip">
                    ${(() => {
                      const info = this.mcpServerInfo.get(srv.id);
                      return html`
                        <strong>ID:</strong> ${srv.id}<br/>
                        <strong>URL:</strong> ${srv.url}<br/>
                        <strong>Status:</strong> ${this.mcpServerStatus.get(srv.id) || 'unknown'}<br/>
                        ${info ? html`
                          <hr style="margin: 4px 0; border: 0; border-top: 1px solid rgba(255,255,255,0.2);"/>
                          <strong>Server:</strong> ${info.name} (${info.version})<br/>
                          ${info.description ? html`<strong>Description:</strong> ${info.description}<br/>` : nothing}
                          ${info.instructions ? html`
                            <div style="margin-top: 8px;">
                              <strong>Instructions:</strong>
                              <div style="margin-top: 4px; font-size: 11px; opacity: 0.9; white-space: pre-wrap;">${info.instructions}</div>
                            </div>
                          ` : nothing}
                        ` : nothing}
                      `;
                    })()}
                  </span>
                </span>
                ${srv.enabled ? (() => {
                  const status = this.mcpServerStatus.get(srv.id);
                  let icon = 'help';
                  let title = 'Unknown status';
                  let color = '#9ca3af'; // gray
                  let extraClass = '';
                  
                  if (status === 'connected') {
                    icon = 'check_circle';
                    title = 'Connected & tools loaded';
                    color = '#10b981';
                  } else if (status === 'error') {
                    icon = 'error';
                    title = 'Failed to connect. Retrying...';
                    color = '#ef4444';
                  } else if (status === 'reconnecting' || status === 'connecting') {
                    icon = 'sync';
                    title = status === 'connecting' ? 'Connecting to server...' : 'Reconnecting to server...';
                    color = '#f59e0b';
                    extraClass = 'status-blink';
                  }
                  
                  return html`<md-icon class="mcp-status-icon ${extraClass}" style="font-size: 18px; color: ${color}; cursor: help;" title="${title}">${icon}</md-icon>`;
                })() : nothing}
              </div>
              <div class="skill-group__tools" style="padding: 8px">
                ${loading ? html`<p class="hint">Loading tools...</p>` : tools.length === 0 ? html`<p class="hint">No tools discovered</p>` : tools.map(t => {
                   const shortName = t.name.split(':').pop() || "";
                   return html`
                    <div class="tool-item">
                      <input type="checkbox" .checked=${!disabledSet.has(shortName)} @change=${() => this.toggleMcpTool(srv.id, shortName)} />
                      <span class="name-with-info">
                        <span class="tool-item__name">${shortName}</span>
                        <span class="info-icon">
                          i<span class="info-tooltip">
                            <strong style="font-size: 13px; display: block; margin-bottom: 4px;">${t.name}</strong>
                            <div style="margin-bottom: 12px; opacity: 0.9;">${t.description}</div>
                            <strong>Input Schema:</strong>
                            <div style="margin-top: 6px; background: rgba(0,0,0,0.2); border-radius: 4px; padding: 4px;">
                              <aura-json-view .data=${t.inputSchema}></aura-json-view>
                            </div>
                          </span>
                        </span>
                      </span>
                    </div>
                  `
                })}
              </div>
            </div>
          `;
        })}
      </div>
    `;
  }

  private handleSectionToggle(section: string, e: Event): void {
    const details = e.currentTarget as HTMLDetailsElement;
    const next = new Set(this.openSections);
    if (details.open) {
      next.add(section);
    } else {
      next.delete(section);
    }
    this.openSections = next;
  }

  private lockIcon(section: string): TemplateResult | typeof nothing {
    return this.isSectionReadonly(section)
      ? html`<md-icon class="lock-icon" title="This section is read-only"
          >lock</md-icon
        >`
      : nothing;
  }

  private sectionIcons(section: string): TemplateResult {
    const open = this.openSections.has(section);
    return html`
      <span class="summary__icons"
        >${this.lockIcon(section)}
        <md-icon class="expand-icon"
          >${open ? "keyboard_arrow_up" : "keyboard_arrow_down"}</md-icon
        ></span
      >
    `;
  }

  private ro(fieldId: SettingsFieldId): boolean {
    return this.isFieldReadonly(fieldId);
  }

  override render(): TemplateResult {
    return html`
      <!-- IDENTITY -->
      <details
        class="section"
        @toggle=${(e: Event) => this.handleSectionToggle("identity", e)}
      >
        <summary>Identity ${this.sectionIcons("identity")}</summary>
        <div class="section__body">
          <div class="field">
            <label>App ID</label>
            <input
              type="text"
              id="cfg-appId"
              .value=${this._appId}
              ?disabled=${this.ro("appId")}
            />
          </div>
          <div class="field">
            <label>Team ID</label>
            <input
              type="text"
              id="cfg-teamId"
              .value=${this._teamId}
              ?disabled=${this.ro("teamId")}
            />
          </div>
          <div class="field">
            <label>Tenant ID</label>
            <input
              type="text"
              id="cfg-tenantId"
              .value=${this._tenantId}
              ?disabled=${this.ro("tenantId")}
            />
          </div>
          <div class="field">
            <label>User ID</label>
            <input
              type="text"
              id="cfg-userId"
              .value=${this._userId}
              ?disabled=${this.ro("userId")}
            />
          </div>
          <div class="field">
            <label>AI Name</label>
            <input
              type="text"
              id="cfg-aiName"
              .value=${this._aiName}
              placeholder="AI Assistant"
              ?disabled=${this.ro("aiName")}
            />
            <p class="hint">
              Display name for AI messages. Defaults to "AI Assistant".
            </p>
          </div>
        </div>
      </details>

      <!-- APPEARANCE -->
      <details
        class="section"
        @toggle=${(e: Event) => this.handleSectionToggle("appearance", e)}
      >
        <summary>Appearance ${this.sectionIcons("appearance")}</summary>
        <div class="section__body">
          <div class="field">
            <label>Title</label>
            <input
              type="text"
              id="cfg-headerTitle"
              .value=${this._headerTitle}
              ?disabled=${this.ro("headerTitle")}
            />
          </div>
          <div class="field">
            <label>Icon (Material Symbol)</label>
            <input
              type="text"
              id="cfg-headerIcon"
              .value=${this._headerIcon}
              placeholder="auto (from provider)"
              ?disabled=${this.ro("headerIcon")}
            />
          </div>
          <div class="field">
            <label>Theme</label>
            <span class="theme-selector-group">
              <button
                class="theme-selector-trigger"
                ?disabled=${this.ro("theme")}
                @click=${this._toggleThemeDropdown}
              >
                <span
                  >${AuraSettings.THEME_OPTIONS.find(
      (t) => t.id === this._theme,
    )?.label ?? "Light"}</span
                >
                <md-icon class="chevron"
                  >${this._themeDropdownOpen
        ? "expand_less"
        : "expand_more"}</md-icon
                >
              </button>
              ${this._themeDropdownOpen
        ? html`
                    <div class="theme-selector-menu" role="listbox">
                      ${AuraSettings.THEME_OPTIONS.map(
          (t) => html`
                          <button
                            class="theme-selector-menu__item"
                            role="option"
                            aria-selected=${t.id === this._theme}
                            @click=${() => this._selectTheme(t.id)}
                          >
                            ${t.label}
                          </button>
                        `,
        )}
                    </div>
                  `
        : nothing}
            </span>
          </div>
          <div class="field">
            <label>Welcome title</label>
            <input
              type="text"
              id="cfg-welcomeTitle"
              .value=${this._welcomeTitle}
              ?disabled=${this.ro("welcomeTitle")}
            />
          </div>
          <div class="field">
            <label>Welcome message</label>
            <textarea
              id="cfg-welcomeMessage"
              rows="2"
              .value=${this._welcomeMessage}
              ?disabled=${this.ro("welcomeMessage")}
            ></textarea>
          </div>
          <div class="field">
            <label>Input placeholder</label>
            <input
              type="text"
              id="cfg-inputPlaceholder"
              .value=${this._inputPlaceholder}
              ?disabled=${this.ro("inputPlaceholder")}
            />
          </div>
          <div class="toggle">
            <input
              type="checkbox"
              id="cfg-enableAttachments"
              .checked=${this._enableAttachments}
              @change=${this.handleAttachmentToggle}
              ?disabled=${this.ro("enableAttachments")}
            />
            <label for="cfg-enableAttachments">Enable attachments</label>
          </div>
          <div
            class="row"
            id="cfg-attachmentOptions"
            style="display: ${this._enableAttachments ? "flex" : "none"}"
          >
            <div class="field">
              <label>Max size (bytes)</label>
              <input
                type="number"
                id="cfg-maxAttachmentSize"
                .value=${String(this._maxAttachmentSize)}
                ?disabled=${this.ro("maxAttachmentSize")}
              />
            </div>
          </div>
          <div class="field">
            <label>Loading message</label>
            <input
              type="text"
              id="cfg-loadingMessage"
              .value=${this._loadingMessage}
              placeholder="Thinking..."
              ?disabled=${this.ro("loadingMessage")}
            />
          </div>
          <div class="field">
            <label>Error message</label>
            <input
              type="text"
              id="cfg-errorMessage"
              .value=${this._errorMessage}
              placeholder="Something went wrong."
              ?disabled=${this.ro("errorMessage")}
            />
          </div>
          <div class="field">
            <label>Retry label</label>
            <input
              type="text"
              id="cfg-retryLabel"
              .value=${this._retryLabel}
              placeholder="Retry"
              ?disabled=${this.ro("retryLabel")}
            />
          </div>
        </div>
      </details>

      <!-- PROVIDERS -->
      <details
        class="section"
        @toggle=${(e: Event) => this.handleSectionToggle("providers", e)}
      >
        <summary>Providers ${this.sectionIcons("providers")}</summary>
        <div class="section__body">
          <div class="provider-group">
            <div class="provider-group__label">GitHub Copilot</div>
            <div class="toggle">
              <input
                type="checkbox"
                id="cfg-copilotRemember"
                .checked=${this._copilotRemember}
                ?disabled=${this.ro("copilotRemember")}
              />
              <label for="cfg-copilotRemember">Remember token</label>
            </div>
          </div>
        </div>
      </details>

      <!-- AGENTIC INTELLIGENCE -->
      <details
        class="section"
        @toggle=${(e: Event) =>
        this.handleSectionToggle("agenticIntelligence", e)}
      >
        <summary>
          Agentic Intelligence ${this.sectionIcons("agenticIntelligence")}
        </summary>
        <div class="section__body">
          <div class="tabs">
            <button class="tab-btn ${this.activeAgenticTab === 'general' ? 'active' : ''}" @click=${() => this.activeAgenticTab = 'general'}>General</button>
            <button class="tab-btn ${this.activeAgenticTab === 'skills' ? 'active' : ''}" @click=${() => this.activeAgenticTab = 'skills'}>Skills & Tools</button>
            <button class="tab-btn ${this.activeAgenticTab === 'mcp' ? 'active' : ''}" @click=${() => this.activeAgenticTab = 'mcp'}>MCP Servers</button>
          </div>

          ${this.activeAgenticTab === "general" ? html`
            <div class="field">
              <label>System prompt</label>
              <textarea
                id="cfg-systemPrompt"
                rows="3"
                .value=${this._systemPrompt}
                ?disabled=${this.ro("systemPrompt")}
              ></textarea>
            </div>
            <div class="field">
              <label>Safety instructions</label>
              <textarea
                id="cfg-safetyInstructions"
                rows="2"
                .value=${this._safetyInstructions}
                ?disabled=${this.ro("safetyInstructions")}
              ></textarea>
            </div>
            <div class="field">
              <label>Max context tokens</label>
              <input
                type="number"
                id="cfg-maxContextTokens"
                .value=${String(this._maxContextTokens)}
                min="256"
                step="256"
                ?disabled=${this.ro("maxContextTokens")}
              />
            </div>
            <div class="toggle">
              <input
                type="checkbox"
                id="cfg-enableStreaming"
                .checked=${this._enableStreaming}
                ?disabled=${this.ro("enableStreaming")}
              />
              <label for="cfg-enableStreaming">Enable streaming</label>
            </div>
            <div class="field">
              <label>Max iterations</label>
              <input
                type="number"
                id="cfg-maxIterations"
                .value=${String(this._maxIterations)}
                min="1"
                max="50"
                ?disabled=${this.ro("maxIterations")}
              />
            </div>
            <div class="toggle">
              <input
                type="checkbox"
                id="cfg-showThinkingProcess"
                .checked=${this._showThinkingProcess}
                ?disabled=${this.ro("showThinkingProcess")}
              />
              <label for="cfg-showThinkingProcess">Show thinking process</label>
            </div>
            <div class="field">
              <label>Tool timeout (ms)</label>
              <input
                type="number"
                id="cfg-toolTimeout"
                .value=${String(this._toolTimeout)}
                min="0"
                step="1000"
                ?disabled=${this.ro("toolTimeout")}
              />
            </div>
          ` : nothing}

          ${this.activeAgenticTab === "mcp" ? html`
            ${this.renderMcpServers()}
          ` : nothing}

          ${this.activeAgenticTab === "skills" ? html`
            ${this.renderSkillsTools()}
          ` : nothing}
        </div>
      </details>

      ${this.showActions
        ? html`
            <div class="actions">
              <button class="btn btn-secondary" @click=${this.handleCancel}>
                ${this.cancelLabel}
              </button>
              <button class="btn btn-primary" @click=${this.handleApply}>
                ${this.applyLabel}
              </button>
            </div>
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "aura-settings": AuraSettings;
  }
}
