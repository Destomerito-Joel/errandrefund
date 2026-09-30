<script setup lang="ts">
import { ref } from 'vue';

const emit = defineEmits<{ authenticate: [key: string] }>();
const key = ref('');

function submit(): void {
  const token = key.value.trim();
  if (token.length >= 32) emit('authenticate', token);
}
</script>

<template>
  <section class="mx-auto mt-10 max-w-lg rounded-3xl border border-ink/8 bg-white p-6 shadow-card sm:p-8">
    <span class="grid h-12 w-12 place-items-center rounded-2xl bg-mint text-xl text-moss" aria-hidden="true">⌑</span>
    <h2 class="mt-5 font-display text-2xl">Admin access</h2>
    <p class="mt-2 text-sm leading-6 text-ink/55">Enter the admin API key configured in your local environment. It is kept in this tab’s session storage only.</p>
    <form class="mt-5 space-y-3" @submit.prevent="submit">
      <label for="admin-api-key" class="block text-xs font-semibold text-ink/65">Admin API key</label>
      <input id="admin-api-key" v-model="key" type="password" autocomplete="current-password" minlength="32" required placeholder="Paste your admin key" class="w-full rounded-xl border border-ink/10 bg-paper px-4 py-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-moss/50 focus:ring-4 focus:ring-moss/10">
      <button type="submit" :disabled="key.trim().length < 32" class="w-full rounded-xl bg-moss px-5 py-3 text-sm font-semibold text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40">Continue to dashboard</button>
    </form>
  </section>
</template>