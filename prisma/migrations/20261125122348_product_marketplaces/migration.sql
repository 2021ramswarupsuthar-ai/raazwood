-- CreateEnum
CREATE TYPE "Marketplace" AS ENUM ('AMAZON', 'FLIPKART', 'MEESHO');

-- CreateTable
CREATE TABLE "ProductMarketplace" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "platform" "Marketplace" NOT NULL,
    "url" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductMarketplace_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductMarketplace_productId_platform_key" ON "ProductMarketplace"("productId", "platform");

-- AddForeignKey
ALTER TABLE "ProductMarketplace" ADD CONSTRAINT "ProductMarketplace_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
