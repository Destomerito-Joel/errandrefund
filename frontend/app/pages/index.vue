<script setup lang="ts">
import { nextTick, onMounted, ref, watch } from 'vue';
import { computed } from 'vue';
import { useChatStore } from '../stores/chat';

const chat = useChatStore();
const email = computed({ get: () => chat.email, set: (value: string) => chat.setEmail(value) });
const draft = ref('');
const conversation = ref<HTMLElement | null>(null);

onMounted(() => chat.hydrateEmail());

watch(() => chat.messages.length + Number(chat.isLoading), async () => {
  await nextTick();
  conversation.value?.scrollTo({ top: conversation.value.scrollHeight, behavior: 'smooth' });
});

async function send(): Promise<void> {
  if (!draft.value.trim() || chat.isLoading) return;
  const previousLength = chat.messages.length;
  await chat.sendMessage(draft.value);
  if (chat.messages.length > previousLength) draft.value = '';
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    void send();
  }
}
</script>

<template>
  <main class="relative mx-auto grid min-h-[calc(100vh-120px)] max-w-7xl items-start gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[0.8fr_1.2fr] lg:py-14">
    <section class="pt-2 lg:sticky lg:top-10">
      <p class="inline-flex items-center gap-2 rounded-full border border-moss/15 bg-white px-3 py-1.5 text-xs font-semibold text-moss"><span class="h-2 w-2 rounded-full bg-emerald-500" /> Here when you need us</p>
      <h1 class="mt-6 max-w-xl font-display text-5xl leading-[1.05] tracking-tight sm:text-6xl">Let’s get this <span class="italic text-moss">sorted.</span></h1>
      <p class="mt-5 max-w-lg text-base leading-7 text-ink/60">Tell us about your order and what went wrong. Our support assistant will check the details and help with a clear next step.</p>
      <div class="mt-8 grid max-w-md grid-cols-2 gap-3">
        <div class="rounded-2xl border border-ink/5 bg-white p-4"><p class="text-sm font-semibold">A real answer</p><p class="mt-1 text-xs leading-5 text-ink/50">Every request is checked against your order.</p></div>
        <div class="rounded-2xl border border-ink/5 bg-white p-4"><p class="text-sm font-semibold">A clear outcome</p><p class="mt-1 text-xs leading-5 text-ink/50">We’ll explain what happens next.</p></div>
      </div>
      <p class="mt-6 text-xs text-ink/40">For the quickest help, include your order number in the message.</p>
    </section>

    <section class="mx-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-ink/10 bg-white shadow-card">
      <div class="flex items-center justify-between border-b border-ink/8 px-5 py-4 sm:px-7">
        <div class="flex items-center gap-3">
          <span class="grid h-11 w-11 place-items-center rounded-2xl bg-mint text-lg font-bold text-moss">e</span>
          <div><h2 class="text-sm font-bold">Errand Support</h2><p class="mt-0.5 text-xs text-ink/45">Typically replies in a few moments</p></div>
        </div>
        <span class="hidden items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-[10px] font-semibold text-emerald-700 sm:inline-flex"><span class="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online</span>
      </div>

      <div ref="conversation" class="flex h-[390px] flex-col gap-5 overflow-y-auto bg-paper/60 px-4 py-6 sm:h-[440px] sm:px-7">
        <ChatBubble v-for="message in chat.messages" :key="message.id" :message="message" />
        <div v-if="chat.isLoading" class="flex items-end gap-3">
          <span class="grid h-8 w-8 place-items-center rounded-xl bg-mint text-sm font-bold text-moss">e</span>
          <div class="flex items-center gap-1.5 rounded-3xl rounded-bl-lg border border-ink/5 bg-white px-5 py-4" aria-label="Assistant is typing" role="status">
            <span class="h-2 w-2 animate-bounce rounded-full bg-moss/45 [animation-delay:-0.2s]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-moss/45 [animation-delay:-0.1s]" />
            <span class="h-2 w-2 animate-bounce rounded-full bg-moss/45" />
          </div>
        </div>
      </div>

      <div class="border-t border-ink/8 p-4 sm:p-6">
        <label for="customer-email" class="mb-2 block text-xs font-semibold text-ink/65">Email used for your order</label>
        <input id="customer-email" v-model="email" type="email" autocomplete="email" placeholder="you@example.com" class="mb-4 w-full rounded-xl border border-ink/10 bg-white px-4 py-3 text-sm outline-none transition placeholder:text-ink/30 focus:border-moss/50 focus:ring-4 focus:ring-moss/10" :disabled="chat.isLoading" />
        <div v-if="chat.error" role="alert" class="mb-3 flex items-start gap-2 rounded-xl bg-rose-50 px-4 py-3 text-xs leading-5 text-rose-800"><span class="font-bold">!</span><p>{{ chat.error }}</p></div>
        <form class="flex items-end gap-3" @submit.prevent="send">
          <label class="sr-only" for="chat-message">Your message</label>
          <textarea id="chat-message" v-model="draft" rows="2" maxlength="5000" placeholder="Write a message…" class="min-h-[52px] flex-1 resize-none rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm leading-5 outline-none transition placeholder:text-ink/35 focus:border-moss/50 focus:ring-4 focus:ring-moss/10 disabled:cursor-not-allowed disabled:bg-slate-50" :disabled="chat.isLoading" @keydown="handleKeydown" />
          <button type="submit" :disabled="chat.isLoading || !draft.trim()" class="grid h-[52px] w-[52px] shrink-0 place-items-center rounded-2xl bg-moss text-white transition hover:bg-ink disabled:cursor-not-allowed disabled:opacity-40" aria-label="Send message">
            <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="m4 12 16-8-5 16-3-7-8-1Z" stroke-linejoin="round"/><path d="m12 13 4-5" stroke-linecap="round"/></svg>
          </button>
        </form>
        <p class="mt-3 text-center text-[10px] text-ink/35">Press Enter to send · Shift + Enter for a new line</p>
      </div>
    </section>
  </main>
</template>
