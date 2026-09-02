-- CreateEnum
CREATE TYPE "AppEnvironment" AS ENUM ('DEVELOPMENT', 'DEMONSTRATION', 'TEST', 'PRODUCTION');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('COLLECTOR', 'APPRAISER', 'LENDER', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "OrgType" AS ENUM ('COLLECTOR', 'APPRAISAL_FIRM', 'LENDER', 'PLATFORM');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('OWNED', 'CONSIGNED', 'SOLD');

-- CreateEnum
CREATE TYPE "MileageUnit" AS ENUM ('MI', 'KM');

-- CreateEnum
CREATE TYPE "MatchingNumbersStatus" AS ENUM ('UNKNOWN', 'CLAIMED', 'INSPECTED_MATCHING', 'INSPECTED_NON_MATCHING', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "TitleStatus" AS ENUM ('UNKNOWN', 'CLEAN', 'SALVAGE', 'REBUILT', 'BONDED', 'EXPORT', 'LIEN_RECORDED', 'OTHER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('BUYER_FEE', 'TRANSPORTATION', 'TAX', 'CAPITAL_IMPROVEMENT', 'MAINTENANCE', 'INSURANCE', 'STORAGE', 'SELLING_FEE', 'OTHER_OPERATING');

-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('PHOTO', 'BILL_OF_SALE', 'TITLE', 'REGISTRATION', 'BUILD_SHEET', 'SERVICE_RECORD', 'APPRAISAL', 'INSURANCE', 'LIEN', 'INSPECTION', 'OTHER');

-- CreateEnum
CREATE TYPE "Sensitivity" AS ENUM ('STANDARD', 'SENSITIVE');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('SOLD', 'RESERVE_NOT_MET', 'RESULT_UNAVAILABLE', 'CANCELED', 'WITHDRAWN', 'LIVE', 'ASKING');

-- CreateEnum
CREATE TYPE "ValueType" AS ENUM ('FAIR_MARKET', 'RETAIL_MARKET', 'WHOLESALE', 'ORDERLY_LIQUIDATION', 'FORCED_SALE', 'INSURANCE_AGREED');

-- CreateEnum
CREATE TYPE "ValuationStatus" AS ENUM ('DRAFT', 'REVIEWED', 'CERTIFIED', 'EXPIRED', 'SUPERSEDED', 'INSUFFICIENT_DATA');

-- CreateEnum
CREATE TYPE "DataFreshness" AS ENUM ('CURRENT', 'STALE', 'INSUFFICIENT', 'PROVIDER_UNAVAILABLE');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('REQUESTED', 'ACCEPTED', 'IN_PROGRESS', 'INSPECTION_COMPLETE', 'SUBMITTED', 'CERTIFIED', 'DECLINED', 'CANCELED');

-- CreateEnum
CREATE TYPE "InspectionType" AS ENUM ('PHYSICAL', 'REMOTE_DOCUMENTED');

-- CreateEnum
CREATE TYPE "CredentialVerificationStatus" AS ENUM ('UNVERIFIED', 'VERIFIED', 'EXPIRED', 'REJECTED');

-- CreateEnum
CREATE TYPE "ReportStatus" AS ENUM ('DRAFT', 'FINALIZED', 'ACTIVE', 'EXPIRED', 'REVOKED', 'SUPERSEDED');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "LenderDecisionStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'ADDITIONAL_EVIDENCE_REQUIRED');

-- CreateEnum
CREATE TYPE "VerificationCheckType" AS ENUM ('VIN_DECODE', 'VIN_CHECK_DIGIT', 'MAKE_MODEL_CONSISTENCY', 'TITLE', 'LIEN', 'THEFT', 'SALVAGE_BRAND', 'ODOMETER_HISTORY', 'VEHICLE_HISTORY', 'MATCHING_NUMBERS', 'DOCUMENT');

-- CreateEnum
CREATE TYPE "VerificationOutcome" AS ENUM ('NOT_PERFORMED', 'PROVIDER_UNAVAILABLE', 'PASSED', 'FAILED', 'INCONCLUSIVE');

-- CreateEnum
CREATE TYPE "ProviderHealth" AS ENUM ('UNCONFIGURED', 'HEALTHY', 'DEGRADED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('PENDING', 'RUNNING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailNormalized" TEXT NOT NULL,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT,
    "mfaEnabled" BOOLEAN NOT NULL DEFAULT false,
    "mfaSecretEnc" TEXT,
    "lockedUntil" TIMESTAMP(3),
    "failedLogins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrgType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditEvent" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "organizationId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "action" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "previousValue" JSONB,
    "newValue" JSONB,
    "source" TEXT NOT NULL,
    "correlationId" TEXT NOT NULL,
    "reason" TEXT,
    "ipAddress" TEXT,
    "immutable" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "AuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vehicle" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "vin" TEXT,
    "chassisNumber" TEXT,
    "year" INTEGER NOT NULL,
    "make" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "generation" TEXT,
    "series" TEXT,
    "trim" TEXT,
    "bodyStyle" TEXT,
    "engine" TEXT,
    "transmission" TEXT,
    "drivetrain" TEXT,
    "exteriorColor" TEXT,
    "interiorColor" TEXT,
    "currentMileage" INTEGER,
    "mileageUnit" "MileageUnit" NOT NULL DEFAULT 'MI',
    "factoryOptions" JSONB,
    "modifications" JSONB,
    "restorationHistory" TEXT,
    "matchingNumbersStatus" "MatchingNumbersStatus" NOT NULL DEFAULT 'UNKNOWN',
    "conditionGrade" TEXT,
    "titleStatus" "TitleStatus" NOT NULL DEFAULT 'UNKNOWN',
    "registrationJurisdiction" TEXT,
    "storageLocation" TEXT,
    "era" TEXT,
    "category" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'OWNED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OwnershipRecord" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "ownerName" TEXT NOT NULL,
    "startedOn" TIMESTAMP(3) NOT NULL,
    "endedOn" TIMESTAMP(3),
    "provenanceNote" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OwnershipRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Acquisition" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "acquiredOn" TIMESTAMP(3) NOT NULL,
    "priceMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "buyerFeesMinor" BIGINT NOT NULL DEFAULT 0,
    "transportationMinor" BIGINT NOT NULL DEFAULT 0,
    "taxesMinor" BIGINT NOT NULL DEFAULT 0,
    "counterparty" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Acquisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "soldOn" TIMESTAMP(3) NOT NULL,
    "proceedsMinor" BIGINT NOT NULL,
    "sellingFeesMinor" BIGINT NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "counterparty" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "category" "ExpenseCategory" NOT NULL,
    "incurredOn" TIMESTAMP(3) NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Document" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "sensitivity" "Sensitivity" NOT NULL DEFAULT 'STANDARD',
    "fileName" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "byteSize" INTEGER NOT NULL,
    "storageKey" TEXT NOT NULL,
    "sha256" TEXT NOT NULL,
    "malwareScanStatus" TEXT NOT NULL DEFAULT 'not_configured',
    "malwareScanAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Title" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "status" "TitleStatus" NOT NULL,
    "jurisdiction" TEXT,
    "titleNumber" TEXT,
    "recordedOn" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Title_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lien" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "holder" TEXT NOT NULL,
    "recordedOn" TIMESTAMP(3),
    "releasedOn" TIMESTAMP(3),
    "amountMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Lien_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InsurancePolicy" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "carrier" TEXT NOT NULL,
    "policyNumber" TEXT,
    "agreedValueMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "effectiveOn" TIMESTAMP(3),
    "expiresOn" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InsurancePolicy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationCheck" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "type" "VerificationCheckType" NOT NULL,
    "provider" TEXT NOT NULL,
    "outcome" "VerificationOutcome" NOT NULL,
    "performedAt" TIMESTAMP(3),
    "sourceReference" TEXT,
    "summary" TEXT,
    "rawChecksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketProvider" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "health" "ProviderHealth" NOT NULL DEFAULT 'UNCONFIGURED',
    "lastCheckedAt" TIMESTAMP(3),
    "lastError" TEXT,
    "licenseNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MarketProvider_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MarketTransaction" (
    "id" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "providerSlug" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "sourceRecordId" TEXT NOT NULL,
    "sourceUrl" TEXT,
    "retrievedAt" TIMESTAMP(3) NOT NULL,
    "auctionStartAt" TIMESTAMP(3),
    "auctionEndAt" TIMESTAMP(3),
    "saleLocation" TEXT,
    "currency" TEXT NOT NULL,
    "originalAmountMinor" BIGINT,
    "normalizedUsdMinor" BIGINT,
    "fxRate" DECIMAL(18,8),
    "fxSource" TEXT,
    "fxDate" TIMESTAMP(3),
    "hammerPriceMinor" BIGINT,
    "buyersPremiumMinor" BIGINT,
    "priceIncludesPremium" BOOLEAN,
    "saleStatus" "SaleStatus" NOT NULL,
    "reserveNotMet" BOOLEAN NOT NULL DEFAULT false,
    "year" INTEGER,
    "make" TEXT,
    "model" TEXT,
    "trim" TEXT,
    "bodyStyle" TEXT,
    "engine" TEXT,
    "transmission" TEXT,
    "drivetrain" TEXT,
    "mileage" INTEGER,
    "mileageUnit" "MileageUnit",
    "condition" TEXT,
    "specifications" JSONB,
    "modifications" JSONB,
    "knownDefects" JSONB,
    "vin" TEXT,
    "imageUrl" TEXT,
    "imageLicensed" BOOLEAN NOT NULL DEFAULT false,
    "rawPayload" JSONB,
    "rawChecksum" TEXT NOT NULL,
    "licenseRestrictions" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MethodologyVersion" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "valueType" "ValueType" NOT NULL,
    "description" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "approvedBy" TEXT,
    "approvedAt" TIMESTAMP(3),
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MethodologyVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Valuation" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "methodologyVersionId" TEXT NOT NULL,
    "status" "ValuationStatus" NOT NULL,
    "freshness" "DataFreshness" NOT NULL,
    "effectiveOn" TIMESTAMP(3) NOT NULL,
    "intendedUse" TEXT NOT NULL,
    "intendedUsers" TEXT NOT NULL,
    "definitionOfValue" "ValueType" NOT NULL,
    "scopeOfWork" TEXT NOT NULL,
    "dataSources" JSONB NOT NULL,
    "estimatedValueMinor" BIGINT,
    "rangeLowMinor" BIGINT,
    "rangeHighMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "confidence" TEXT,
    "confidenceNote" TEXT,
    "reconciliation" TEXT,
    "limitingConditions" TEXT NOT NULL,
    "assumptions" TEXT NOT NULL,
    "extraordinaryAssumptions" TEXT,
    "reviewerUserId" TEXT,
    "insufficientReason" TEXT,
    "staleBecause" TEXT,
    "providerFailure" TEXT,
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Valuation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparableSet" (
    "id" TEXT NOT NULL,
    "valuationId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparableSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparableSelection" (
    "id" TEXT NOT NULL,
    "comparableSetId" TEXT NOT NULL,
    "marketTransactionId" TEXT NOT NULL,
    "included" BOOLEAN NOT NULL,
    "similarityScore" DOUBLE PRECISION NOT NULL,
    "inclusionReason" TEXT NOT NULL,
    "exclusionReason" TEXT,
    "differences" JSONB NOT NULL,
    "rawValueMinor" BIGINT,
    "adjustedValueMinor" BIGINT,
    "weight" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparableSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComparableAdjustment" (
    "id" TEXT NOT NULL,
    "selectionId" TEXT NOT NULL,
    "factor" TEXT NOT NULL,
    "amountMinor" BIGINT NOT NULL,
    "justification" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComparableAdjustment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ValueSnapshot" (
    "id" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "valuationId" TEXT,
    "capturedOn" TIMESTAMP(3) NOT NULL,
    "valueType" "ValueType" NOT NULL,
    "amountMinor" BIGINT,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "freshness" "DataFreshness" NOT NULL,
    "isObservedSale" BOOLEAN NOT NULL DEFAULT false,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ValueSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PortfolioSnapshot" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "capturedOn" TIMESTAMP(3) NOT NULL,
    "estimatedValueMinor" BIGINT,
    "appraisedValueMinor" BIGINT,
    "acquisitionCostMinor" BIGINT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "freshness" "DataFreshness" NOT NULL,
    "vehicleCount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PortfolioSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraiserCredential" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organization" TEXT NOT NULL,
    "credentialType" TEXT NOT NULL,
    "specialty" TEXT,
    "credentialNumber" TEXT,
    "issuedOn" TIMESTAMP(3),
    "expiresOn" TIMESTAMP(3),
    "uspapEducationCurrent" BOOLEAN NOT NULL DEFAULT false,
    "uspapEducationThrough" TIMESTAMP(3),
    "geographicCoverage" TEXT,
    "insuranceCarrier" TEXT,
    "insuranceExpiresOn" TIMESTAMP(3),
    "verificationStatus" "CredentialVerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraiserCredential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalAssignment" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "vehicleId" TEXT,
    "valuationId" TEXT,
    "clientUserId" TEXT NOT NULL,
    "clientOrgId" TEXT NOT NULL,
    "appraiserUserId" TEXT,
    "firmOrgId" TEXT,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'REQUESTED',
    "intendedUse" TEXT NOT NULL,
    "intendedUsers" TEXT NOT NULL,
    "valueType" "ValueType" NOT NULL DEFAULT 'FAIR_MARKET',
    "effectiveOn" TIMESTAMP(3) NOT NULL,
    "assignmentConditions" TEXT,
    "scopeOfWork" TEXT NOT NULL,
    "approachesUsed" TEXT,
    "approachesExcluded" TEXT,
    "competencyStatement" TEXT,
    "conflictDisclosure" TEXT,
    "independenceStatement" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AppraisalAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Inspection" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "inspectorUserId" TEXT NOT NULL,
    "type" "InspectionType" NOT NULL,
    "inspectedAt" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "conditionChecklist" JSONB,
    "paintBodyNotes" TEXT,
    "mechanicalNotes" TEXT,
    "originalityNotes" TEXT,
    "matchingNumbersNotes" TEXT,
    "modificationsNotes" TEXT,
    "damageNotes" TEXT,
    "restorationNotes" TEXT,
    "missingComponents" TEXT,
    "documentsReviewed" TEXT,
    "inspectorNotes" TEXT,
    "collectorAcknowledged" BOOLEAN NOT NULL DEFAULT false,
    "evidenceChecksum" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Inspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppraisalReport" (
    "id" TEXT NOT NULL,
    "assignmentId" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "status" "ReportStatus" NOT NULL DEFAULT 'DRAFT',
    "title" TEXT NOT NULL,
    "contentHash" TEXT,
    "payload" JSONB NOT NULL,
    "certificationText" TEXT NOT NULL,
    "workfileRetention" TEXT,
    "expiresOn" TIMESTAMP(3),
    "supersededById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizedAt" TIMESTAMP(3),

    CONSTRAINT "AppraisalReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectronicSignature" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "signerId" TEXT NOT NULL,
    "signedAt" TIMESTAMP(3) NOT NULL,
    "statement" TEXT NOT NULL,
    "signatureHash" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ElectronicSignature_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CertificationTemplate" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "legalReviewStatus" TEXT NOT NULL DEFAULT 'draft_unreviewed',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CertificationTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LenderRequirement" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxAppraisalAgeDays" INTEGER NOT NULL DEFAULT 180,
    "requiredValueTypes" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LenderRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReportShare" (
    "id" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "lenderOrgId" TEXT,
    "tokenHash" TEXT NOT NULL,
    "status" "ShareStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revokedAt" TIMESTAMP(3),
    "canDownload" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReportShare_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccessLog" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "userId" TEXT,
    "action" TEXT NOT NULL,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccessLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LenderDecision" (
    "id" TEXT NOT NULL,
    "shareId" TEXT NOT NULL,
    "actorUserId" TEXT NOT NULL,
    "status" "LenderDecisionStatus" NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LenderDecision_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportJob" (
    "id" TEXT NOT NULL,
    "providerId" TEXT,
    "name" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'PENDING',
    "payloadHash" TEXT NOT NULL,
    "attempt" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "startedAt" TIMESTAMP(3),
    "finishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ImportJob_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RetentionPolicy" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT,
    "workfileYears" INTEGER NOT NULL DEFAULT 5,
    "documentYears" INTEGER NOT NULL DEFAULT 7,
    "auditYears" INTEGER NOT NULL DEFAULT 7,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RetentionPolicy_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_emailNormalized_key" ON "User"("emailNormalized");

-- CreateIndex
CREATE INDEX "Membership_organizationId_role_idx" ON "Membership"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_organizationId_role_key" ON "Membership"("userId", "organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "Session_tokenHash_key" ON "Session"("tokenHash");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "EmailToken_tokenHash_key" ON "EmailToken"("tokenHash");

-- CreateIndex
CREATE INDEX "EmailToken_userId_purpose_idx" ON "EmailToken"("userId", "purpose");

-- CreateIndex
CREATE INDEX "AuditEvent_subjectType_subjectId_idx" ON "AuditEvent"("subjectType", "subjectId");

-- CreateIndex
CREATE INDEX "AuditEvent_organizationId_timestamp_idx" ON "AuditEvent"("organizationId", "timestamp");

-- CreateIndex
CREATE INDEX "AuditEvent_correlationId_idx" ON "AuditEvent"("correlationId");

-- CreateIndex
CREATE INDEX "Collection_organizationId_idx" ON "Collection"("organizationId");

-- CreateIndex
CREATE INDEX "Collection_ownerUserId_idx" ON "Collection"("ownerUserId");

-- CreateIndex
CREATE INDEX "Vehicle_collectionId_idx" ON "Vehicle"("collectionId");

-- CreateIndex
CREATE INDEX "Vehicle_make_model_year_idx" ON "Vehicle"("make", "model", "year");

-- CreateIndex
CREATE INDEX "Vehicle_vin_idx" ON "Vehicle"("vin");

-- CreateIndex
CREATE UNIQUE INDEX "Acquisition_vehicleId_key" ON "Acquisition"("vehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_vehicleId_key" ON "Sale"("vehicleId");

-- CreateIndex
CREATE INDEX "Expense_vehicleId_category_idx" ON "Expense"("vehicleId", "category");

-- CreateIndex
CREATE INDEX "Document_vehicleId_idx" ON "Document"("vehicleId");

-- CreateIndex
CREATE INDEX "Document_sha256_idx" ON "Document"("sha256");

-- CreateIndex
CREATE INDEX "VerificationCheck_vehicleId_type_idx" ON "VerificationCheck"("vehicleId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "MarketProvider_slug_key" ON "MarketProvider"("slug");

-- CreateIndex
CREATE INDEX "MarketTransaction_make_model_year_saleStatus_idx" ON "MarketTransaction"("make", "model", "year", "saleStatus");

-- CreateIndex
CREATE INDEX "MarketTransaction_vin_idx" ON "MarketTransaction"("vin");

-- CreateIndex
CREATE INDEX "MarketTransaction_auctionEndAt_idx" ON "MarketTransaction"("auctionEndAt");

-- CreateIndex
CREATE UNIQUE INDEX "MarketTransaction_providerSlug_source_sourceRecordId_key" ON "MarketTransaction"("providerSlug", "source", "sourceRecordId");

-- CreateIndex
CREATE UNIQUE INDEX "MethodologyVersion_slug_version_key" ON "MethodologyVersion"("slug", "version");

-- CreateIndex
CREATE UNIQUE INDEX "Valuation_supersededById_key" ON "Valuation"("supersededById");

-- CreateIndex
CREATE INDEX "Valuation_vehicleId_effectiveOn_idx" ON "Valuation"("vehicleId", "effectiveOn");

-- CreateIndex
CREATE UNIQUE INDEX "ComparableSet_valuationId_key" ON "ComparableSet"("valuationId");

-- CreateIndex
CREATE INDEX "ComparableSelection_comparableSetId_idx" ON "ComparableSelection"("comparableSetId");

-- CreateIndex
CREATE INDEX "ValueSnapshot_vehicleId_capturedOn_idx" ON "ValueSnapshot"("vehicleId", "capturedOn");

-- CreateIndex
CREATE INDEX "PortfolioSnapshot_collectionId_capturedOn_idx" ON "PortfolioSnapshot"("collectionId", "capturedOn");

-- CreateIndex
CREATE INDEX "AppraiserCredential_userId_idx" ON "AppraiserCredential"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalAssignment_valuationId_key" ON "AppraisalAssignment"("valuationId");

-- CreateIndex
CREATE UNIQUE INDEX "Inspection_assignmentId_key" ON "Inspection"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalReport_assignmentId_key" ON "AppraisalReport"("assignmentId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalReport_publicId_key" ON "AppraisalReport"("publicId");

-- CreateIndex
CREATE UNIQUE INDEX "AppraisalReport_supersededById_key" ON "AppraisalReport"("supersededById");

-- CreateIndex
CREATE UNIQUE INDEX "ElectronicSignature_reportId_key" ON "ElectronicSignature"("reportId");

-- CreateIndex
CREATE UNIQUE INDEX "CertificationTemplate_slug_key" ON "CertificationTemplate"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "ReportShare_tokenHash_key" ON "ReportShare"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "ImportJob_name_payloadHash_key" ON "ImportJob"("name", "payloadHash");

-- CreateIndex
CREATE UNIQUE INDEX "RetentionPolicy_organizationId_key" ON "RetentionPolicy"("organizationId");

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailToken" ADD CONSTRAINT "EmailToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditEvent" ADD CONSTRAINT "AuditEvent_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vehicle" ADD CONSTRAINT "Vehicle_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OwnershipRecord" ADD CONSTRAINT "OwnershipRecord_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Acquisition" ADD CONSTRAINT "Acquisition_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Title" ADD CONSTRAINT "Title_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lien" ADD CONSTRAINT "Lien_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InsurancePolicy" ADD CONSTRAINT "InsurancePolicy_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationCheck" ADD CONSTRAINT "VerificationCheck_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MarketTransaction" ADD CONSTRAINT "MarketTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "MarketProvider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_methodologyVersionId_fkey" FOREIGN KEY ("methodologyVersionId") REFERENCES "MethodologyVersion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Valuation" ADD CONSTRAINT "Valuation_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "Valuation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableSet" ADD CONSTRAINT "ComparableSet_valuationId_fkey" FOREIGN KEY ("valuationId") REFERENCES "Valuation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableSelection" ADD CONSTRAINT "ComparableSelection_comparableSetId_fkey" FOREIGN KEY ("comparableSetId") REFERENCES "ComparableSet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableSelection" ADD CONSTRAINT "ComparableSelection_marketTransactionId_fkey" FOREIGN KEY ("marketTransactionId") REFERENCES "MarketTransaction"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComparableAdjustment" ADD CONSTRAINT "ComparableAdjustment_selectionId_fkey" FOREIGN KEY ("selectionId") REFERENCES "ComparableSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueSnapshot" ADD CONSTRAINT "ValueSnapshot_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ValueSnapshot" ADD CONSTRAINT "ValueSnapshot_valuationId_fkey" FOREIGN KEY ("valuationId") REFERENCES "Valuation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PortfolioSnapshot" ADD CONSTRAINT "PortfolioSnapshot_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraiserCredential" ADD CONSTRAINT "AppraiserCredential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalAssignment" ADD CONSTRAINT "AppraisalAssignment_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalAssignment" ADD CONSTRAINT "AppraisalAssignment_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalAssignment" ADD CONSTRAINT "AppraisalAssignment_valuationId_fkey" FOREIGN KEY ("valuationId") REFERENCES "Valuation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalAssignment" ADD CONSTRAINT "AppraisalAssignment_clientUserId_fkey" FOREIGN KEY ("clientUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalAssignment" ADD CONSTRAINT "AppraisalAssignment_clientOrgId_fkey" FOREIGN KEY ("clientOrgId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalAssignment" ADD CONSTRAINT "AppraisalAssignment_appraiserUserId_fkey" FOREIGN KEY ("appraiserUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalAssignment" ADD CONSTRAINT "AppraisalAssignment_firmOrgId_fkey" FOREIGN KEY ("firmOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AppraisalAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "Vehicle"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Inspection" ADD CONSTRAINT "Inspection_inspectorUserId_fkey" FOREIGN KEY ("inspectorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReport" ADD CONSTRAINT "AppraisalReport_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "AppraisalAssignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppraisalReport" ADD CONSTRAINT "AppraisalReport_supersededById_fkey" FOREIGN KEY ("supersededById") REFERENCES "AppraisalReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicSignature" ADD CONSTRAINT "ElectronicSignature_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AppraisalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectronicSignature" ADD CONSTRAINT "ElectronicSignature_signerId_fkey" FOREIGN KEY ("signerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LenderRequirement" ADD CONSTRAINT "LenderRequirement_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportShare" ADD CONSTRAINT "ReportShare_reportId_fkey" FOREIGN KEY ("reportId") REFERENCES "AppraisalReport"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportShare" ADD CONSTRAINT "ReportShare_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportShare" ADD CONSTRAINT "ReportShare_lenderOrgId_fkey" FOREIGN KEY ("lenderOrgId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "ReportShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccessLog" ADD CONSTRAINT "AccessLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LenderDecision" ADD CONSTRAINT "LenderDecision_shareId_fkey" FOREIGN KEY ("shareId") REFERENCES "ReportShare"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LenderDecision" ADD CONSTRAINT "LenderDecision_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportJob" ADD CONSTRAINT "ImportJob_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "MarketProvider"("id") ON DELETE SET NULL ON UPDATE CASCADE;
