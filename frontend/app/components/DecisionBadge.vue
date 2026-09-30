<script setup lang="ts">
import type { Decision } from '../types/api';

const props = defineProps<{ decision: Decision | string }>();

const styles: Record<string, string> = {
  APPROVED: 'bg-emerald-100 text-emerald-800 ring-emerald-700/10',
  DENIED: 'bg-rose-100 text-rose-800 ring-rose-700/10',
  ESCALATED: 'bg-amber-100 text-amber-900 ring-amber-700/10',
};
const labels: Record<string, string> = {
  APPROVED: 'Approved',
  DENIED: 'Denied',
  ESCALATED: 'In review',
};
</script>

<template>
  <span class="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ring-inset" :class="styles[props.decision] ?? 'bg-slate-100 text-slate-700 ring-slate-700/10'">
    <span class="h-1.5 w-1.5 rounded-full" :class="props.decision === 'APPROVED' ? 'bg-emerald-600' : props.decision === 'DENIED' ? 'bg-rose-600' : props.decision === 'ESCALATED' ? 'bg-amber-600' : 'bg-slate-500'" />
    {{ labels[props.decision] ?? props.decision }}
  </span>
</template>
