<script setup lang="ts">
import { onMounted, ref } from 'vue';
import type { AuraConfig } from 'aura-ai-chat';
import { createAuraDemoConfig } from '../../shared/create-aura-demo-config';

type AuraChatElement = HTMLElement & { config: AuraConfig };

const dashboardPanels = [
  {
    title: 'User Growth',
    metric: '+14.8% month over month',
    detail: 'Retention cohorts improved after the onboarding refresh landed.',
  },
  {
    title: 'Revenue',
    metric: '$982K pipeline influenced',
    detail: 'Mid-market upsell velocity is improving faster than expected.',
  },
  {
    title: 'Traffic Sources',
    metric: 'Organic leads up 22%',
    detail: 'Search is outperforming paid while referral quality remains steady.',
  },
];

const chatWidget = ref<AuraChatElement | null>(null);

onMounted(() => {
  if (!chatWidget.value) {
    return;
  }

  chatWidget.value.config = createAuraDemoConfig({
    appId: 'vue-demo',
    framework: 'Vue',
    dashboardTitle: 'Aura Analytics',
    panels: dashboardPanels,
    onAuraEvent: (event) => {
      console.log('Vue demo Aura event:', event.type, event.payload);
    },
  });
});
</script>

<template>
  <div class="dashboard-shell">
    <header class="top-bar">
      <div class="brand">
        <div class="logo">AA</div>
        <div>
          <div class="title">Aura Analytics</div>
          <div class="subtitle">Vue host demo</div>
        </div>
      </div>
    </header>
    <div class="workspace-split">
      <main class="canvas">
        <div class="panel-grid">
          <div v-for="panel in dashboardPanels" :key="panel.title" class="panel-card">
            <div class="panel-header">{{ panel.title }}</div>
            <div class="panel-content">
              <div class="panel-metric">{{ panel.metric }}</div>
              <div class="panel-detail">{{ panel.detail }}</div>
            </div>
          </div>
        </div>
      </main>
      <aside class="assistant-sidebar">
        <aura-chat ref="chatWidget"></aura-chat>
      </aside>
    </div>
  </div>
</template>

<style>
body {
  margin: 0;
  font-family: system-ui, -apple-system, sans-serif;
  color: #1d3143;
  background: #f3f7fb;
}
</style>

<style scoped>
.dashboard-shell {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: radial-gradient(circle at top left, rgba(15, 125, 145, 0.18), transparent 45%), #f3f7fb;
}
.top-bar {
  height: 64px;
  padding: 0 1rem;
  border-bottom: 1px solid #d8e2ea;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}
.brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.logo {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: grid;
  place-items: center;
  font-size: 0.78rem;
  font-weight: 700;
  background: linear-gradient(155deg, #0f7d91, #29af8f);
  color: #f8fffd;
}
.title {
  font-size: 0.97rem;
  font-weight: 700;
}
.subtitle {
  margin-top: 0.07rem;
  font-size: 0.73rem;
  color: #66798a;
}
.workspace-split {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.canvas {
  flex: 1;
  min-width: 680px;
  padding: 2rem;
  overflow-y: auto;
}
.assistant-sidebar {
  width: 420px;
  min-width: 320px;
  border-left: 1px solid #d8e2ea;
  background: #fff;
  display: flex;
  flex-direction: column;
}
.panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1.5rem;
}
.panel-card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  min-height: 200px;
}
.panel-header {
  font-weight: 600;
  font-size: 1.1rem;
  border-bottom: 1px solid #eee;
  padding-bottom: 0.8rem;
  margin-bottom: 1rem;
  color: #1d3143;
}
.panel-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.45rem;
  color: #8c98a4;
  font-size: 0.9rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px dashed #d8e2ea;
  padding: 1rem;
}
.panel-metric {
  font-size: 1.55rem;
  font-weight: 700;
  color: #17324a;
}
.panel-detail {
  line-height: 1.45;
}
.assistant-sidebar > * {
  flex: 1;
}
</style>
