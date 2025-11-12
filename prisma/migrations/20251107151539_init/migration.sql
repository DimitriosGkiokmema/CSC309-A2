-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
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
    "token" TEXT,
    "createdAt" DATETIME NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "lastLogin" DATETIME
);
INSERT INTO "new_User" ("avatarUrl", "birthday", "createdAt", "email", "expiresAt", "id", "lastLogin", "name", "password", "points", "role", "suspicious", "token", "utorid", "verified") SELECT "avatarUrl", "birthday", "createdAt", "email", "expiresAt", "id", "lastLogin", "name", "password", "points", "role", "suspicious", "token", "utorid", "verified" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_utorid_key" ON "User"("utorid");
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
