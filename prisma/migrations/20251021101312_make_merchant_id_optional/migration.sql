-- DropForeignKey
ALTER TABLE "products" DROP CONSTRAINT "products_merchantId_fkey";

-- AlterTable
ALTER TABLE "products" ALTER COLUMN "merchantId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "merchants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
