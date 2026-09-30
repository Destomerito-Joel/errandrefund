CREATE TYPE "Decision" AS ENUM ('APPROVED', 'DENIED', 'ESCALATED');
CREATE TYPE "RequestStatus" AS ENUM ('OPEN', 'RESOLVED');
CREATE TYPE "OrderStatus" AS ENUM ('DELIVERED', 'REFUNDED', 'CANCELLED');

CREATE TABLE "Customer" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "orderNumber" TEXT NOT NULL,
  "items" JSONB NOT NULL,
  "total" DECIMAL(10,2) NOT NULL,
  "deliveredAt" TIMESTAMP(3) NOT NULL,
  "finalSale" BOOLEAN NOT NULL DEFAULT false,
  "status" "OrderStatus" NOT NULL DEFAULT 'DELIVERED',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "RefundRequest" (
  "id" TEXT NOT NULL,
  "customerEmail" TEXT NOT NULL,
  "orderNumber" TEXT,
  "message" TEXT NOT NULL,
  "decision" "Decision" NOT NULL,
  "reasonCodes" TEXT[] NOT NULL,
  "aiReply" TEXT NOT NULL,
  "flagged" BOOLEAN NOT NULL DEFAULT false,
  "status" "RequestStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "RefundRequest_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "refundRequestId" TEXT NOT NULL,
  "steps" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Customer_email_key" ON "Customer"("email");
CREATE UNIQUE INDEX "Order_orderNumber_key" ON "Order"("orderNumber");
CREATE INDEX "Order_customerId_deliveredAt_idx" ON "Order"("customerId", "deliveredAt");
CREATE INDEX "RefundRequest_decision_createdAt_idx" ON "RefundRequest"("decision", "createdAt");
CREATE INDEX "RefundRequest_customerEmail_createdAt_idx" ON "RefundRequest"("customerEmail", "createdAt");
CREATE INDEX "AuditLog_refundRequestId_createdAt_idx" ON "AuditLog"("refundRequestId", "createdAt");

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_refundRequestId_fkey" FOREIGN KEY ("refundRequestId") REFERENCES "RefundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;