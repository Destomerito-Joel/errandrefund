<script setup lang="ts">
import type { RuleTraceStep } from '../types/api';

defineProps<{ steps: RuleTraceStep[] }>();

function humanize(value: string): string {
  return value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}
</script>

<template>
  <div v-if="steps.length" class="space-y-3">
    <div v-for="(step, index) in steps" :key="`${step.rule}-${index}`" class="flex gap-3 rounded-2xl border border-ink/8 bg-white p-4">
      <span class="grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold" :class="step.result === 'CLEAR' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'">{{ String(index + 1).padStart(2, '0') }}</span>
      <div class="min-w-0 flex-1">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <h3 class="text-sm font-semibold">{{ humanize(step.rule) }}</h3>
          <span class="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" :class="step.result === 'CLEAR' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-800'">{{ step.result === 'CLEAR' ? 'Pass · clear' : 'Matched · action' }}</span>
        </div>
        <p class="mt-1 text-xs leading-5 text-ink/55">{{ step.detail }}</p>
      </div>
    </div>
  </div>
  <p v-else class="rounded-2xl bg-slate-50 p-4 text-sm text-ink/50">No policy trace was recorded for this request.</p>
</template>
