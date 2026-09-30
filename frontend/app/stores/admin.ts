import { defineStore } from 'pinia';
import type {
  Decision,
  RefundDetail,
  RefundListItem,
  RefundListResponse,
  ResolveRefundInput,
} from '../types/api';
import { clearAdminKeyOnUnauthorized } from '../utils/adminAuth';

export interface RefundSummary {
  total: number;
  approved: number;
  denied: number;
  escalated: number;
  flagged: number;
}

const emptySummary = (): RefundSummary => ({ total: 0, approved: 0, denied: 0, escalated: 0, flagged: 0 });
const ADMIN_KEY_STORAGE = 'errand-admin-api-key';

export const useAdminStore = defineStore('admin', () => {
  const api = useApi();
  const requests = ref<RefundListItem[]>([]);
  const selectedRefund = ref<RefundDetail | null>(null);
  const page = ref(1);
  const pageSize = ref(20);
  const total = ref(0);
  const totalPages = ref(0);
  const decisionFilter = ref<Decision | ''>('');
  const summary = ref<RefundSummary>(emptySummary());
  const isLoading = ref(false);
  const isResolving = ref(false);
  const isAuthenticated = ref(false);
  const error = ref('');

  function hydrateAdminKey(): boolean {
    if (import.meta.client) isAuthenticated.value = Boolean(window.sessionStorage.getItem(ADMIN_KEY_STORAGE));
    return isAuthenticated.value;
  }

  function setAdminKey(key: string): void {
    if (!import.meta.client || key.trim().length < 32) return;
    window.sessionStorage.setItem(ADMIN_KEY_STORAGE, key.trim());
    isAuthenticated.value = true;
    error.value = '';
  }

  function forgetAdminKey(): void {
    if (import.meta.client) window.sessionStorage.removeItem(ADMIN_KEY_STORAGE);
    isAuthenticated.value = false;
    selectedRefund.value = null;
    requests.value = [];
    summary.value = emptySummary();
  }

  async function fetchPage(nextPage = page.value): Promise<void> {
    const response = await api.listRefunds(nextPage, decisionFilter.value || undefined);
    requests.value = response.requests;
    page.value = response.page;
    pageSize.value = response.pageSize;
    total.value = response.total;
    totalPages.value = response.totalPages;
  }

  async function fetchSummary(): Promise<void> {
    const first = await api.listRefunds(1);
    const remainingPages = await Promise.all(
      Array.from({ length: Math.max(0, first.totalPages - 1) }, (_, index) => api.listRefunds(index + 2)),
    );
    const allRequests = [first, ...remainingPages].flatMap((result: RefundListResponse) => result.requests);
    summary.value = allRequests.reduce<RefundSummary>((counts, request) => {
      counts.total += 1;
      if (request.decision === 'APPROVED') counts.approved += 1;
      if (request.decision === 'DENIED') counts.denied += 1;
      if (request.decision === 'ESCALATED') counts.escalated += 1;
      if (request.flagged) counts.flagged += 1;
      return counts;
    }, emptySummary());
  }

  async function loadDashboard(): Promise<void> {
    isLoading.value = true;
    error.value = '';
    try {
      await Promise.all([fetchPage(1), fetchSummary()]);
    } catch (requestError) {
      error.value = 'The dashboard could not load. Check the connection and try again.';
      clearAdminKeyOnUnauthorized(requestError, forgetAdminKey);
    } finally {
      isLoading.value = false;
    }
  }

  async function setFilter(value: Decision | ''): Promise<void> {
    decisionFilter.value = value;
    isLoading.value = true;
    error.value = '';
    try {
      await fetchPage(1);
    } catch (requestError) {
      error.value = 'We couldn’t apply that filter. Please try again.';
      clearAdminKeyOnUnauthorized(requestError, forgetAdminKey);
    } finally {
      isLoading.value = false;
    }
  }

  async function goToPage(nextPage: number): Promise<void> {
    if (nextPage < 1 || nextPage > totalPages.value || isLoading.value) return;
    isLoading.value = true;
    error.value = '';
    try {
      await fetchPage(nextPage);
    } catch (requestError) {
      error.value = 'That page could not load. Please try again.';
      clearAdminKeyOnUnauthorized(requestError, forgetAdminKey);
    } finally {
      isLoading.value = false;
    }
  }

  async function fetchDetail(id: string): Promise<void> {
    isLoading.value = true;
    error.value = '';
    selectedRefund.value = null;
    try {
      selectedRefund.value = await api.getRefund(id);
    } catch (requestError) {
      error.value = 'We couldn’t load this refund request. It may have been removed or the service may be unavailable.';
      clearAdminKeyOnUnauthorized(requestError, forgetAdminKey);
    } finally {
      isLoading.value = false;
    }
  }

  async function resolve(id: string, payload: ResolveRefundInput): Promise<void> {
    isResolving.value = true;
    error.value = '';
    try {
      await api.resolveRefund(id, payload);
      selectedRefund.value = await api.getRefund(id);
      await fetchSummary();
    } catch (requestError) {
      error.value = 'The resolution could not be saved. Please check the note and try again.';
      clearAdminKeyOnUnauthorized(requestError, forgetAdminKey);
      throw new Error(error.value);
    } finally {
      isResolving.value = false;
    }
  }

  return {
    requests,
    selectedRefund,
    page,
    pageSize,
    total,
    totalPages,
    decisionFilter,
    summary,
    isLoading,
    isResolving,
    isAuthenticated,
    error,
    hydrateAdminKey,
    setAdminKey,
    forgetAdminKey,
    loadDashboard,
    setFilter,
    goToPage,
    fetchDetail,
    resolve,
  };
});
