ALTER TABLE "SourceConnection" ADD COLUMN "verifiedAt" TIMESTAMP(3);
ALTER TABLE "Product" ADD COLUMN "sourceUpdatedAt" TIMESTAMP(3), ADD COLUMN "sourceHash" TEXT, ADD COLUMN "sourceVisible" BOOLEAN NOT NULL DEFAULT true, ADD COLUMN "sourceMetadata" JSONB;
ALTER TABLE "Category" ADD COLUMN "sourceConnectionId" UUID, ADD COLUMN "sourceCategoryId" TEXT;
CREATE UNIQUE INDEX "Category_sourceConnectionId_sourceCategoryId_key" ON "Category"("sourceConnectionId", "sourceCategoryId");
ALTER TABLE "Category" ADD CONSTRAINT "Category_sourceConnectionId_fkey" FOREIGN KEY ("sourceConnectionId") REFERENCES "SourceConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductVariant" ADD COLUMN "availability" "ProductAvailability";
