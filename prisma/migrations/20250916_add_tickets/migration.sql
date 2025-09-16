-- Migration: add tickets and ticket_products models and enums

-- Create enums
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticketcategory') THEN
        CREATE TYPE "TicketCategory" AS ENUM ('refund','replacement','mixed','general');
    END IF;
END$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticketstatus') THEN
        CREATE TYPE "TicketStatus" AS ENUM ('open','in_progress','closed');
    END IF;
END$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticketresolutionstatus') THEN
        CREATE TYPE "TicketResolutionStatus" AS ENUM ('resolved','unresolved');
    END IF;
END$$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ticketproductaction') THEN
        CREATE TYPE "TicketProductAction" AS ENUM ('Refund','Replacement');
    END IF;
END$$;

-- Create tickets table
CREATE TABLE IF NOT EXISTS "tickets" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL UNIQUE,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "userId" INTEGER,
  "orderId" INTEGER,
  "category" "TicketCategory" NOT NULL,
  "status" "TicketStatus" NOT NULL,
  "resolutionStatus" "TicketResolutionStatus" NOT NULL,
  "priority" TEXT NOT NULL,
  "estimatedResponse" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create ticket_products table
CREATE TABLE IF NOT EXISTS "ticket_products" (
  "id" TEXT PRIMARY KEY,
  "ticketId" TEXT NOT NULL,
  "productId" INTEGER NOT NULL,
  "productName" TEXT NOT NULL,
  "action" "TicketProductAction" NOT NULL,
  "createdAt" TIMESTAMP(3) WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT fk_ticket FOREIGN KEY("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_ticket_products_ticketId ON "ticket_products" ("ticketId");

-- End migration
