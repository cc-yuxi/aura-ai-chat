import "aura-ai-chat";
import { Streamlit, type RenderData } from "streamlit-component-lib";

type AuraEvent = {
  type?: string;
  timestamp?: number;
  payload?: Record<string, unknown>;
  event?: Record<string, unknown>;
};

type AuraStreamlitArgs = {
  config?: Record<string, unknown>;
  eventTypes?: string[];
  minHeight?: number;
};

type AuraChatElement = HTMLElement & {
  config?: Record<string, unknown>;
};

const root = document.getElementById("root");
const chat = document.createElement("aura-chat") as AuraChatElement;
let renderArgs: AuraStreamlitArgs = {};
let eventSequence = 0;

if (!root) {
  throw new Error("Missing #root element for aura-streamlit");
}

root.append(chat);

const setFrameHeight = (): void => {
  window.requestAnimationFrame(() => {
    Streamlit.setFrameHeight(document.documentElement.scrollHeight);
  });
};

const cloneConfig = (
  config: Record<string, unknown> | undefined,
): Record<string, unknown> => {
  if (!config) return {};
  return JSON.parse(JSON.stringify(config)) as Record<string, unknown>;
};

const shouldEmitEvent = (event: AuraEvent): boolean => {
  const filters = renderArgs.eventTypes ?? [];
  if (filters.length === 0) return false;
  return Boolean(event.type && filters.includes(event.type));
};

const handleAuraEvent = (event: AuraEvent): void => {
  if (!shouldEmitEvent(event)) return;

  eventSequence += 1;
  Streamlit.setComponentValue({
    sequence: eventSequence,
    event,
  });
};

const applyRender = (data: RenderData<AuraStreamlitArgs>): void => {
  renderArgs = data.args ?? {};
  const minHeight = Math.max(Number(renderArgs.minHeight ?? 720), 320);
  const config = cloneConfig(renderArgs.config);

  document.body.style.margin = "0";
  document.body.style.background = "transparent";
  root.style.minHeight = `${minHeight}px`;
  root.style.width = "100%";

  chat.style.display = "block";
  chat.style.width = "100%";
  chat.style.minHeight = `${minHeight}px`;
  chat.config = {
    ...config,
    onAuraEvent: handleAuraEvent,
  };

  setFrameHeight();
};

if (typeof ResizeObserver !== "undefined") {
  const resizeObserver = new ResizeObserver(() => {
    setFrameHeight();
  });
  resizeObserver.observe(chat);
  resizeObserver.observe(root);
}

Streamlit.events.addEventListener(
  Streamlit.RENDER_EVENT,
  (event: Event): void => {
    const renderEvent = event as CustomEvent<RenderData<AuraStreamlitArgs>>;
    applyRender(renderEvent.detail);
  },
);

Streamlit.setComponentReady();
setFrameHeight();
