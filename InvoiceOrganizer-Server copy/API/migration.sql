CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
    "MigrationId" TEXT NOT NULL CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY,
    "ProductVersion" TEXT NOT NULL
);

BEGIN TRANSACTION;
ALTER TABLE "Users" ADD "IsAdmin" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Users" ADD "PasswordHash" BLOB NOT NULL DEFAULT X'';

ALTER TABLE "Users" ADD "PasswordSalt" BLOB NOT NULL DEFAULT X'';

ALTER TABLE "Suppliers" ADD "UserId" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Invoices" ADD "UserId" INTEGER NOT NULL DEFAULT 0;

ALTER TABLE "Categories" ADD "UserId" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "IX_Suppliers_UserId" ON "Suppliers" ("UserId");

CREATE INDEX "IX_Invoices_UserId" ON "Invoices" ("UserId");

CREATE INDEX "IX_Categories_UserId" ON "Categories" ("UserId");

CREATE TABLE "ef_temp_Categories" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Categories" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "UserId" INTEGER NOT NULL,
    CONSTRAINT "FK_Categories_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Categories" ("Id", "Name", "UserId")
SELECT "Id", "Name", "UserId"
FROM "Categories";

CREATE TABLE "ef_temp_Invoices" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Invoices" PRIMARY KEY AUTOINCREMENT,
    "InvoiceDate" TEXT NOT NULL,
    "InvoiceNumber" INTEGER NOT NULL,
    "SupplierId" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    CONSTRAINT "FK_Invoices_Suppliers_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Invoices_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Invoices" ("Id", "InvoiceDate", "InvoiceNumber", "SupplierId", "UserId")
SELECT "Id", "InvoiceDate", "InvoiceNumber", "SupplierId", "UserId"
FROM "Invoices";

CREATE TABLE "ef_temp_Suppliers" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Suppliers" PRIMARY KEY AUTOINCREMENT,
    "Address" TEXT NULL,
    "ContactEmail" TEXT NULL,
    "Name" TEXT NOT NULL,
    "PhoneNumber" TEXT NULL,
    "SupNum" INTEGER NOT NULL,
    "UserId" INTEGER NOT NULL,
    CONSTRAINT "FK_Suppliers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Suppliers" ("Id", "Address", "ContactEmail", "Name", "PhoneNumber", "SupNum", "UserId")
SELECT "Id", "Address", "ContactEmail", "Name", "PhoneNumber", "SupNum", "UserId"
FROM "Suppliers";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Categories";

ALTER TABLE "ef_temp_Categories" RENAME TO "Categories";

DROP TABLE "Invoices";

ALTER TABLE "ef_temp_Invoices" RENAME TO "Invoices";

DROP TABLE "Suppliers";

ALTER TABLE "ef_temp_Suppliers" RENAME TO "Suppliers";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_Categories_UserId" ON "Categories" ("UserId");

CREATE INDEX "IX_Invoices_SupplierId" ON "Invoices" ("SupplierId");

CREATE INDEX "IX_Invoices_UserId" ON "Invoices" ("UserId");

CREATE INDEX "IX_Suppliers_UserId" ON "Suppliers" ("UserId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251103124151_AddUserId', '9.0.13');

BEGIN TRANSACTION;
ALTER TABLE "Invoices" ADD "FilePath" TEXT NULL;

ALTER TABLE "Invoices" ADD "Total" TEXT NOT NULL DEFAULT '0.0';

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251117094440_AddInvoiceTotal', '9.0.13');

CREATE TABLE "UploadedDocuments" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_UploadedDocuments" PRIMARY KEY AUTOINCREMENT,
    "FilePath" TEXT NOT NULL,
    "UploadedAt" TEXT NOT NULL,
    "UserId" INTEGER NOT NULL,
    "OcrStatus" TEXT NOT NULL,
    CONSTRAINT "FK_UploadedDocuments_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE INDEX "IX_UploadedDocuments_UserId" ON "UploadedDocuments" ("UserId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251124083240_AddUploadedDocument', '9.0.13');

ALTER TABLE "Users" ADD "Email" TEXT NOT NULL DEFAULT '';

CREATE TABLE "ef_temp_Users" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Users" PRIMARY KEY,
    "Email" TEXT NOT NULL,
    "IsAdmin" INTEGER NOT NULL,
    "PasswordHash" BLOB NOT NULL,
    "PasswordSalt" BLOB NOT NULL,
    "Username" TEXT NOT NULL
);

