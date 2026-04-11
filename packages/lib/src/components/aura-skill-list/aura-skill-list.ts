import { LitElement, html, nothing, unsafeCSS, type TemplateResult } from "lit";
import { customElement, property } from "lit/decorators.js";
import "@material/web/icon/icon.js";
import styles from "./aura-skill-list.css?inline";
import type { AuraTool, Skill } from "../../types/index.js";
import { needsConfirmation } from "../../types/index.js";

export interface AuraSkillListConfig {
  variant?: "popup" | "panel";
  selectionMode?: "none" | "skills-and-tools";
  emptyMessage?: string;
  showSectionCounts?: boolean;
  showToolSummary?: boolean;
  showSkillDescriptions?: boolean;
  showToolDescriptions?: boolean;
  showSkillToolChips?: boolean;
  showConfirmationBadges?: boolean;
  lockToolsWhenSkillEnabled?: boolean;
}

const DEFAULT_CONFIG: Required<AuraSkillListConfig> = {
  variant: "popup",
  selectionMode: "none",
  emptyMessage: "No tools or skills registered.",
  showSectionCounts: true,
  showToolSummary: false,
  showSkillDescriptions: true,
  showToolDescriptions: true,
  showSkillToolChips: true,
  showConfirmationBadges: true,
  lockToolsWhenSkillEnabled: false,
};

@customElement("aura-skill-list")
export class AuraSkillListElement extends LitElement {
  static override styles = [unsafeCSS(styles)];

  @property({ type: Array }) skills: Skill[] = [];
  @property({ type: Array }) tools: AuraTool[] = [];
  @property({ type: Array, attribute: "enabled-tools" }) enabledTools: string[] = [];
  @property({ type: Object }) config: AuraSkillListConfig = DEFAULT_CONFIG;

  private readonly handleTooltipOver = this.onTooltipOver.bind(this);
  private readonly handleTooltipOut = this.onTooltipOut.bind(this);

  private get mergedConfig(): Required<AuraSkillListConfig> {
    return { ...DEFAULT_CONFIG, ...this.config };
  }

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

  private get enabledToolSet(): Set<string> {
    return new Set(this.enabledTools);
  }

  private get selectionEnabled(): boolean {
    return this.mergedConfig.selectionMode === "skills-and-tools";
  }

  private getActiveSkillCount(): number {
    return this.skills.filter((skill) => this.isSkillEnabled(skill)).length;
  }

  private formatSectionCount(total: number, active: number): string {
    if (!this.selectionEnabled) return String(total);
    return `${active}/${total} active`;
  }

  private isSkillEnabled(skill: Skill): boolean {
    if (!this.selectionEnabled) return false;
    return skill.tools.length > 0 && skill.tools.every((id) => this.enabledToolSet.has(id));
  }

  private isToolLocked(toolId: string): boolean {
    if (!this.selectionEnabled || !this.mergedConfig.lockToolsWhenSkillEnabled) {
      return false;
    }

    return this.skills.some(
      (skill) =>
        skill.tools.includes(toolId) &&
        skill.tools.length > 0 &&
        skill.tools.every((id) => this.enabledToolSet.has(id)),
    );
  }

  private emitToolToggle(tool: AuraTool): void {
    const enabled = !this.enabledToolSet.has(tool.name);
    this.dispatchEvent(
      new CustomEvent("tool-toggle", {
        bubbles: true,
        composed: true,
        detail: { tool, enabled },
      }),
    );
  }

  private emitSkillToggle(skill: Skill): void {
    const enabled = !this.isSkillEnabled(skill);
    this.dispatchEvent(
      new CustomEvent("skill-toggle", {
        bubbles: true,
        composed: true,
        detail: { skill, enabled },
      }),
    );
  }

  private renderToolBadges(tool: AuraTool): TemplateResult | typeof nothing {
    const config = this.mergedConfig;
    const badges: TemplateResult[] = [];

    if (config.showConfirmationBadges && needsConfirmation(tool)) {
      badges.push(html`<span class="skill-list__badge skill-list__badge--warning">Ask confirm</span>`);
    }

    badges.push(html`${config.showToolDescriptions ? this.renderInfoButton(tool.description) : nothing}`);

    if (badges.length === 0) return nothing;

    return html`<div class="skill-list__badges">${badges}</div>`;
  }

