-- CreateTable
CREATE TABLE "User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utorid" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "birthday" DATETIME,
    "role" TEXT,
    "points" INTEGER NOT NULL,
    "avatarUrl" TEXT,
    "suspicious" BOOLEAN NOT NULL,
    "verified" BOOLEAN NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastLogin" DATETIME
);

-- CreateTable
CREATE TABLE "Promotion" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'automatic',
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "isOneTime" BOOLEAN NOT NULL DEFAULT false,
    "minSpending" INTEGER,
    "rate" REAL,
    "points" INTEGER,
    "description" TEXT
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "utorid" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "spent" REAL NOT NULL DEFAULT 0,
    "earned" INTEGER,
    "amount" INTEGER NOT NULL DEFAULT 0,
    "remark" TEXT,
    "createdBy" TEXT NOT NULL,
    "relatedId" INTEGER,
    "eventId" INTEGER,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedBy" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "suspicious" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "Event" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "startTime" DATETIME NOT NULL,
    "endTime" DATETIME NOT NULL,
    "capacity" INTEGER,
    "pointsRemain" INTEGER NOT NULL,
    "pointsAwarded" INTEGER NOT NULL,
    "published" BOOLEAN NOT NULL
);

-- CreateTable
CREATE TABLE "Usage" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "promotionId" INTEGER NOT NULL,
    CONSTRAINT "Usage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Usage_promotionId_fkey" FOREIGN KEY ("promotionId") REFERENCES "Promotion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_PromotionToTransaction" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_PromotionToTransaction_A_fkey" FOREIGN KEY ("A") REFERENCES "Promotion" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_PromotionToTransaction_B_fkey" FOREIGN KEY ("B") REFERENCES "Transaction" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_eventOrganizer" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_eventOrganizer_A_fkey" FOREIGN KEY ("A") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_eventOrganizer_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_eventGuest" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,
    CONSTRAINT "_eventGuest_A_fkey" FOREIGN KEY ("A") REFERENCES "Event" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_eventGuest_B_fkey" FOREIGN KEY ("B") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_utorid_key" ON "User"("utorid");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "_PromotionToTransaction_AB_unique" ON "_PromotionToTransaction"("A", "B");

-- CreateIndex
CREATE INDEX "_PromotionToTransaction_B_index" ON "_PromotionToTransaction"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_eventOrganizer_AB_unique" ON "_eventOrganizer"("A", "B");

-- CreateIndex
CREATE INDEX "_eventOrganizer_B_index" ON "_eventOrganizer"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_eventGuest_AB_unique" ON "_eventGuest"("A", "B");

-- CreateIndex
CREATE INDEX "_eventGuest_B_index" ON "_eventGuest"("B");
