-- CreateEnum
CREATE TYPE "Sex" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "FishTier" AS ENUM ('COMMON', 'LARGE', 'TROPHY', 'RECORD', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "FishingMethod" AS ENUM ('FLOAT', 'SPINNING', 'FEEDER', 'BOTTOM', 'CARP', 'TROLLING', 'SEA', 'ICE');

-- CreateEnum
CREATE TYPE "FishingState" AS ENUM ('IDLE', 'READY', 'CAST', 'WAITING_BITE', 'BITE', 'HOOKED', 'FIGHTING', 'LANDED', 'LOST', 'BROKEN');

-- CreateEnum
CREATE TYPE "ItemKind" AS ENUM ('ROD', 'REEL', 'LINE', 'HOOK', 'FLOAT', 'SINKER', 'LEADER', 'FEEDER', 'BAIT', 'LURE', 'CLOTHING', 'TENT', 'FOOD', 'DRINK', 'TOOL', 'MATERIAL', 'CONSUMABLE', 'BOAT', 'VEHICLE', 'COSMETIC', 'RECIPE');

-- CreateEnum
CREATE TYPE "Rarity" AS ENUM ('COMMON', 'UNCOMMON', 'RARE', 'EPIC', 'LEGENDARY');

-- CreateEnum
CREATE TYPE "TimeOfDay" AS ENUM ('DAWN', 'MORNING', 'DAY', 'EVENING', 'DUSK', 'NIGHT');

-- CreateEnum
CREATE TYPE "Season" AS ENUM ('SPRING', 'SUMMER', 'AUTUMN', 'WINTER');

-- CreateEnum
CREATE TYPE "WeatherKind" AS ENUM ('CLEAR', 'PARTLY_CLOUDY', 'OVERCAST', 'RAIN', 'DOWNPOUR', 'STORM', 'FOG', 'WIND', 'CALM', 'SNOW');

-- CreateEnum
CREATE TYPE "SkillId" AS ENUM ('FLOAT', 'SPINNING', 'FEEDER', 'BOTTOM', 'CARP', 'TROLLING', 'ICE', 'SEA', 'ACCURACY', 'CAST_RANGE', 'HOOKING', 'DRAG_CONTROL', 'FIGHTING', 'BIG_FISH', 'RELIEF', 'SONAR', 'WEATHER_READ', 'NAVIGATION', 'SEARCH', 'REPAIR', 'RIGS', 'GROUNDBAIT', 'BOILIES', 'LURES', 'BAIT_HARVEST', 'COOKING', 'CAMP', 'TRANSPORT');

-- CreateEnum
CREATE TYPE "ClubRole" AS ENUM ('OWNER', 'DEPUTY', 'CAPTAIN', 'MODERATOR', 'MEMBER');

-- CreateEnum
CREATE TYPE "QuestKind" AS ENUM ('DAILY', 'WEEKLY', 'REGIONAL', 'STORY', 'CRAFT', 'CLUB', 'SEASON', 'EXPEDITION');

-- CreateEnum
CREATE TYPE "ShopKind" AS ENUM ('TACKLE', 'LURE', 'BAIT', 'GROUNDBAIT', 'WORKSHOP', 'BOAT', 'CLOTHING', 'CAMP', 'GROCERY');

-- CreateEnum
CREATE TYPE "ChatChannel" AS ENUM ('GLOBAL', 'WATERBODY', 'CLUB', 'TOURNAMENT', 'DIRECT');

-- CreateEnum
CREATE TYPE "TransactionKind" AS ENUM ('CATCH_SALE', 'SHOP_BUY', 'SHOP_SELL', 'QUEST_REWARD', 'TOURNAMENT_REWARD', 'PREMIUM_GRANT', 'ADMIN_COMPENSATION', 'CRAFT', 'AUCTION', 'CLUB');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "nicknameSet" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "lastSeenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "User" ADD COLUMN "isAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "mutedUntil" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN "bannedUntil" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Character" (
    "userId" TEXT NOT NULL,
    "sex" "Sex" NOT NULL DEFAULT 'OTHER',
    "faceType" TEXT NOT NULL DEFAULT 'oval',
    "ageArchetype" TEXT NOT NULL DEFAULT 'adult',
    "skinTone" TEXT NOT NULL DEFAULT 'warm',
    "hairStyle" TEXT NOT NULL DEFAULT 'short',
    "hairColor" TEXT NOT NULL DEFAULT 'brown',
    "facialHair" TEXT NOT NULL DEFAULT 'none',
    "hat" TEXT NOT NULL DEFAULT 'none',
    "outfit" TEXT NOT NULL DEFAULT 'starter',

    CONSTRAINT "Character_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "userId" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "coins" INTEGER NOT NULL DEFAULT 250,
    "specialization" TEXT NOT NULL DEFAULT 'universal',
    "title" TEXT NOT NULL DEFAULT 'Новичок',
    "division" TEXT NOT NULL DEFAULT 'novice',
    "health" INTEGER NOT NULL DEFAULT 100,
    "stamina" INTEGER NOT NULL DEFAULT 100,
    "hunger" INTEGER NOT NULL DEFAULT 20,
    "thirst" INTEGER NOT NULL DEFAULT 20,
    "warmth" INTEGER NOT NULL DEFAULT 70,
    "wetness" INTEGER NOT NULL DEFAULT 0,
    "fatigue" INTEGER NOT NULL DEFAULT 0,
    "keepnetCount" INTEGER NOT NULL DEFAULT 0,
    "keepnetWeightG" INTEGER NOT NULL DEFAULT 0,
    "keepnetCap" INTEGER NOT NULL DEFAULT 8,
    "keepnetWeightCap" INTEGER NOT NULL DEFAULT 8000,
    "explorationPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "premiumXpBoost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "premiumCoinBoost" DOUBLE PRECISION NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("userId")
);

