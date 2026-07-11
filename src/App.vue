<script setup lang="ts">
import ThemeToggle from './components/ThemeToggle.vue'
</script>

<template>
  <div class="min-h-screen relative bg-slate-50 dark:bg-ink-950 transition-colors duration-300">
    <!-- Fundo decorativo: blobs suaves, não interativos, atrás de todo o conteúdo -->
    <div class="pointer-events-none fixed inset-0 overflow-hidden">
      <div
        class="absolute -top-32 -left-24 w-96 h-96 rounded-full blur-3xl bg-emerald-300/25 dark:bg-emerald-500/10">
      </div>
      <div
        class="absolute top-1/3 -right-32 w-[28rem] h-[28rem] rounded-full blur-3xl bg-blue-300/15 dark:bg-blue-500/10">
      </div>
      <div
        class="absolute -bottom-40 left-1/4 w-96 h-96 rounded-full blur-3xl bg-violet-300/15 dark:bg-violet-500/10">
      </div>
    </div>

    <ThemeToggle />

    <div class="relative z-10">
      <router-view v-slot="{ Component }">
        <transition name="fade-rise" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </div>
  </div>
</template>

<style>
.fade-rise-enter-active,
.fade-rise-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.fade-rise-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.fade-rise-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

@media (prefers-reduced-motion: reduce) {

  .fade-rise-enter-active,
  .fade-rise-leave-active {
    transition: none;
  }
}
</style>
