-- AlterEnum
ALTER TYPE "VerificationCheckType" ADD VALUE IF NOT EXISTS 'PHYSICAL_IDENTITY';

-- CreateEnum
DO $$ BEGIN
    CREATE TYPE "CredentialAuthority" AS ENUM ('IDENTITY', 'VALUE', 'EDUCATION_ONLY');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AlterTable
ALTER TABLE "AppraiserCredential" ADD COLUMN IF NOT EXISTS "authority" "CredentialAuthority" NOT NULL DEFAULT 'EDUCATION_ONLY';
ALTER TABLE "AppraiserCredential" ADD COLUMN IF NOT EXISTS "jurisdiction" TEXT;

-- AlterTable
ALTER TABLE "AppraisalAssignment" ADD COLUMN IF NOT EXISTS "engagementKind" TEXT NOT NULL DEFAULT 'INTERNAL_MONITORING';