-- CreateTable
CREATE TABLE "PlayerSkill" (
    "userId" TEXT NOT NULL,
    "skill" "SkillId" NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "PlayerSkill_pkey" PRIMARY KEY ("userId","skill")
);

-- CreateTable
CREATE TABLE "PlayerPerk" (
    "userId" TEXT NOT NULL,
    "perkId" TEXT NOT NULL,
    "skill" "SkillId" NOT NULL,
    "tier" INTEGER NOT NULL,
    "selectedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlayerPerk_pkey" PRIMARY KEY ("userId","perkId")
);

-- CreateTable
CREATE TABLE "Waterbody" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "minLevel" INTEGER NOT NULL DEFAULT 1,
    "exploration" JSONB NOT NULL,
    "visual" JSONB NOT NULL,
    "seasonality" JSONB NOT NULL,

    CONSTRAINT "Waterbody_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Spot" (
    "id" TEXT NOT NULL,
    "waterbodyId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "depthMinM" DOUBLE PRECISION NOT NULL,
    "depthMaxM" DOUBLE PRECISION NOT NULL,
    "current" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "vegetation" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "trophyChance" DOUBLE PRECISION NOT NULL DEFAULT 0.08,
    "secret" BOOLEAN NOT NULL DEFAULT false,
    "unlock" JSONB,
    "methods" "FishingMethod"[],

    CONSTRAINT "Spot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FishSpecies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "minWeightG" INTEGER NOT NULL,
    "avgWeightG" INTEGER NOT NULL,
    "maxWeightG" INTEGER NOT NULL,
    "minLengthCm" INTEGER NOT NULL,
    "maxLengthCm" INTEGER NOT NULL,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "trophyWeightG" INTEGER NOT NULL,
    "recordWeightG" INTEGER NOT NULL,
    "baseXp" INTEGER NOT NULL,
    "baseValue" INTEGER NOT NULL,
    "fightProfile" JSONB NOT NULL,
    "activity" JSONB NOT NULL,
    "baits" JSONB NOT NULL,
    "lures" JSONB NOT NULL,
    "behavior" TEXT NOT NULL,
    "legendary" BOOLEAN NOT NULL DEFAULT false,
    "legendaryLore" TEXT,

    CONSTRAINT "FishSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WaterbodySpecies" (
    "waterbodyId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "abundance" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "WaterbodySpecies_pkey" PRIMARY KEY ("waterbodyId","speciesId")
);

-- CreateTable
CREATE TABLE "SpotSpecies" (
    "spotId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "SpotSpecies_pkey" PRIMARY KEY ("spotId","speciesId")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "kind" "ItemKind" NOT NULL,
    "rarity" "Rarity" NOT NULL DEFAULT 'COMMON',
    "stackable" BOOLEAN NOT NULL DEFAULT true,
    "maxStack" INTEGER NOT NULL DEFAULT 99,
    "value" INTEGER NOT NULL DEFAULT 10,
    "stats" JSONB NOT NULL,
    "cosmetic" BOOLEAN NOT NULL DEFAULT false,
    "p2w" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryItem" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,
    "durability" INTEGER,
    "quality" TEXT NOT NULL DEFAULT 'normal',
    "equipped" BOOLEAN NOT NULL DEFAULT false,
    "slot" TEXT,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shop" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "ShopKind" NOT NULL,
    "region" TEXT NOT NULL DEFAULT 'forest',
    "reputationMin" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Shop_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShopOffer" (
    "id" TEXT NOT NULL,
    "shopId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "price" INTEGER NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT -1,
    "featured" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "ShopOffer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Recipe" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "station" TEXT NOT NULL,
    "skill" "SkillId",
    "minSkill" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecipeIngredient" (
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,

    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("recipeId","itemId")
);

-- CreateTable
CREATE TABLE "RecipeOutput" (
    "recipeId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "qty" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "RecipeOutput_pkey" PRIMARY KEY ("recipeId","itemId")
);

-- CreateTable
CREATE TABLE "FishingSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "waterbodyId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "method" "FishingMethod" NOT NULL,
    "state" "FishingState" NOT NULL DEFAULT 'READY',
    "rodItemId" TEXT,
    "reelItemId" TEXT,
    "lineItemId" TEXT,
    "baitItemId" TEXT,
    "lureItemId" TEXT,
    "castForce" DOUBLE PRECISION,
    "castDir" DOUBLE PRECISION,
    "depthM" DOUBLE PRECISION,
    "speciesId" TEXT,
    "weightG" INTEGER,
    "lengthCm" INTEGER,
    "tier" "FishTier",
    "tension" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "fishStamina" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "lineIntegrity" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "fightProgress" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "biteAt" TIMESTAMP(3),
    "hookedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),
    "loseReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FishingSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Catch" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "waterbodyId" TEXT NOT NULL,
    "spotId" TEXT NOT NULL,
    "weightG" INTEGER NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "tier" "FishTier" NOT NULL,
    "method" "FishingMethod" NOT NULL,
    "rodItemId" TEXT,
    "baitItemId" TEXT,
    "lureItemId" TEXT,
    "weather" "WeatherKind" NOT NULL,
    "timeOfDay" "TimeOfDay" NOT NULL,
    "season" "Season" NOT NULL,
    "depthM" DOUBLE PRECISION NOT NULL,
    "xpGranted" INTEGER NOT NULL,
    "coinsGranted" INTEGER NOT NULL DEFAULT 0,
    "kept" BOOLEAN NOT NULL,
    "recordFlags" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Catch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DiaryEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "catchId" TEXT,
    "summary" TEXT NOT NULL,
    "details" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiaryEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EncyclopediaUnlock" (
    "userId" TEXT NOT NULL,
    "speciesId" TEXT NOT NULL,
    "fields" JSONB NOT NULL,

    CONSTRAINT "EncyclopediaUnlock_pkey" PRIMARY KEY ("userId","speciesId")
);