INSERT INTO "ef_temp_Users" ("Id", "Email", "IsAdmin", "PasswordHash", "PasswordSalt", "Username")
SELECT "Id", "Email", "IsAdmin", "PasswordHash", "PasswordSalt", "Username"
FROM "Users";

CREATE TABLE "ef_temp_UploadedDocuments" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_UploadedDocuments" PRIMARY KEY AUTOINCREMENT,
    "FilePath" TEXT NOT NULL,
    "OcrStatus" TEXT NOT NULL,
    "UploadedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_UploadedDocuments_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_UploadedDocuments" ("Id", "FilePath", "OcrStatus", "UploadedAt", "UserId")
SELECT "Id", "FilePath", "OcrStatus", "UploadedAt", "UserId"
FROM "UploadedDocuments";

CREATE TABLE "ef_temp_Suppliers" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Suppliers" PRIMARY KEY AUTOINCREMENT,
    "Address" TEXT NULL,
    "ContactEmail" TEXT NULL,
    "Name" TEXT NOT NULL,
    "PhoneNumber" TEXT NULL,
    "SupNum" INTEGER NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Suppliers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Suppliers" ("Id", "Address", "ContactEmail", "Name", "PhoneNumber", "SupNum", "UserId")
SELECT "Id", "Address", "ContactEmail", "Name", "PhoneNumber", "SupNum", "UserId"
FROM "Suppliers";

CREATE TABLE "ef_temp_Invoices" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Invoices" PRIMARY KEY AUTOINCREMENT,
    "FilePath" TEXT NULL,
    "InvoiceDate" TEXT NOT NULL,
    "InvoiceNumber" INTEGER NOT NULL,
    "SupplierId" INTEGER NOT NULL,
    "Total" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Invoices_Suppliers_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Invoices_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Invoices" ("Id", "FilePath", "InvoiceDate", "InvoiceNumber", "SupplierId", "Total", "UserId")
SELECT "Id", "FilePath", "InvoiceDate", "InvoiceNumber", "SupplierId", "Total", "UserId"
FROM "Invoices";

CREATE TABLE "ef_temp_Categories" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Categories" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Categories_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Categories" ("Id", "Name", "UserId")
SELECT "Id", "Name", "UserId"
FROM "Categories";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Users";

ALTER TABLE "ef_temp_Users" RENAME TO "Users";

DROP TABLE "UploadedDocuments";

ALTER TABLE "ef_temp_UploadedDocuments" RENAME TO "UploadedDocuments";

DROP TABLE "Suppliers";

ALTER TABLE "ef_temp_Suppliers" RENAME TO "Suppliers";

DROP TABLE "Invoices";

ALTER TABLE "ef_temp_Invoices" RENAME TO "Invoices";

DROP TABLE "Categories";

ALTER TABLE "ef_temp_Categories" RENAME TO "Categories";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_UploadedDocuments_UserId" ON "UploadedDocuments" ("UserId");

CREATE INDEX "IX_Suppliers_UserId" ON "Suppliers" ("UserId");

CREATE INDEX "IX_Invoices_SupplierId" ON "Invoices" ("SupplierId");

CREATE INDEX "IX_Invoices_UserId" ON "Invoices" ("UserId");

CREATE INDEX "IX_Categories_UserId" ON "Categories" ("UserId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20251124105156_AddEmailToUserAndChangeIDToString', '9.0.13');

BEGIN TRANSACTION;
CREATE TABLE "Suppliers" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Suppliers" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "SupNum" INTEGER NOT NULL,
    "ContactEmail" TEXT NULL,
    "PhoneNumber" TEXT NULL,
    "Address" TEXT NULL,
    "UserId" TEXT NOT NULL
);

CREATE TABLE "Users" (
    "Id" TEXT NOT NULL CONSTRAINT "PK_Users" PRIMARY KEY,
    "Username" TEXT NOT NULL,
    "Email" TEXT NOT NULL,
    "PasswordHash" BLOB NOT NULL,
    "PasswordSalt" BLOB NOT NULL,
    "IsAdmin" INTEGER NOT NULL
);

CREATE TABLE "Categories" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Categories" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "UserId" TEXT NULL,
    CONSTRAINT "FK_Categories_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id")
);

