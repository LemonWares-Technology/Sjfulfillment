/*
  Warnings:

  - The values [LOW_STOCK,ORDER_STATUS,PAYMENT_DUE,PERFORMANCE_SUMMARY,REFUND_UPDATE] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `data` on the `notifications` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `notifications` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT');

-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_DELIVERED', 'ORDER_CANCELLED', 'STOCK_LOW', 'STOCK_OUT', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'MERCHANT_REGISTERED', 'MERCHANT_APPROVED', 'MERCHANT_SUSPENDED', 'PAYMENT_RECEIVED', 'PAYMENT_FAILED', 'RETURN_REQUESTED', 'RETURN_APPROVED', 'RETURN_REJECTED', 'WAREHOUSE_ALERT', 'SYSTEM_ALERT', 'BILLING_ALERT', 'SUBSCRIPTION_EXPIRED', 'SUBSCRIPTION_RENEWED');
ALTER TABLE "notifications" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "NotificationType_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "notifications" DROP CONSTRAINT "notifications_userId_fkey";

-- AlterTable
ALTER TABLE "notifications" DROP COLUMN "data",
DROP COLUMN "userId",
ADD COLUMN     "isGlobal" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "priority" "NotificationPriority" NOT NULL DEFAULT 'MEDIUM',
ADD COLUMN     "readAt" TIMESTAMP(3),
ADD COLUMN     "recipientId" TEXT,
ADD COLUMN     "recipientRole" "UserRole";

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