-- CreateTable
CREATE TABLE "RecordEntry" (
    "id" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "speciesId" TEXT,
    "waterbodyId" TEXT,
    "userId" TEXT NOT NULL,
    "catchId" TEXT NOT NULL,
    "weightG" INTEGER NOT NULL,
    "heldFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "previousUserId" TEXT,

    CONSTRAINT "RecordEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Npc" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "waterbodyId" TEXT,
    "greeting" TEXT NOT NULL,
    "rumors" JSONB NOT NULL,

    CONSTRAINT "Npc_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quest" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "npcId" TEXT,
    "kind" "QuestKind" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "objectives" JSONB NOT NULL,
    "rewards" JSONB NOT NULL,

    CONSTRAINT "Quest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QuestProgress" (
    "userId" TEXT NOT NULL,
    "questId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" JSONB NOT NULL,

    CONSTRAINT "QuestProgress_pkey" PRIMARY KEY ("userId","questId")
);

-- CreateTable
CREATE TABLE "FaunaSpecies" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "rare" BOOLEAN NOT NULL DEFAULT false,
    "dangerous" BOOLEAN NOT NULL DEFAULT false,
    "hint" TEXT,

    CONSTRAINT "FaunaSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaunaSpawn" (
    "faunaId" TEXT NOT NULL,
    "waterbodyId" TEXT NOT NULL,
    "abundance" DOUBLE PRECISION NOT NULL DEFAULT 1,

    CONSTRAINT "FaunaSpawn_pkey" PRIMARY KEY ("faunaId","waterbodyId")
);

-- CreateTable
CREATE TABLE "WorldClock" (
    "id" TEXT NOT NULL DEFAULT 'global',
    "season" "Season" NOT NULL DEFAULT 'SUMMER',
    "dayOfYear" INTEGER NOT NULL DEFAULT 180,
    "minutes" INTEGER NOT NULL DEFAULT 480,
    "weather" "WeatherKind" NOT NULL DEFAULT 'CLEAR',
    "temperatureC" DOUBLE PRECISION NOT NULL DEFAULT 18,
    "waterTempC" DOUBLE PRECISION NOT NULL DEFAULT 16,
    "pressureHpa" DOUBLE PRECISION NOT NULL DEFAULT 1013,
    "windKmh" DOUBLE PRECISION NOT NULL DEFAULT 6,
    "waterClarity" DOUBLE PRECISION NOT NULL DEFAULT 0.7,
    "moonPhase" DOUBLE PRECISION NOT NULL DEFAULT 0.4,
    "eventFlags" JSONB NOT NULL DEFAULT '{}',
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorldClock_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorldEvent" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "waterbodyId" TEXT,
    "kind" TEXT NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "modifiers" JSONB NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "WorldEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "emblem" TEXT NOT NULL DEFAULT 'anchor',
    "description" TEXT NOT NULL DEFAULT '',
    "level" INTEGER NOT NULL DEFAULT 1,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClubMember" (
    "clubId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ClubRole" NOT NULL DEFAULT 'MEMBER',
    "clubXp" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ClubMember_pkey" PRIMARY KEY ("clubId","userId")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "channel" "ChatChannel" NOT NULL,
    "roomId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "system" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatReport" (
    "id" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Friendship" (
    "ownerId" TEXT NOT NULL,
    "friendId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("ownerId","friendId")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "fair" BOOLEAN NOT NULL DEFAULT false,
    "waterbodyId" TEXT,
    "speciesId" TEXT,
    "method" "FishingMethod",
    "startsAt" TIMESTAMP(3) NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,
    "rewards" JSONB NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TournamentEntry" (
    "tournamentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "bestWeightG" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "TournamentEntry_pkey" PRIMARY KEY ("tournamentId","userId")
);

-- CreateTable
CREATE TABLE "PremiumGrant" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "days" INTEGER NOT NULL,
    "xpBoost" DOUBLE PRECISION NOT NULL DEFAULT 0.2,
    "coinBoost" DOUBLE PRECISION NOT NULL DEFAULT 0.1,
    "startsAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PremiumGrant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerEntry" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "TransactionKind" NOT NULL,
    "delta" INTEGER NOT NULL,
    "balance" INTEGER NOT NULL,
    "meta" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LedgerEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "action" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_nickname_key" ON "User"("nickname");

-- CreateIndex
CREATE UNIQUE INDEX "Waterbody_slug_key" ON "Waterbody"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Spot_waterbodyId_slug_key" ON "Spot"("waterbodyId", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "FishSpecies_slug_key" ON "FishSpecies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Item_slug_key" ON "Item"("slug");

-- CreateIndex
CREATE INDEX "InventoryItem_userId_itemId_idx" ON "InventoryItem"("userId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Shop_slug_key" ON "Shop"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ShopOffer_shopId_itemId_key" ON "ShopOffer"("shopId", "itemId");

-- CreateIndex
CREATE UNIQUE INDEX "Recipe_slug_key" ON "Recipe"("slug");

-- CreateIndex
CREATE INDEX "FishingSession_userId_state_idx" ON "FishingSession"("userId", "state");

-- CreateIndex
CREATE INDEX "Catch_userId_createdAt_idx" ON "Catch"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Catch_speciesId_weightG_idx" ON "Catch"("speciesId", "weightG");

-- CreateIndex
CREATE INDEX "RecordEntry_scope_speciesId_waterbodyId_idx" ON "RecordEntry"("scope", "speciesId", "waterbodyId");

-- CreateIndex
CREATE UNIQUE INDEX "Npc_slug_key" ON "Npc"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Quest_slug_key" ON "Quest"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "FaunaSpecies_slug_key" ON "FaunaSpecies"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Club_name_key" ON "Club"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Club_tag_key" ON "Club"("tag");

-- CreateIndex
CREATE UNIQUE INDEX "ClubMember_userId_key" ON "ClubMember"("userId");

-- CreateIndex
CREATE INDEX "ChatMessage_channel_roomId_createdAt_idx" ON "ChatMessage"("channel", "roomId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_slug_key" ON "Tournament"("slug");

-- CreateIndex
CREATE INDEX "LedgerEntry_userId_createdAt_idx" ON "LedgerEntry"("userId", "createdAt");

-- AddForeignKey
ALTER TABLE "Character" ADD CONSTRAINT "Character_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerSkill" ADD CONSTRAINT "PlayerSkill_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerPerk" ADD CONSTRAINT "PlayerPerk_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Spot" ADD CONSTRAINT "Spot_waterbodyId_fkey" FOREIGN KEY ("waterbodyId") REFERENCES "Waterbody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterbodySpecies" ADD CONSTRAINT "WaterbodySpecies_waterbodyId_fkey" FOREIGN KEY ("waterbodyId") REFERENCES "Waterbody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WaterbodySpecies" ADD CONSTRAINT "WaterbodySpecies_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "FishSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotSpecies" ADD CONSTRAINT "SpotSpecies_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpotSpecies" ADD CONSTRAINT "SpotSpecies_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "FishSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryItem" ADD CONSTRAINT "InventoryItem_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOffer" ADD CONSTRAINT "ShopOffer_shopId_fkey" FOREIGN KEY ("shopId") REFERENCES "Shop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopOffer" ADD CONSTRAINT "ShopOffer_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeOutput" ADD CONSTRAINT "RecipeOutput_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecipeOutput" ADD CONSTRAINT "RecipeOutput_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishingSession" ADD CONSTRAINT "FishingSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FishingSession" ADD CONSTRAINT "FishingSession_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catch" ADD CONSTRAINT "Catch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catch" ADD CONSTRAINT "Catch_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "FishSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catch" ADD CONSTRAINT "Catch_waterbodyId_fkey" FOREIGN KEY ("waterbodyId") REFERENCES "Waterbody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Catch" ADD CONSTRAINT "Catch_spotId_fkey" FOREIGN KEY ("spotId") REFERENCES "Spot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DiaryEntry" ADD CONSTRAINT "DiaryEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncyclopediaUnlock" ADD CONSTRAINT "EncyclopediaUnlock_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EncyclopediaUnlock" ADD CONSTRAINT "EncyclopediaUnlock_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "FishSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecordEntry" ADD CONSTRAINT "RecordEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Npc" ADD CONSTRAINT "Npc_waterbodyId_fkey" FOREIGN KEY ("waterbodyId") REFERENCES "Waterbody"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quest" ADD CONSTRAINT "Quest_npcId_fkey" FOREIGN KEY ("npcId") REFERENCES "Npc"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestProgress" ADD CONSTRAINT "QuestProgress_questId_fkey" FOREIGN KEY ("questId") REFERENCES "Quest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaunaSpawn" ADD CONSTRAINT "FaunaSpawn_faunaId_fkey" FOREIGN KEY ("faunaId") REFERENCES "FaunaSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaunaSpawn" ADD CONSTRAINT "FaunaSpawn_waterbodyId_fkey" FOREIGN KEY ("waterbodyId") REFERENCES "Waterbody"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorldEvent" ADD CONSTRAINT "WorldEvent_waterbodyId_fkey" FOREIGN KEY ("waterbodyId") REFERENCES "Waterbody"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClubMember" ADD CONSTRAINT "ClubMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatReport" ADD CONSTRAINT "ChatReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Friendship" ADD CONSTRAINT "Friendship_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentEntry" ADD CONSTRAINT "TournamentEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PremiumGrant" ADD CONSTRAINT "PremiumGrant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerEntry" ADD CONSTRAINT "LedgerEntry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

