<script setup lang="ts">
import { onMounted } from 'vue';
import { useAdminStore } from '../../stores/admin';
import type { Decision } from '../../types/api';

const admin = useAdminStore();
onMounted(() => {
  admin.hydrateAdminKey();
  if (admin.isAuthenticated) void admin.loadDashboard();
});

function authenticate(key: string): void {
  admin.setAdminKey(key);
  if (admin.isAuthenticated) void admin.loadDashboard();
}

async function changeFilter(event: Event): Promise<void> {
  const target = event.target;
  if (!(target instanceof HTMLSelectElement)) return;
  await admin.setFilter(target.value as Decision | '');
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value));
}
</script>

<template>
  <main class="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:py-14">
    <div class="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.2em] text-moss">Operations</p>
        <h1 class="mt-2 font-display text-4xl tracking-tight sm:text-5xl">Refund requests</h1>
        <p class="mt-3 text-sm text-ink/55">Review outcomes, spot escalations, and follow every decision.</p>
      </div>
      <div class="flex items-center gap-3 text-xs text-ink/50"><span class="flex items-center gap-2"><span class="h-2 w-2 rounded-full bg-emerald-500" /> Live support queue</span><button v-if="admin.isAuthenticated" class="rounded-lg px-3 py-2 font-semibold text-ink/55 transition hover:bg-white hover:text-ink" @click="admin.forgetAdminKey">Forget key</button></div>
    </div>

    <AdminKeyPrompt v-if="!admin.isAuthenticated" class="mt-2" @authenticate="authenticate" />
    <div v-if="admin.error && !admin.isAuthenticated" role="alert" class="mx-auto mt-4 max-w-lg rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ admin.error }} Check the admin key and try again.</div>
    <template v-if="admin.isAuthenticated">
    <section class="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-5" aria-label="Refund summary counts">
      <article v-for="item in [
        { label: 'All requests', value: admin.summary.total, color: 'text-ink' },
        { label: 'Approved', value: admin.summary.approved, color: 'text-emerald-700' },
        { label: 'Denied', value: admin.summary.denied, color: 'text-rose-700' },
        { label: 'Escalated', value: admin.summary.escalated, color: 'text-amber-700' },
        { label: 'Flagged', value: admin.summary.flagged, color: 'text-violet-700' },
      ]" :key="item.label" class="rounded-2xl border border-ink/8 bg-white p-4 shadow-sm sm:p-5">
        <p class="text-xs font-medium text-ink/50">{{ item.label }}</p>
        <p class="mt-2 text-3xl font-semibold tracking-tight" :class="item.color">{{ item.value }}</p>
      </article>
    </section>

    <section class="mt-8 overflow-hidden rounded-3xl border border-ink/8 bg-white shadow-sm">
      <div class="flex flex-col gap-4 border-b border-ink/8 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div><h2 class="font-semibold">Request queue</h2><p class="mt-1 text-xs text-ink/45">{{ admin.total }} matching records</p></div>
        <label class="flex items-center gap-3 text-xs font-semibold text-ink/55">Decision
          <select :value="admin.decisionFilter" class="rounded-xl border border-ink/10 bg-paper px-3 py-2.5 text-sm text-ink outline-none focus:border-moss/50" @change="changeFilter">
            <option value="">All decisions</option>
            <option value="APPROVED">Approved</option>
            <option value="DENIED">Denied</option>
            <option value="ESCALATED">Escalated</option>
          </select>
        </label>
      </div>
      <div v-if="admin.error" role="alert" class="m-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ admin.error }}</div>
      <div class="overflow-x-auto">
        <table class="w-full min-w-[760px] border-collapse text-left">
          <thead class="bg-paper/80 text-[10px] font-bold uppercase tracking-[0.13em] text-ink/45">
            <tr><th class="px-6 py-4">Date</th><th class="px-6 py-4">Customer</th><th class="px-6 py-4">Order</th><th class="px-6 py-4">Decision</th><th class="px-6 py-4">Signal</th><th class="px-6 py-4 text-right">Open</th></tr>
          </thead>
          <tbody class="divide-y divide-ink/5">
            <tr v-for="request in admin.requests" :key="request.id" class="transition hover:bg-paper/55">
              <td class="whitespace-nowrap px-6 py-4 text-sm text-ink/65">{{ formatDate(request.createdAt) }}</td>
              <td class="px-6 py-4"><span class="block max-w-[230px] truncate text-sm font-semibold">{{ request.customerEmail }}</span><span class="mt-1 block font-mono text-[10px] text-ink/35">{{ request.id.slice(0, 12) }}</span></td>
              <td class="px-6 py-4 font-mono text-xs text-ink/60">{{ request.orderNumber ?? '—' }}</td>
              <td class="px-6 py-4"><DecisionBadge :decision="request.decision" /></td>
              <td class="px-6 py-4">
                <span v-if="request.flagged" class="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[10px] font-semibold text-violet-800" title="Prompt-injection or safety flag">
                  <svg viewBox="0 0 20 20" class="h-3.5 w-3.5" fill="currentColor" aria-hidden="true"><path fill-rule="evenodd" d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm0 4a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 6Zm0 7a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clip-rule="evenodd"/></svg>
                  Flagged
                </span>
                <span v-else class="text-xs text-ink/35">—</span>
              </td>
              <td class="px-6 py-4 text-right"><NuxtLink :to="`/admin/${encodeURIComponent(request.id)}`" class="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold text-moss transition hover:bg-mint">Details <span aria-hidden="true">→</span></NuxtLink></td>
            </tr>
            <tr v-if="!admin.isLoading && !admin.requests.length"><td colspan="6" class="px-6 py-16 text-center"><span class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-mint text-xl text-moss">✓</span><p class="mt-4 text-sm font-semibold">No requests to show</p><p class="mt-1 text-xs text-ink/45">Try another decision filter or check back later.</p></td></tr>
            <tr v-if="admin.isLoading && !admin.requests.length"><td colspan="6" class="px-6 py-16 text-center text-sm text-ink/45">Loading refund requests…</td></tr>
          </tbody>
        </table>
      </div>
      <div class="flex items-center justify-between border-t border-ink/8 px-5 py-4 sm:px-6">
        <p class="text-xs text-ink/45">Page {{ admin.page }} of {{ Math.max(1, admin.totalPages) }}</p>
        <div class="flex gap-2">
          <button class="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40" :disabled="admin.page <= 1 || admin.isLoading" @click="admin.goToPage(admin.page - 1)">Previous</button>
          <button class="rounded-xl border border-ink/10 px-3 py-2 text-xs font-semibold transition hover:bg-paper disabled:cursor-not-allowed disabled:opacity-40" :disabled="admin.page >= admin.totalPages || admin.isLoading" @click="admin.goToPage(admin.page + 1)">Next</button>
        </div>
      </div>
    </section>
    </template>
  </main>
</template>
