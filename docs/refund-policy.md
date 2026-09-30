# Refund policy

This policy is deterministic and is the sole authority for the refund outcome. The language model may extract a customer's claim and draft a response, but it must never choose or alter the outcome.

## Decision rules and precedence

Rules are evaluated in this exact order. Evaluation stops at the first terminal result; each evaluated rule and result is retained in the audit trace.

1. **Untrusted or inconsistent requests — ESCALATED.** Prompt-injection content, an unknown order, an order owned by another email, an already-refunded or cancelled order, three or more requests in the preceding 30 days, or a claim that conflicts with order item data requires human review. These integrity and safety checks take precedence over automatic approval or denial.
2. **Final sale — DENIED.** Refunds are not available for a final-sale order.
3. **Outside the return window — DENIED.** Delivery more than 30 days before the request is ineligible. A delivery exactly 30 days before the request remains within the window.
4. **High-value order — ESCALATED.** A refund total strictly greater than $500 requires human review. Exactly $500 is not high-value.
5. **Damaged or incorrect item — APPROVED.** If claimed within 30 days, for a non-final-sale order of $500 or less, and the named item matches an order item, approve.
6. **Change of mind — APPROVED.** If claimed within 30 days, for a non-final-sale order of $500 or less, and the claim is consistent with the order, approve.
7. **Unclear or unsupported claim — ESCALATED.** Claims that cannot be classified or evaluated safely require human review.

## Operational definitions

- The 30-day window is measured from the authoritative `deliveredAt` timestamp to request creation time, not from a date supplied in a message.
- Order, ownership, item, amount, delivery, final-sale, and refund-status facts come only from the database. The extracted order number is normalized to uppercase, looked up, and verified against the submitted email.
- The request limit counts all requests from the same normalized email in the rolling 30 days, including the current request. Three or more escalates.
- Injection detection is a safety signal, not a policy decision. A match is recorded and causes escalation.
- An LLM timeout, provider error, or invalid structured output uses deterministic extraction/reply fallbacks; the unchanged policy engine evaluates the extracted claim and does not infer an approval merely because generation failed.
- Administrators may resolve escalations manually. The original decision and trace remain in the audit log.