  private onTooltipOver(event: Event): void {
    const target = event.target as HTMLElement | null;
    const trigger = target?.closest(".skill-list__info") as HTMLElement | null;
    if (!trigger) return;

    const tooltip = trigger.querySelector(".skill-list__tooltip") as HTMLElement | null;
    if (!tooltip) return;

    tooltip.style.display = "block";
    tooltip.style.left = "0px";
    tooltip.style.top = "0px";

    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = tooltip.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const gap = 10;

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
    const trigger = target?.closest(".skill-list__info") as HTMLElement | null;
    if (!trigger) return;

    const relatedTarget = event instanceof FocusEvent || event instanceof MouseEvent
      ? event.relatedTarget as Node | null
      : null;
    if (relatedTarget && trigger.contains(relatedTarget)) {
      return;
    }

    const tooltip = trigger.querySelector(".skill-list__tooltip") as HTMLElement | null;
    if (tooltip) {
      tooltip.style.display = "none";
    }
  }

  private renderInfoButton(description?: string): TemplateResult | typeof nothing {
    if (!description) return nothing;

    return html`
      <span class="skill-list__info" tabindex="0" aria-label="Show details">
        <md-icon>info</md-icon>
        <span class="skill-list__tooltip" role="tooltip">${description}</span>
      </span>
    `;
  }

  private renderSkillCard(skill: Skill): TemplateResult {
    const config = this.mergedConfig;
    const enabled = this.isSkillEnabled(skill);

    return html`
      <div class="skill-list__card ${this.selectionEnabled && !enabled ? "skill-list__card--muted" : ""}">
        <div class="skill-list__card-top">
          ${this.selectionEnabled
            ? html`<input
                class="skill-list__checkbox"
                type="checkbox"
                .checked=${enabled}
                @change=${() => this.emitSkillToggle(skill)}
              />`
            : nothing}
          <div class="skill-list__meta">
            <div class="skill-list__title-row">
              <md-icon>extension</md-icon>
              <span class="skill-list__name">${skill.name}</span>
              ${config.showSkillDescriptions ? this.renderInfoButton(skill.description) : nothing}
            </div>
          </div>
        </div>
        ${config.showSkillToolChips && skill.tools.length > 0
          ? html`
              <div class="skill-list__chips">
                <span class="skill-list__chips-label">Tools</span>
                ${skill.tools.map((toolName) => html`<span class="skill-list__chip">${toolName}</span>`)}
              </div>
            `
          : nothing}
      </div>
    `;
  }

  private renderToolCard(tool: AuraTool): TemplateResult {
    const enabled = this.enabledToolSet.has(tool.name);
    const locked = this.isToolLocked(tool.name);

    return html`
      <div
        class="skill-list__card ${this.selectionEnabled && !enabled ? "skill-list__card--muted" : ""}"
      >
        <div class="skill-list__card-top">
          ${this.selectionEnabled
            ? html`<input
                class="skill-list__checkbox"
                type="checkbox"
                .checked=${enabled}
                ?disabled=${locked}
                @change=${() => this.emitToolToggle(tool)}
              />`
            : nothing}
          <div class="skill-list__meta">
            <div class="skill-list__title-row">
              <md-icon>handyman</md-icon>
              <span class="skill-list__name">${tool.name}</span>
            </div>
          </div>
          ${this.renderToolBadges(tool)}
        </div>
      </div>
    `;
  }

  override render(): TemplateResult {
    const config = this.mergedConfig;

    if (this.skills.length === 0 && this.tools.length === 0) {
      return html`<p class="skill-list__empty">${config.emptyMessage}</p>`;
    }

    return html`
      <div class="skill-list skill-list--${config.variant}">
        ${this.skills.length > 0
          ? html`
              <section class="skill-list__section">
                <div class="skill-list__section-header">
                  <md-icon>psychology</md-icon>
                  <span>Skills</span>
                  ${config.showSectionCounts
                    ? html`
                        <span class="skill-list__count"
                          >${this.formatSectionCount(this.skills.length, this.getActiveSkillCount())}</span
                        >
                      `
                    : nothing}
                </div>
                ${this.skills.map((skill) => this.renderSkillCard(skill))}
              </section>
            `
          : nothing}
        ${this.tools.length > 0
          ? html`
              <section class="skill-list__section">
                <div class="skill-list__section-header">
                  <md-icon>build</md-icon>
                  <span>Tools</span>
                  ${config.showSectionCounts || (config.showToolSummary && this.selectionEnabled)
                    ? html`
                        <span class="skill-list__count">
                          ${this.formatSectionCount(this.tools.length, this.enabledToolSet.size)}
                        </span>
                      `
                    : nothing}
                </div>
                ${this.tools.map((tool) => this.renderToolCard(tool))}
              </section>
            `
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "aura-skill-list": AuraSkillListElement;
  }
}
