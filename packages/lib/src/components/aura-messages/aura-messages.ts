import {
  LitElement,
  html,
  unsafeCSS,
  nothing,
  type PropertyValues,
  type TemplateResult,
} from "lit";
import { customElement, property, state } from "lit/decorators.js";
import type {
  AuraFeedbackConfig,
  ChatMessage,
  FeedbackEvent,
  FeedbackReasonTag,
} from "../../types/index.js";
import type { PendingAction } from "../../types/agent-internals.js";
import { MessageRole } from "../../types/index.js";
import styles from "./aura-messages.css?inline";
import { renderBasicMarkdown, formatTimestamp } from "../../utils/helpers.js";
import "../aura-action-preview/aura-action-preview.js";
import "../aura-agent-iteration/aura-agent-iteration.js";

@customElement("aura-messages")
export class AuraMessagesElement extends LitElement {
  static override styles = [unsafeCSS(styles)];

  @property({ type: Object }) message!: ChatMessage;
  @property({ type: String }) aiIcon = "smart_toy";
  @property({ type: String }) aiName = "AI Assistant";
  @property({ type: Object }) action?: PendingAction;
  @property({ type: Boolean }) actionDisabled = false;
  @property({ type: Boolean }) streaming = false;
  @property({ type: Object }) feedbackConfig?: AuraFeedbackConfig;
  @property({ type: String }) feedbackMode?: "always" | "hover";
  @property({ type: String }) conversationId = "";

  @state() private feedbackOpen = false;
  @state() private selectedReasonIds: string[] = [];
  @state() private feedbackComment = "";
  @state() private copied = false;
  @state() private localFeedbackRating?: FeedbackEvent["rating"];

