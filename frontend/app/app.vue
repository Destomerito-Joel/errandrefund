<template>
  <div class="min-h-screen bg-paper text-ink antialiased">
    <header class="border-b border-ink/10 bg-white/90 backdrop-blur">
      <div class="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8">
        <NuxtLink to="/" class="flex items-center gap-3" aria-label="Errand Support home">
          <span class="grid h-10 w-10 place-items-center rounded-2xl bg-moss text-lg font-bold text-white">e</span>
          <span>
            <span class="block font-display text-lg font-semibold leading-tight">errand</span>
            <span class="block text-[10px] font-semibold uppercase tracking-[0.2em] text-ink/50">care, made simple</span>
          </span>
        </NuxtLink>
        <nav class="flex items-center gap-2 text-sm font-medium">
          <NuxtLink to="/" class="rounded-full px-4 py-2 text-ink/70 transition hover:bg-mint hover:text-moss">Support</NuxtLink>
          <NuxtLink to="/admin" class="rounded-full px-4 py-2 text-ink/70 transition hover:bg-mint hover:text-moss">Admin</NuxtLink>
        </nav>
      </div>
    </header>
    <NuxtPage />
    <footer class="mx-auto max-w-7xl px-5 py-8 text-center text-xs text-ink/40 sm:px-8">
      Thoughtful help for the things you bring home.
    </footer>
  </div>
</template>
