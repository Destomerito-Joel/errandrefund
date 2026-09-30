import { defineStore } from 'pinia';
import type { Decision } from '../types/api';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  decision?: Decision;
  requestId?: string;
}

const EMAIL_STORAGE_KEY = 'errand-support-email';

export const useChatStore = defineStore('chat', () => {
  const api = useApi();
  const email = ref('');
  const messages = ref<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: 'Hi there. Tell me what happened with your order and I’ll help you with the next step.',
    },
  ]);
  const isLoading = ref(false);
  const error = ref('');

  function hydrateEmail(): void {
    if (import.meta.client) email.value = window.localStorage.getItem(EMAIL_STORAGE_KEY) ?? '';
  }

  function setEmail(value: string): void {
    email.value = value;
    if (import.meta.client) window.localStorage.setItem(EMAIL_STORAGE_KEY, value);
  }

  async function sendMessage(content: string): Promise<void> {
    const message = content.trim();
    if (!message || isLoading.value) return;
    if (!email.value.trim()) {
      error.value = 'Add the email used for your order before sending a message.';
      return;
    }

    error.value = '';
    const pendingMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', content: message };
    messages.value.push(pendingMessage);
    isLoading.value = true;

    try {
      const result = await api.submitRefund({ email: email.value.trim(), message });
      messages.value.push({
        id: result.requestId,
        role: 'assistant',
        content: result.reply,
        decision: result.decision,
        requestId: result.requestId,
      });
    } catch {
      messages.value = messages.value.filter((item) => item.id !== pendingMessage.id);
      error.value = 'We couldn’t reach support just now. Your message is still here—please try sending it again in a moment.';
    } finally {
      isLoading.value = false;
    }
  }

  return { email, messages, isLoading, error, hydrateEmail, setEmail, sendMessage };
});
