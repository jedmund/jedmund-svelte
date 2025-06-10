-- Create a table to track database initialization
CREATE TABLE IF NOT EXISTS "_db_initialization" (
    "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1,
    "initialized_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    CONSTRAINT "_db_initialization_id_check" CHECK (id = 1)
);