-- AlterTable
ALTER TABLE "FishSpecies" ADD COLUMN "diet" JSONB;

-- AlterTable
ALTER TABLE "FishingSession" ADD COLUMN "groundbaitItemId" TEXT;
ALTER TABLE "FishingSession" ADD COLUMN "retrieve" TEXT;
ALTER TABLE "FishingSession" ADD COLUMN "playerHint" TEXT;

-- AlterTable
ALTER TABLE "InventoryItem" ADD COLUMN "freshness" DOUBLE PRECISION NOT NULL DEFAULT 1;
ALTER TABLE "InventoryItem" ADD COLUMN "liveliness" DOUBLE PRECISION;
ALTER TABLE "InventoryItem" ADD COLUMN "harvestedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Catch" ADD COLUMN "retrieve" TEXT;

-- CreateTable
CREATE TABLE "FeedingSpot" (
    "id" TEXT NOT NULL,
    "waterbodyId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "mixItemId" TEXT NOT NULL,
    "intensity" DOUBLE PRECISION NOT NULL,
    "nutritionalValue" DOUBLE PRECISION NOT NULL,
    "attraction" DOUBLE PRECISION NOT NULL,
    "saturation" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL,
    "peakAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "current" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "FeedingSpot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpotPressure" (
    "spotId" TEXT NOT NULL,
    "pressure" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "castCount" INTEGER NOT NULL DEFAULT 0,
    "lastCastAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SpotPressure_pkey" PRIMARY KEY ("spotId")
);

-- CreateTable
CREATE TABLE "BaitHarvestPatch" (
    "id" TEXT NOT NULL,
    "waterbodyId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "soilType" TEXT NOT NULL,
    "biotope" TEXT NOT NULL,
    "currentStock" DOUBLE PRECISION NOT NULL,
    "maxStock" DOUBLE PRECISION NOT NULL,
    "regenerationPerHour" DOUBLE PRECISION NOT NULL,
    "qualityPotential" DOUBLE PRECISION NOT NULL,
    "requiredSkill" INTEGER NOT NULL,
    "tools" JSONB NOT NULL,
    "seasons" JSONB NOT NULL,
    "yields" JSONB NOT NULL,
    "weatherBonus" JSONB NOT NULL,
    "lastHarvestAt" TIMESTAMP(3),
    "stockUpdatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "depletion" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "BaitHarvestPatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedingSpot_spotId_expiresAt_idx" ON "FeedingSpot"("spotId", "expiresAt");

-- CreateIndex
CREATE UNIQUE INDEX "BaitHarvestPatch_waterbodyId_slug_key" ON "BaitHarvestPatch"("waterbodyId", "slug");

-- AddForeignKey
ALTER TABLE "FeedingSpot" ADD CONSTRAINT "FeedingSpot_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotPressure" ADD CONSTRAINT "SpotPressure_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
