<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, RouterView, useRoute } from 'vue-router'

const route = useRoute()

const navItems = [
  { name: 'home', label: '首页', to: '/' },
  { name: 'builder', label: '配装器', to: '/builder' },
  // { name: 'about', label: '关于', to: '/about' },
]

const activePath = computed(() => route.path)
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="page-container flex-between h-full">
        <RouterLink to="/" class="brand">
          <span class="brand__mark">MH</span>
          <span class="brand__text">MonsterHunter</span>
        </RouterLink>

        <nav class="flex items-center gap-2">
          <RouterLink
            v-for="item in navItems"
            :key="item.name"
            :to="item.to"
            class="nav-link"
            :class="{ 'nav-link--active': activePath === item.to }"
          >
            {{ item.label }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main class="flex-1 app-content">
      <RouterView v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </RouterView>
    </main>

    <footer class="app-footer">
      <span>Vite + Vue 3 + TypeScript · Element Plus · UnoCSS · SCSS · Pinia</span>
    </footer>
  </div>
</template>

<style scoped lang="scss">
.app-shell {
  display: flex;
  flex-direction: column;
  height: 100vh;
  height: 100dvh;
  overflow: hidden;
  background: $color-bg;
}

.app-header {
  flex: none;
  position: sticky;
  top: 0;
  z-index: 20;
  height: 60px;
  border-bottom: 1px solid $color-border;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(8px);
}

.app-content {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.brand {
  @include flex-center(row, 10px);
  color: $color-text-primary;
  text-decoration: none;

  &__mark {
    @include flex-center;
    width: 30px;
    height: 30px;
    border-radius: $radius-md;
    background: $color-primary;
    color: $color-bg-white;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.5px;
  }

  &__text {
    font-size: 16px;
    font-weight: 600;
  }
}

.nav-link {
  padding: 6px 14px;
  border-radius: $radius-sm;
  color: $color-text-regular;
  font-size: 14px;
  text-decoration: none;
  transition:
    color 0.2s ease,
    background-color 0.2s ease;

  &:hover {
    color: $color-primary;
    background: rgba(64, 158, 255, 0.08);
  }

  &--active {
    color: $color-primary;
    background: rgba(64, 158, 255, 0.12);
    font-weight: 600;
  }
}

.app-footer {
  padding: 14px 16px;
  border-top: 1px solid $color-border;
  color: $color-text-secondary;
  font-size: 12px;
  text-align: center;
}
</style>
