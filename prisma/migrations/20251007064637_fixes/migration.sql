/*
  Warnings:

  - The values [INITIATED,REFUNDED] on the enum `ReturnStatus` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[viberId]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "RefundReason" AS ENUM ('ORDER_CANCELLED', 'PRODUCT_DEFECTIVE', 'WRONG_ITEM_SENT', 'DELIVERY_DELAYED', 'CUSTOMER_REJECTED', 'PAYMENT_ISSUE', 'OTHER');

-- CreateEnum
CREATE TYPE "RefundStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED');

-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'REFUND_UPDATE';

-- AlterEnum
BEGIN;
CREATE TYPE "ReturnStatus_new" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'PROCESSED', 'RESTOCKED');
ALTER TABLE "returns" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "returns" ALTER COLUMN "status" TYPE "ReturnStatus_new" USING ("status"::text::"ReturnStatus_new");
ALTER TYPE "ReturnStatus" RENAME TO "ReturnStatus_old";
ALTER TYPE "ReturnStatus_new" RENAME TO "ReturnStatus";
DROP TYPE "ReturnStatus_old";
ALTER TABLE "returns" ALTER COLUMN "status" SET DEFAULT 'PENDING';
COMMIT;

-- AlterTable
ALTER TABLE "returns" ADD COLUMN     "approvedAmount" DECIMAL(10,2),
ADD COLUMN     "processedAt" TIMESTAMP(3),
ADD COLUMN     "rejectionReason" TEXT,
ADD COLUMN     "requestedBy" TEXT,
ALTER COLUMN "status" SET DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "backupCodes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "twoFactorSecret" TEXT,
ADD COLUMN     "viberId" TEXT,
ADD COLUMN     "viberLastActive" TIMESTAMP(3),
ADD COLUMN     "viberSubscribed" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "refund_requests" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "requestedBy" TEXT NOT NULL,
    "reason" "RefundReason" NOT NULL,
    "description" TEXT,
    "requestedAmount" DECIMAL(10,2) NOT NULL,
    "status" "RefundStatus" NOT NULL DEFAULT 'PENDING',
    "approvedAmount" DECIMAL(10,2),
    "processedBy" TEXT,
    "processedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_viberId_key" ON "users"("viberId");

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "returns" ADD CONSTRAINT "returns_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requestedBy_fkey" FOREIGN KEY ("requestedBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_processedBy_fkey" FOREIGN KEY ("processedBy") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
