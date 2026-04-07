-- AlterTable
ALTER TABLE "Person" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- CreateIndex
CREATE INDEX "Person_created_at_id_idx" ON "Person"("created_at" DESC, "id" DESC);
