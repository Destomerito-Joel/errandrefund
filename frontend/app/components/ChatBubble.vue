<script setup lang="ts">
import type { ChatMessage } from '../stores/chat';

defineProps<{ message: ChatMessage }>();
</script>

<template>
  <div class="flex items-end gap-3" :class="message.role === 'user' ? 'justify-end' : 'justify-start'">
    <div v-if="message.role === 'assistant'" class="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-mint text-sm font-bold text-moss">e</div>
    <article class="max-w-[85%] rounded-3xl px-5 py-4 shadow-sm sm:max-w-[76%]" :class="message.role === 'user' ? 'rounded-br-lg bg-moss text-white' : 'rounded-bl-lg border border-ink/5 bg-white text-ink'">
      <p class="whitespace-pre-wrap text-sm leading-6">{{ message.content }}</p>
      <div v-if="message.decision" class="mt-3 flex items-center justify-between gap-4 border-t border-ink/10 pt-3">
        <DecisionBadge :decision="message.decision" />
        <span v-if="message.requestId" class="truncate text-[10px] text-ink/40">Ref {{ message.requestId.slice(0, 8) }}</span>
      </div>
    </article>
    <div v-if="message.role === 'user'" class="mb-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-ink/10 text-xs font-bold text-ink/60">You</div>
  </div>
</template>