CREATE TABLE "Invoices" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Invoices" PRIMARY KEY AUTOINCREMENT,
    "InvoiceNumber" INTEGER NOT NULL,
    "InvoiceDate" TEXT NOT NULL,
    "FilePath" TEXT NULL,
    "SupplierId" INTEGER NOT NULL,
    "UserId" TEXT NOT NULL,
    "Total" TEXT NOT NULL,
    CONSTRAINT "FK_Invoices_Suppliers_SupplierId" FOREIGN KEY ("SupplierId") REFERENCES "Suppliers" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_Invoices_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "UploadedDocuments" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_UploadedDocuments" PRIMARY KEY AUTOINCREMENT,
    "FilePath" TEXT NOT NULL,
    "UploadedAt" TEXT NOT NULL,
    "UserId" TEXT NOT NULL,
    "OcrStatus" TEXT NOT NULL,
    CONSTRAINT "FK_UploadedDocuments_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

CREATE TABLE "InvoiceItems" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_InvoiceItems" PRIMARY KEY AUTOINCREMENT,
    "Name" TEXT NOT NULL,
    "Price" TEXT NOT NULL,
    "Quantity" INTEGER NOT NULL,
    "CategoryId" INTEGER NOT NULL,
    "InvoiceId" INTEGER NOT NULL,
    CONSTRAINT "FK_InvoiceItems_Categories_CategoryId" FOREIGN KEY ("CategoryId") REFERENCES "Categories" ("Id") ON DELETE CASCADE,
    CONSTRAINT "FK_InvoiceItems_Invoices_InvoiceId" FOREIGN KEY ("InvoiceId") REFERENCES "Invoices" ("Id") ON DELETE CASCADE
);

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (1, 'ציוד משרדי', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (2, 'מזון וכיבוד', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (3, 'חשמל ואלקטרוניקה', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (4, 'תחזוקה וניקיון', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (5, 'שונות', NULL);
SELECT changes();


CREATE INDEX "IX_Categories_UserId" ON "Categories" ("UserId");

CREATE INDEX "IX_InvoiceItems_CategoryId" ON "InvoiceItems" ("CategoryId");

CREATE INDEX "IX_InvoiceItems_InvoiceId" ON "InvoiceItems" ("InvoiceId");

CREATE INDEX "IX_Invoices_SupplierId" ON "Invoices" ("SupplierId");

CREATE INDEX "IX_Invoices_UserId" ON "Invoices" ("UserId");

CREATE INDEX "IX_UploadedDocuments_UserId" ON "UploadedDocuments" ("UserId");

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260128151505_InitialCreate', '9.0.13');

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (6, 'office', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (7, 'food', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (8, 'electric', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (9, 'cleaning', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (10, 'maintenance', NULL);
SELECT changes();

INSERT INTO "Categories" ("Id", "Name", "UserId")
VALUES (11, 'others', NULL);
SELECT changes();


INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260201113912_SeedCategoriesFixed', '9.0.13');

DELETE FROM "Categories"
WHERE "Id" = 1;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 2;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 3;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 4;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 5;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 6;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 7;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 8;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 9;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 10;
SELECT changes();


DELETE FROM "Categories"
WHERE "Id" = 11;
SELECT changes();


CREATE INDEX "IX_Suppliers_UserId" ON "Suppliers" ("UserId");

CREATE TABLE "ef_temp_Suppliers" (
    "Id" INTEGER NOT NULL CONSTRAINT "PK_Suppliers" PRIMARY KEY AUTOINCREMENT,
    "Address" TEXT NULL,
    "ContactEmail" TEXT NULL,
    "Name" TEXT NOT NULL,
    "PhoneNumber" TEXT NULL,
    "SupNum" INTEGER NOT NULL,
    "UserId" TEXT NOT NULL,
    CONSTRAINT "FK_Suppliers_Users_UserId" FOREIGN KEY ("UserId") REFERENCES "Users" ("Id") ON DELETE CASCADE
);

INSERT INTO "ef_temp_Suppliers" ("Id", "Address", "ContactEmail", "Name", "PhoneNumber", "SupNum", "UserId")
SELECT "Id", "Address", "ContactEmail", "Name", "PhoneNumber", "SupNum", "UserId"
FROM "Suppliers";

COMMIT;

PRAGMA foreign_keys = 0;

BEGIN TRANSACTION;
DROP TABLE "Suppliers";

ALTER TABLE "ef_temp_Suppliers" RENAME TO "Suppliers";

COMMIT;

PRAGMA foreign_keys = 1;

BEGIN TRANSACTION;
CREATE INDEX "IX_Suppliers_UserId" ON "Suppliers" ("UserId");

COMMIT;

INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
VALUES ('20260217175835_AllowNullUserIdInCategories', '9.0.13');

