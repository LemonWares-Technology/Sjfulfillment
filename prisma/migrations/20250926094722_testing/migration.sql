/*
  Warnings:

  - The primary key for the `_MerchantToWarehouseLocation` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - A unique constraint covering the columns `[A,B]` on the table `_MerchantToWarehouseLocation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "_MerchantToWarehouseLocation" DROP CONSTRAINT "_MerchantToWarehouseLocation_AB_pkey";

-- CreateIndex
CREATE UNIQUE INDEX "_MerchantToWarehouseLocation_AB_unique" ON "_MerchantToWarehouseLocation"("A", "B");
