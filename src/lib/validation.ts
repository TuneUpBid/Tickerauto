import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[0-9]/, "Password must include a number");

export const registerSchema = z
  .object({
    name: z.string().min(2).max(120),
    email: z.string().email(),
    password: passwordSchema,
    confirmPassword: z.string(),
    organizationName: z.string().min(2).max(160),
    acceptDisclosures: z.literal(true, {
      errorMap: () => ({ message: "You must acknowledge the valuation and lending disclosures." }),
    }),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(16),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const vehicleSchema = z.object({
  collectionId: z.string().min(1),
  vin: z.string().max(32).optional().or(z.literal("")),
  chassisNumber: z.string().max(64).optional().or(z.literal("")),
  year: z.preprocess(
    (value) => (value === "" || value === undefined || value === null ? undefined : value),
    z.coerce.number().int().min(1885).max(2100).optional(),
  ),
  make: z.string().max(80).optional().or(z.literal("")),
  model: z.string().max(80).optional().or(z.literal("")),
  generation: z.string().max(80).optional().or(z.literal("")),
  series: z.string().max(80).optional().or(z.literal("")),
  trim: z.string().max(80).optional().or(z.literal("")),
  bodyStyle: z.string().max(80).optional().or(z.literal("")),
  engine: z.string().max(120).optional().or(z.literal("")),
  transmission: z.string().max(80).optional().or(z.literal("")),
  drivetrain: z.string().max(40).optional().or(z.literal("")),
  exteriorColor: z.string().max(80).optional().or(z.literal("")),
  interiorColor: z.string().max(80).optional().or(z.literal("")),
  currentMileage: z.coerce.number().int().min(0).optional().or(z.literal("")),
  mileageUnit: z.enum(["MI", "KM"]).default("MI"),
  factoryOptions: z.string().optional(),
  modifications: z.string().optional(),
  restorationHistory: z.string().optional(),
  matchingNumbersStatus: z
    .enum(["UNKNOWN", "CLAIMED", "INSPECTED_MATCHING", "INSPECTED_NON_MATCHING", "NOT_APPLICABLE"])
    .default("UNKNOWN"),
  conditionGrade: z.string().max(40).optional().or(z.literal("")),
  titleStatus: z
    .enum(["UNKNOWN", "CLEAN", "SALVAGE", "REBUILT", "BONDED", "EXPORT", "LIEN_RECORDED", "OTHER"])
    .default("UNKNOWN"),
  registrationJurisdiction: z.string().max(80).optional().or(z.literal("")),
  storageLocation: z.string().max(160).optional().or(z.literal("")),
  era: z.string().max(40).optional().or(z.literal("")),
  category: z.string().max(40).optional().or(z.literal("")),
});

export const acquisitionSchema = z.object({
  vehicleId: z.string().min(1),
  acquiredOn: z.string().min(1),
  price: z.coerce.number().min(0),
  currency: z.string().length(3).default("USD"),
  buyerFees: z.coerce.number().min(0).default(0),
  transportation: z.coerce.number().min(0).default(0),
  taxes: z.coerce.number().min(0).default(0),
  counterparty: z.string().optional(),
  notes: z.string().optional(),
});

export const expenseSchema = z.object({
  vehicleId: z.string().min(1),
  category: z.enum([
    "BUYER_FEE",
    "TRANSPORTATION",
    "TAX",
    "CAPITAL_IMPROVEMENT",
    "MAINTENANCE",
    "INSURANCE",
    "STORAGE",
    "SELLING_FEE",
    "OTHER_OPERATING",
  ]),
  incurredOn: z.string().min(1),
  amount: z.coerce.number().min(0),
  currency: z.string().length(3).default("USD"),
  description: z.string().optional(),
});

export const collectionSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(500).optional(),
});

export const valuationRequestSchema = z.object({
  vehicleId: z.string().min(1),
  intendedUse: z.string().min(3).max(240),
  intendedUsers: z.string().min(3).max(240),
});

export const appraisalRequestSchema = z.object({
  collectionId: z.string().min(1),
  vehicleId: z.string().optional(),
  valuationId: z.string().optional(),
  intendedUse: z.string().min(3).max(240),
  intendedUsers: z.string().min(3).max(240),
  engagementKind: z
    .enum(["LENDING_COLLATERAL", "NET_WORTH", "INTERNAL_MONITORING"])
    .default("LENDING_COLLATERAL"),
  valueType: z
    .enum([
      "FAIR_MARKET",
      "RETAIL_MARKET",
      "WHOLESALE",
      "ORDERLY_LIQUIDATION",
      "FORCED_SALE",
      "INSURANCE_AGREED",
    ])
    .default("FAIR_MARKET"),
  effectiveOn: z.string().min(1),
  scopeOfWork: z.string().min(10),
});

export const credentialSchema = z.object({
  credentialType: z.enum([
    "CA_VEHICLE_VERIFIER",
    "USPAP_PERSONAL_PROPERTY",
    "ASA_PERSONAL_PROPERTY",
    "IAAA",
    "ISA",
    "OTHER_VALUE_DESIGNATION",
  ]),
  credentialNumber: z.string().max(80).optional().or(z.literal("")),
  organization: z.string().min(2).max(160),
  jurisdiction: z.string().max(80).optional().or(z.literal("")),
  specialty: z.string().max(120).optional().or(z.literal("")),
  issuedOn: z.string().optional().or(z.literal("")),
  expiresOn: z.string().optional().or(z.literal("")),
  uspapEducationCurrent: z.coerce.boolean().optional(),
  uspapEducationThrough: z.string().optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const shareReportSchema = z.object({
  reportId: z.string().min(1),
  lenderOrgId: z.string().optional(),
  expiresInDays: z.coerce.number().int().min(1).max(90).default(14),
  canDownload: z.coerce.boolean().default(true),
});

export const lenderDecisionSchema = z.object({
  shareId: z.string().min(1),
  status: z.enum(["ACCEPTED", "REJECTED", "ADDITIONAL_EVIDENCE_REQUIRED"]),
  reason: z.string().min(3).max(1000),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type VehicleInput = z.infer<typeof vehicleSchema>;
export type CredentialInput = z.infer<typeof credentialSchema>;
