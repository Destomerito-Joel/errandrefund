import type {
  RefundDetail,
  RefundListResponse,
  RefundListItem,
  RefundResponse,
  RefundSubmission,
  ResolveRefundInput,
} from '../types/api';

/** Typed transport wrapper for the backend API, rooted at runtime configuration. */
export function useApi() {
  const config = useRuntimeConfig();
  const baseURL = config.public.apiBase;
  const adminHeaders = (): Record<string, string> => {
    const key = import.meta.client ? window.sessionStorage.getItem('errand-admin-api-key') : null;
    return key ? { Authorization: `Bearer ${key}` } : {};
  };

  return {
    submitRefund: (payload: RefundSubmission) =>
      $fetch<RefundResponse>('/refunds', { baseURL, method: 'POST', body: payload }),
    listRefunds: (page: number, decision?: string) =>
      $fetch<RefundListResponse>('/admin/refunds', {
        baseURL,
        query: { page, ...(decision ? { decision } : {}) },
        headers: adminHeaders(),
      }),
    getRefund: (id: string) =>
      $fetch<RefundDetail>(`/admin/refunds/${encodeURIComponent(id)}`, { baseURL, headers: adminHeaders() }),
    resolveRefund: (id: string, payload: ResolveRefundInput) =>
      $fetch<RefundListItem>(`/admin/refunds/${encodeURIComponent(id)}/resolve`, {
        baseURL,
        method: 'POST',
        body: payload,
        headers: adminHeaders(),
      }),
  };
}