  override connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener("pointerdown", this.handleDocumentPointerDown);
  }

  override disconnectedCallback(): void {
    document.removeEventListener("pointerdown", this.handleDocumentPointerDown);
    super.disconnectedCallback();
  }

  private readonly handleDocumentPointerDown = (event: PointerEvent): void => {
    if (!this.feedbackOpen) return;

    const clickedFeedbackUi = event.composedPath().some((target) => {
      return (
        target instanceof Element &&
        (target.classList.contains("feedback-controls") ||
          target.classList.contains("feedback-popover"))
      );
    });
    if (clickedFeedbackUi) return;

    this.closeNegativeFeedback();
  };

  private handleRetryClick(): void {
    this.dispatchEvent(
      new CustomEvent("retry", {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private get feedbackEnabled(): boolean {
    return (
      this.message?.role === MessageRole.Assistant &&
      !this.streaming &&
      !!this.feedbackConfig &&
      !!this.feedbackMode
    );
  }

  private get feedbackRating(): FeedbackEvent["rating"] | undefined {
    return this.localFeedbackRating ?? this.readFeedbackRating(this.message);
  }

  protected override updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("message")) {
      this.localFeedbackRating = this.readFeedbackRating(this.message);
      this.feedbackOpen = false;
    }
  }

  private readFeedbackRating(
    message: ChatMessage | undefined,
  ): FeedbackEvent["rating"] | undefined {
    const rating = message?.metadata?.["feedbackRating"];
    return rating === "positive" || rating === "negative" ? rating : undefined;
  }

  private normalizeReasonTag(tag: FeedbackReasonTag): { id: string; label: string } {
    return typeof tag === "string" ? { id: tag, label: tag } : tag;
  }

  private makeFeedback(rating: FeedbackEvent["rating"]): FeedbackEvent {
    return {
      id: `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      conversationId: this.conversationId,
      messageId: this.message.id,
      messageRole: this.message.role,
      rating,
      reasonIds:
        rating === "negative" && this.selectedReasonIds.length > 0
          ? [...this.selectedReasonIds]
          : undefined,
      comment:
        rating === "negative" && this.feedbackComment.trim()
          ? this.feedbackComment.trim()
          : undefined,
      timestamp: Date.now(),
    };
  }

  private submitFeedback(rating: FeedbackEvent["rating"]): void {
    this.localFeedbackRating = rating;
    this.dispatchEvent(
      new CustomEvent<FeedbackEvent>("message-feedback", {
        bubbles: true,
        composed: true,
        detail: this.makeFeedback(rating),
      }),
    );

    if (rating === "negative") {
      this.feedbackOpen = false;
      this.selectedReasonIds = [];
      this.feedbackComment = "";
    }
  }

  private toggleReason(reasonId: string): void {
    this.selectedReasonIds = this.selectedReasonIds.includes(reasonId)
      ? this.selectedReasonIds.filter((id) => id !== reasonId)
      : [...this.selectedReasonIds, reasonId];
  }

  private makeMessageEventDetail(): Record<string, unknown> {
    return {
      conversationId: this.conversationId,
      messageId: this.message.id,
      messageRole: this.message.role,
      message: this.message,
      timestamp: Date.now(),
    };
  }

  private dispatchMessageEvent(name: string): void {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail: this.makeMessageEventDetail(),
      }),
    );
  }

  private openNegativeFeedback(): void {
    this.feedbackOpen = true;
    this.dispatchMessageEvent("message-feedback-opened");
  }

  private closeNegativeFeedback(): void {
    this.feedbackOpen = false;
    if (!this.readFeedbackRating(this.message)) {
      this.localFeedbackRating = undefined;
    }
    this.dispatchMessageEvent("message-feedback-cancelled");
  }

  private async handleCopyClick(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.message.content);
      this.copied = true;
      this.dispatchMessageEvent("message-copied");
      window.setTimeout(() => {
        this.copied = false;
      }, 1200);
    } catch {
      this.dispatchEvent(
        new CustomEvent("copy-message", {
          bubbles: true,
          composed: true,
          detail: { message: this.message },
        }),
      );
    }
  }

  private renderFeedbackControls(): TemplateResult | typeof nothing {
    if (!this.feedbackEnabled) return nothing;

    const reasons = (this.feedbackConfig?.reasonTags ?? []).map((tag) =>
      this.normalizeReasonTag(tag),
    );
    const visibilityClass =
      this.feedbackMode === "hover" ? "feedback-controls--hover" : "";
    const activeRating = this.feedbackOpen ? "negative" : this.feedbackRating;

    return html`
      <div class="feedback-shell">
        <div class="feedback-controls ${visibilityClass}" part="feedback-controls">
          <button
            class="feedback-button feedback-button--up ${activeRating === "positive"
              ? "feedback-button--selected"
              : ""}"
            type="button"
            title="Good response"
            aria-label="Good response"
            aria-pressed=${activeRating === "positive" ? "true" : "false"}
            @click=${() => this.submitFeedback("positive")}
          >
            <md-icon>thumb_up</md-icon>
          </button>
          <button
            class="feedback-button feedback-button--down ${activeRating === "negative"
              ? "feedback-button--selected"
              : ""}"
            type="button"
            title="Bad response"
            aria-label="Bad response"
            aria-expanded=${this.feedbackOpen ? "true" : "false"}
            aria-pressed=${activeRating === "negative" ? "true" : "false"}
            @click=${() => {
              if (this.feedbackOpen) {
                this.closeNegativeFeedback();
              } else {
                this.openNegativeFeedback();
              }
            }}
          >
            <md-icon>thumb_down</md-icon>
          </button>
          <button
            class="feedback-button"
            type="button"
            title=${this.copied ? "Copied" : "Copy message"}
            aria-label="Copy message"
            @click=${this.handleCopyClick}
          >
            <md-icon>${this.copied ? "check" : "content_copy"}</md-icon>
          </button>
        </div>

        ${this.feedbackOpen
          ? html`
              <form
                class="feedback-popover"
                part="feedback-popover"
                @submit=${(event: SubmitEvent) => {
                  event.preventDefault();
                  this.submitFeedback("negative");
                }}
              >
                <div class="feedback-label">
                  ${this.feedbackConfig?.reasonLabel ?? "What went wrong?"}
                </div>
                ${reasons.length > 0
                  ? html`
                      <div class="feedback-tags">
                        ${reasons.map(
                          (reason) => html`
                            <button
                              class="feedback-tag ${this.selectedReasonIds.includes(
                                reason.id,
                              )
                                ? "feedback-tag--selected"
                                : ""}"
                              type="button"
                              aria-pressed=${this.selectedReasonIds.includes(reason.id)
                                ? "true"
                                : "false"}
                              @click=${() => this.toggleReason(reason.id)}
                            >
                              ${reason.label}
                            </button>
                          `,
                        )}
                      </div>
                    `
                  : nothing}
                <textarea
                  class="feedback-comment"
                  rows="3"
                  placeholder=${this.feedbackConfig?.commentPlaceholder ??
                  "Add more detail"}
                  .value=${this.feedbackComment}
                  @input=${(event: InputEvent) => {
                    this.feedbackComment = (
                      event.currentTarget as HTMLTextAreaElement
                    ).value;
                  }}
                ></textarea>
                <div class="feedback-actions">
                  <button
                    class="feedback-cancel"
                    type="button"
                    @click=${this.closeNegativeFeedback}
                  >
                    Cancel
                  </button>
                  <button class="feedback-submit" type="submit">Submit</button>
                </div>
              </form>
            `
          : nothing}
      </div>
    `;
  }

  override render(): TemplateResult {
    if (this.action) return this.renderActionMessage();

    const msg = this.message;
    if (!msg) return html``;

    if (msg.metadata?.["isIteration"] === true) {
      return html`<aura-agent-iteration .message=${msg}></aura-agent-iteration>`;
    }

    const hasToolCalls = !!(msg.toolCalls && msg.toolCalls.length > 0);
    const isTool = msg.role === MessageRole.Tool;

    // Intermediate assistant planning/tool-call messages are represented
    // in the iteration timeline instead of as standalone chat bubbles.
    if (hasToolCalls) {
      return html``;
    }

    if (isTool) {
      // Tool outputs are shown inside the expanded step detail to keep the
      // transcript compact and grouped like an agent timeline.
      return html``;
    }

    const isUser = msg.role === MessageRole.User;
    const isError = !!(
      msg.metadata?.["type"] === "error" || msg.metadata?.["isError"]
    );
    const layoutClass = isUser ? "user-message" : "ai-message";
    const stateClass = isError ? "message-error" : "";

    const senderLabel = isUser ? "You" : this.aiName;
    const avatarSymbol = isUser
      ? html`<md-icon>person</md-icon>`
      : isError
        ? html`<md-icon>error</md-icon>`
        : html`<md-icon>${this.aiIcon}</md-icon>`;

    return html`
      <div
        class="chat-message ${layoutClass} ${stateClass}"
        role="log"
        aria-label="${senderLabel} message"
        part="message message-${msg.role}"
      >
        <div class="message-avatar" part="avatar">${avatarSymbol}</div>
        <div class="message-content">
          <div class="message-header">
            <span class="message-sender">${senderLabel}</span>
            <span class="message-time">
              <time datetime=${new Date(msg.timestamp).toISOString()}>
                ${formatTimestamp(msg.timestamp)}
              </time>
            </span>
          </div>
          <div class="message-body" part="message-body">
            <div
              class="message-text"
              .innerHTML=${renderBasicMarkdown(msg.content)}
            ></div>
            ${this.streaming
              ? html`
                  <span class="streaming-dots">
                    <span class="streaming-dot"></span>
                    <span class="streaming-dot"></span>
                    <span class="streaming-dot"></span>
                  </span>
                `
              : nothing}
            ${isError
              ? html`
                  <button
                    class="retry-btn"
                    part="retry-button"
                    @click=${this.handleRetryClick}
                  >
                    Retry
                  </button>
                `
              : nothing}
          </div>
          ${this.renderFeedbackControls()}
        </div>
      </div>
    `;
  }

  private renderActionMessage(): TemplateResult {
    const a = this.action!;
    return html`
      <div
        class="chat-message ai-message"
        role="log"
        aria-label="${this.aiName} action confirmation"
        part="message message-action"
      >
        <div class="message-avatar" part="avatar">
          <md-icon>${this.aiIcon}</md-icon>
        </div>
        <div class="message-content" style="max-width: 85%">
          <div class="message-header">
            <span class="message-sender">${this.aiName}</span>
            <span class="message-time">
              <time datetime=${new Date().toISOString()}>
                ${formatTimestamp(Date.now())}
              </time>
            </span>
          </div>
          <div class="message-body message-body--action" part="message-body">
            <action-preview
              .action=${a}
              .disabled=${this.actionDisabled}
              @approve-action=${(e: CustomEvent) => {
                e.stopPropagation();
                this.dispatchEvent(
                  new CustomEvent("approve-action", {
                    bubbles: true,
                    composed: true,
                    detail: e.detail,
                  }),
                );
              }}
              @reject-action=${(e: CustomEvent) => {
                e.stopPropagation();
                this.dispatchEvent(
                  new CustomEvent("reject-action", {
                    bubbles: true,
                    composed: true,
                    detail: e.detail,
                  }),
                );
              }}
            ></action-preview>
          </div>
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "aura-messages": AuraMessagesElement;
  }
}
