export type Decision = 'APPROVED' | 'DENIED' | 'ESCALATED';
export type RefundStatus = 'OPEN' | 'RESOLVED';

export interface RefundSubmission {
  email: string;
  message: string;
}

export interface RefundResponse {
  requestId: string;
  decision: Decision;
  reply: string;
}

export interface RefundListItem {
  id: string;
  customerEmail: string;
  orderNumber: string | null;
  decision: Decision;
  reasonCodes: string[];
  flagged: boolean;
  status: RefundStatus;
  createdAt: string;
}

export interface RefundListResponse {
  requests: RefundListItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ClaimData {
  orderNumber: string | null;
  issue: 'DAMAGED' | 'INCORRECT' | 'CHANGE_OF_MIND' | 'UNKNOWN';
  itemName: string | null;
}

export interface RuleTraceStep {
  rule: string;
  result: 'TRIGGERED' | 'CLEAR';
  detail: string;
}

export interface RefundAuditSteps {
  claim?: ClaimData;
  policyTrace?: RuleTraceStep[];
  finalDecision?: Decision;
  reasonCodes?: string[];
  injection?: { flagged: boolean; reasonCodes: string[] };
  llm?: {
    extractionSource: 'primary' | 'fallback_model' | 'deterministic_fallback';
    replySource: 'primary' | 'fallback_model' | 'deterministic_fallback';
    reply: string;
  };
  timestamps?: { receivedAt: string; completedAt: string };
  action?: string;
  priorDecision?: Decision;
  decision?: Decision;
  note?: string;
  resolvedAt?: string;
}

export interface AuditLog {
  id: string;
  refundRequestId: string;
  steps: RefundAuditSteps;
  createdAt: string;
}

export interface RefundDetail extends RefundListItem {
  message: string;
  aiReply: string;
  auditLogs: AuditLog[];
  updatedAt: string;
}

export interface ResolveRefundInput {
  decision: 'APPROVED' | 'DENIED';
  note: string;
}
