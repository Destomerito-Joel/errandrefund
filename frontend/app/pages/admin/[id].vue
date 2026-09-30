<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAdminStore } from '../../stores/admin';

const route = useRoute();
const admin = useAdminStore();
const id = computed(() => Array.isArray(route.params.id) ? route.params.id[0] ?? '' : String(route.params.id ?? ''));
const resolution = ref<'APPROVED' | 'DENIED'>('APPROVED');
const note = ref('');
const saveError = ref('');

onMounted(() => {
  admin.hydrateAdminKey();
  if (admin.isAuthenticated && id.value) void admin.fetchDetail(id.value);
});
watch(id, (value) => { if (admin.isAuthenticated && value) void admin.fetchDetail(value); });

const audit = computed(() => admin.selectedRefund?.auditLogs?.find((entry) => entry.steps.policyTrace || entry.steps.claim) ?? null);
const steps = computed(() => audit.value?.steps);
const openForResolution = computed(() => admin.selectedRefund?.decision === 'ESCALATED' && admin.selectedRefund.status === 'OPEN');

function authenticate(key: string): void {
  admin.setAdminKey(key);
  if (admin.isAuthenticated && id.value) void admin.fetchDetail(id.value);
}

async function submitResolution(): Promise<void> {
  saveError.value = '';
  if (!note.value.trim()) {
    saveError.value = 'Add a short note explaining this decision.';
    return;
  }
  try {
    await admin.resolve(id.value, { decision: resolution.value, note: note.value.trim() });
  } catch {
    saveError.value = admin.error || 'The resolution could not be saved.';
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}
</script>

<template>
  <main class="mx-auto max-w-6xl px-5 py-10 sm:px-8 lg:py-14">
    <div class="flex items-center justify-between gap-4"><NuxtLink to="/admin" class="inline-flex items-center gap-2 text-xs font-semibold text-moss transition hover:text-ink"><span aria-hidden="true">←</span> Back to requests</NuxtLink><button v-if="admin.isAuthenticated" class="rounded-lg px-3 py-2 text-xs font-semibold text-ink/55 transition hover:bg-white hover:text-ink" @click="admin.forgetAdminKey">Forget key</button></div>
    <AdminKeyPrompt v-if="!admin.isAuthenticated" class="mt-2" @authenticate="authenticate" />
    <div v-if="admin.error && !admin.isAuthenticated" role="alert" class="mx-auto mt-4 max-w-lg rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ admin.error }} Check the admin key and try again.</div>
    <template v-else>
    <div v-if="admin.isLoading && !admin.selectedRefund" class="mt-8 rounded-3xl border border-ink/8 bg-white p-10 text-center text-sm text-ink/50">Loading request details…</div>
    <div v-else-if="admin.error && !admin.selectedRefund" role="alert" class="mt-8 rounded-2xl bg-rose-50 p-6 text-sm text-rose-800">{{ admin.error }}</div>
    <template v-else-if="admin.selectedRefund">
      <header class="mt-6 flex flex-col justify-between gap-5 border-b border-ink/10 pb-7 sm:flex-row sm:items-end">
        <div><p class="text-xs font-bold uppercase tracking-[0.18em] text-moss">Refund case</p><h1 class="mt-2 break-all font-mono text-2xl font-semibold tracking-tight sm:text-3xl">{{ admin.selectedRefund.id }}</h1><p class="mt-2 text-sm text-ink/50">Submitted {{ formatDate(admin.selectedRefund.createdAt) }}</p></div>
        <DecisionBadge :decision="admin.selectedRefund.decision" />
      </header>
      <div v-if="admin.error" role="alert" class="mt-5 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{{ admin.error }}</div>

      <div class="mt-7 grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
        <div class="space-y-6">
          <section class="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
            <div class="flex items-center justify-between gap-4"><div><p class="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">Customer message</p><p class="mt-1 text-sm font-medium">{{ admin.selectedRefund.customerEmail }}</p></div><span class="rounded-lg bg-paper px-3 py-2 font-mono text-xs text-ink/55">{{ admin.selectedRefund.orderNumber ?? 'No order' }}</span></div>
            <blockquote class="mt-5 rounded-2xl bg-paper/80 p-5 text-sm leading-7 text-ink/75">“{{ admin.selectedRefund.message }}”</blockquote>
          </section>

          <section class="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-7">
            <div class="flex items-center justify-between"><div><p class="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">Deterministic review</p><h2 class="mt-1 text-lg font-semibold">Policy trace</h2></div><span class="rounded-full bg-paper px-3 py-1.5 text-[10px] font-semibold text-ink/50">{{ steps?.policyTrace?.length ?? 0 }} checks</span></div>
            <p class="mt-2 text-xs leading-5 text-ink/45">Each check is evaluated in order. A match is the rule that determined or escalated the outcome.</p>
            <div class="mt-5"><RuleTrace :steps="steps?.policyTrace ?? []" /></div>
          </section>

          <section v-if="openForResolution" class="rounded-3xl border border-amber-200 bg-amber-50/70 p-5 shadow-sm sm:p-7">
            <div class="flex gap-3"><span class="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-amber-100 text-lg text-amber-800">!</span><div><h2 class="font-semibold text-amber-950">Human review required</h2><p class="mt-1 text-sm leading-6 text-amber-900/70">Record your decision and a short note. This resolution will be added to the audit trail.</p></div></div>
            <form class="mt-5 space-y-4" @submit.prevent="submitResolution">
              <div class="grid grid-cols-2 gap-3">
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition" :class="resolution === 'APPROVED' ? 'border-emerald-400 bg-white text-emerald-800 ring-2 ring-emerald-100' : 'border-amber-900/10 bg-white/60 text-ink/60'"><input v-model="resolution" type="radio" value="APPROVED" class="accent-emerald-700"> Approve</label>
                <label class="flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-3 text-sm font-semibold transition" :class="resolution === 'DENIED' ? 'border-rose-400 bg-white text-rose-800 ring-2 ring-rose-100' : 'border-amber-900/10 bg-white/60 text-ink/60'"><input v-model="resolution" type="radio" value="DENIED" class="accent-rose-700"> Deny</label>
              </div>
              <label for="resolution-note" class="block text-xs font-semibold text-amber-950">Resolution note</label>
              <textarea id="resolution-note" v-model="note" rows="3" maxlength="1000" required placeholder="Briefly explain the decision…" class="w-full rounded-xl border border-amber-900/15 bg-white px-4 py-3 text-sm outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-100" />
              <p v-if="saveError" role="alert" class="text-xs font-medium text-rose-800">{{ saveError }}</p>
              <button type="submit" :disabled="admin.isResolving" class="w-full rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-moss disabled:cursor-wait disabled:opacity-60">{{ admin.isResolving ? 'Saving resolution…' : 'Save human resolution' }}</button>
            </form>
          </section>
        </div>

        <aside class="space-y-6">
          <section class="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-6">
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">Extracted claim</p>
            <dl class="mt-4 space-y-4 text-sm">
              <div><dt class="text-xs text-ink/45">Issue</dt><dd class="mt-1 font-semibold">{{ steps?.claim?.issue?.replaceAll('_', ' ') ?? 'Unavailable' }}</dd></div>
              <div><dt class="text-xs text-ink/45">Claimed item</dt><dd class="mt-1 font-semibold">{{ steps?.claim?.itemName ?? 'Not specified' }}</dd></div>
              <div><dt class="text-xs text-ink/45">Extracted order number</dt><dd class="mt-1 font-mono text-xs font-semibold">{{ steps?.claim?.orderNumber ?? 'Not found' }}</dd></div>
            </dl>
          </section>

          <section class="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-6">
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">Decision context</p>
            <div class="mt-4 flex flex-wrap gap-2"><span v-for="code in admin.selectedRefund.reasonCodes" :key="code" class="rounded-lg bg-paper px-3 py-2 font-mono text-[10px] font-semibold text-ink/65">{{ code }}</span><span v-if="!admin.selectedRefund.reasonCodes.length" class="text-xs text-ink/45">No reason codes recorded.</span></div>
            <div class="mt-5 border-t border-ink/8 pt-4"><div class="flex items-center justify-between"><span class="text-xs text-ink/45">Prompt-injection scan</span><span class="rounded-full px-2.5 py-1 text-[10px] font-bold" :class="steps?.injection?.flagged ? 'bg-violet-100 text-violet-800' : 'bg-emerald-50 text-emerald-700'">{{ steps?.injection?.flagged ? 'Flagged' : 'Clear' }}</span></div><div v-if="steps?.injection?.reasonCodes?.length" class="mt-2 flex flex-wrap gap-1.5"><span v-for="flag in steps.injection.reasonCodes" :key="flag" class="rounded-md bg-violet-50 px-2 py-1 font-mono text-[9px] text-violet-800">{{ flag }}</span></div></div>
          </section>

          <section class="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-6">
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">Assistant reply</p>
            <p class="mt-3 rounded-2xl bg-mint/55 p-4 text-sm leading-6 text-ink/75">{{ admin.selectedRefund.aiReply }}</p>
            <p class="mt-3 text-[10px] leading-5 text-ink/40">Extraction source: {{ steps?.llm?.extractionSource ?? 'Unavailable' }}<br>Reply source: {{ steps?.llm?.replySource ?? 'Unavailable' }}</p>
          </section>

          <section class="rounded-3xl border border-ink/8 bg-white p-5 shadow-sm sm:p-6">
            <p class="text-[10px] font-bold uppercase tracking-[0.15em] text-ink/40">Audit timeline</p>
            <ol class="mt-4 space-y-3">
              <li v-for="entry in admin.selectedRefund.auditLogs" :key="entry.id" class="flex gap-3 text-xs"><span class="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-moss" /><span><strong class="font-semibold">{{ entry.steps.action === 'ADMIN_RESOLUTION' ? 'Human resolution' : 'Automated policy review' }}</strong><span class="mt-1 block text-ink/45">{{ formatDate(entry.createdAt) }}</span><span v-if="entry.steps.note" class="mt-1 block leading-5 text-ink/60">{{ entry.steps.note }}</span></span></li>
            </ol>
          </section>
        </aside>
      </div>
    </template>
    </template>
  </main>
</template>
