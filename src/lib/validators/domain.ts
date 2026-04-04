import { z } from 'zod';
import {
  CasePriority,
  ActivityType,
  ReferenceType,
  RtwCheckMethod,
  CaseOutcome,
} from '@/types/enums';

// ============================================================
// Base Schemas & Utilities
// ============================================================

/**
 * UUID validation
 */
const uuid = z.string().uuid('Invalid UUID format');

/**
 * UK phone number pattern
 * Matches: 020, 0121, 01234, 07700 followed by 6-7 digits
 * Also accepts: +44 prefix or spaces
 */
const ukPhonePattern = z.string().regex(
  /^(?:\+44\s?7\d{3}|\(?0(?:\d{5}|\d{4}|\d{3}|\d{2})\)?)\s?\d{3}\s?\d{3}$/,
  'Invalid UK phone number format'
);

/**
 * UK National Insurance Number pattern
 * Format: 2 letters + 6 digits + 1 letter (e.g., AB123456C)
 */
const niNumberPattern = z.string().regex(
  /^[A-Z]{2}\d{6}[A-Z]$/,
  'Invalid National Insurance Number format (expected format: AB123456C)'
);

/**
 * UK Postcode pattern
 * Simplified pattern that matches most valid UK postcodes
 */
const ukPostcodePattern = z.string().regex(
  /^[A-Z]{1,2}\d{1,2}[A-Z]?\s?\d[A-Z]{2}$/i,
  'Invalid UK postcode format'
);

/**
 * ISO date string validation
 */
const isoDate = z.string().datetime({ offset: true }).or(
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (expected YYYY-MM-DD)')
);

/**
 * Email validation
 */
const email = z.string().email('Invalid email address');

// ============================================================
// Schema 1: Create Case Schema
// ============================================================

export const createCaseSchema = z.object({
  client_id: uuid,
  candidate_first_name: z.string().min(1, 'First name is required').max(100),
  candidate_last_name: z.string().min(1, 'Last name is required').max(100),
  candidate_email: email,
  candidate_phone: ukPhonePattern.optional(),
  package_id: uuid,
  priority: z.nativeEnum(CasePriority, {
    error: 'Invalid case priority',
  }).optional(),
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
});

export type CreateCaseInput = z.infer<typeof createCaseSchema>;

// ============================================================
// Schema 1b: Create Case from Candidate Schema (after candidate exists)
// ============================================================

export const createCaseFromCandidateSchema = z.object({
  clientId: uuid,
  candidateId: uuid,
  packageId: uuid,
  priority: z.nativeEnum(CasePriority, {
    error: 'Invalid case priority',
  }).optional().default(CasePriority.Standard),
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
});

export type CreateCaseFromCandidateInput = z.infer<typeof createCaseFromCandidateSchema>;

// ============================================================
// Schema 2: Create Candidate Schema
// ============================================================

export const createCandidateSchema = z.object({
  firstName: z.string().max(100, 'First name must not exceed 100 characters'),
  lastName: z.string().max(100, 'Last name must not exceed 100 characters'),
  email: email,
  phone: ukPhonePattern.optional(),
  dateOfBirth: isoDate.optional(),
  nationalInsuranceNumber: niNumberPattern.optional(),
});

export type CreateCandidateInput = z.infer<typeof createCandidateSchema>;

// ============================================================
// Schema 3: Address Schema
// ============================================================

export const addressSchema = z.object({
  addressLine1: z.string().max(200, 'Address line 1 must not exceed 200 characters'),
  addressLine2: z.string().max(200, 'Address line 2 must not exceed 200 characters').optional(),
  city: z.string().max(100, 'City must not exceed 100 characters'),
  county: z.string().max(100, 'County must not exceed 100 characters').optional(),
  postcode: ukPostcodePattern,
  country: z.string().max(100, 'Country must not exceed 100 characters').default('United Kingdom'),
  dateFrom: isoDate,
  dateTo: isoDate.optional().nullable(),
  isCurrent: z.boolean().default(false),
}).refine(
  (data) => {
    if (data.dateTo && data.dateFrom) {
      return new Date(data.dateTo) >= new Date(data.dateFrom);
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['dateTo'],
  }
);

export type AddressInput = z.infer<typeof addressSchema>;

// ============================================================
// Schema 4: Activity Schema
// ============================================================

export const activitySchema = z.object({
  activityType: z.nativeEnum(ActivityType, {
    error: 'Invalid activity type',
  }),
  organisationName: z.string().max(200, 'Organisation name must not exceed 200 characters').optional(),
  jobTitle: z.string().max(200, 'Job title must not exceed 200 characters').optional(),
  description: z.string().max(1000, 'Description must not exceed 1000 characters').optional(),
  dateFrom: isoDate,
  dateTo: isoDate.optional().nullable(),
  isCurrent: z.boolean().default(false),
  contactName: z.string().max(200, 'Contact name must not exceed 200 characters').optional(),
  contactEmail: email.optional(),
  contactPhone: ukPhonePattern.optional(),
}).refine(
  (data) => {
    if (data.dateTo && data.dateFrom) {
      return new Date(data.dateTo) >= new Date(data.dateFrom);
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['dateTo'],
  }
);

export type ActivityInput = z.infer<typeof activitySchema>;

// ============================================================
// Schema 5: Declarations Schema
// ============================================================

export const declarationsSchema = z.object({
  hasCriminalRecord: z.boolean(),
  criminalDetails: z.string().max(2000, 'Criminal details must not exceed 2000 characters').optional(),
  hasCcjsOrBankruptcy: z.boolean(),
  financialDetails: z.string().max(2000, 'Financial details must not exceed 2000 characters').optional(),
  hasHealthConditions: z.boolean(),
  healthDetails: z.string().max(2000, 'Health details must not exceed 2000 characters').optional(),
  declarationConfirmed: z.boolean(),
}).refine(
  (data) => !data.hasCriminalRecord || !!data.criminalDetails,
  {
    message: 'Criminal details are required when criminal record is declared',
    path: ['criminalDetails'],
  }
).refine(
  (data) => !data.hasCcjsOrBankruptcy || !!data.financialDetails,
  {
    message: 'Financial details are required when CCJs or bankruptcy is declared',
    path: ['financialDetails'],
  }
).refine(
  (data) => !data.hasHealthConditions || !!data.healthDetails,
  {
    message: 'Health details are required when health conditions are declared',
    path: ['healthDetails'],
  }
).refine(
  (data) => data.declarationConfirmed === true,
  {
    message: 'Declaration must be confirmed',
    path: ['declarationConfirmed'],
  }
);

export type DeclarationsInput = z.infer<typeof declarationsSchema>;

// ============================================================
// Schema 6: Referee Schema
// ============================================================

export const refereeSchema = z.object({
  referenceType: z.nativeEnum(ReferenceType, {
    error: 'Invalid reference type',
  }),
  refereeName: z.string().max(200, 'Referee name must not exceed 200 characters'),
  refereeEmail: email,
  refereePhone: ukPhonePattern.optional(),
  organisationName: z.string().max(200, 'Organisation name must not exceed 200 characters').optional(),
  jobTitle: z.string().max(200, 'Job title must not exceed 200 characters').optional(),
  relationship: z.string().max(200, 'Relationship must not exceed 200 characters').optional(),
  dateFrom: isoDate,
  dateTo: isoDate.optional().nullable(),
}).refine(
  (data) => {
    if (data.dateTo && data.dateFrom) {
      return new Date(data.dateTo) >= new Date(data.dateFrom);
    }
    return true;
  },
  {
    message: 'End date must be after or equal to start date',
    path: ['dateTo'],
  }
);

export type RefereeInput = z.infer<typeof refereeSchema>;

// ============================================================
// Schema 7: Create Client Schema
// ============================================================

export const createClientSchema = z.object({
  companyName: z.string().min(1, 'Company name is required').max(200, 'Company name must not exceed 200 characters'),
  contactName: z.string().min(1, 'Contact name is required').max(200, 'Contact name must not exceed 200 characters'),
  contactEmail: email,
  contactPhone: ukPhonePattern.optional(),
  address: z.string().max(500, 'Address must not exceed 500 characters').optional(),
  notes: z.string().max(2000, 'Notes must not exceed 2000 characters').optional(),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

// ============================================================
// Schema 8: Note Schema
// ============================================================

export const noteSchema = z.object({
  content: z.string()
    .min(1, 'Note content cannot be empty')
    .max(5000, 'Note content must not exceed 5000 characters'),
  isInternal: z.boolean().default(true),
});

export type NoteInput = z.infer<typeof noteSchema>;

// ============================================================
// Schema 9: Reference Response Schema
// ============================================================

export const referenceResponseSchema = z.object({
  respondentName: z.string().min(1, 'Name is required').max(200),
  respondentEmail: z.string().email('Valid email is required'),
  respondentJobTitle: z.string().max(200).optional(),
  candidateKnown: z.boolean({ error: 'This field is required' }),
  datesConfirmed: z.boolean({ error: 'This field is required' }),
  dateFromConfirmed: z.string().optional(),
  dateToConfirmed: z.string().optional(),
  jobTitleConfirmed: z.string().max(200).optional(),
  reasonForLeaving: z.string().max(1000).optional(),
  performanceRating: z.string().max(50).optional(),
  conductIssues: z.boolean().default(false),
  conductDetails: z.string().max(2000).optional(),
  wouldReemploy: z.boolean().optional(),
  additionalComments: z.string().max(2000).optional(),
});

export type ReferenceResponseFormInput = z.infer<typeof referenceResponseSchema>;

// ============================================================
// Schema 10: Send Reference Schema
// ============================================================

export const sendReferenceSchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
});

export type SendReferenceInput = z.infer<typeof sendReferenceSchema>;

// ============================================================
// Schema 11: Flag Discrepancy Schema
// ============================================================

export const flagDiscrepancySchema = z.object({
  requestId: z.string().uuid('Invalid request ID'),
  notes: z.string().min(1, 'Notes are required').max(2000, 'Notes must not exceed 2000 characters'),
});

export type FlagDiscrepancyInput = z.infer<typeof flagDiscrepancySchema>;

// ============================================================
// Schema 12: RTW Document Submission
// ============================================================

export const rtwDocumentSchema = z.object({
  documentType: z.string().min(1, 'Document type is required').max(200),
  documentReference: z.string().min(1, 'Document reference is required').max(200),
  expiryDate: z.string().optional(),
});
export type RtwDocumentInput = z.infer<typeof rtwDocumentSchema>;

// ============================================================
// Schema 13: RTW Share Code Submission
// ============================================================

export const rtwShareCodeSchema = z.object({
  shareCode: z.string().min(1, 'Share code is required').max(50, 'Share code must not exceed 50 characters'),
});
export type RtwShareCodeInput = z.infer<typeof rtwShareCodeSchema>;

// ============================================================
// Schema 14: RTW Review
// ============================================================

export const rtwReviewSchema = z.object({
  verified: z.boolean({ error: 'Verification decision is required' }),
  reviewNotes: z.string().max(2000, 'Review notes must not exceed 2000 characters').optional(),
  hasTimeLimit: z.boolean().default(false),
  timeLimitEnd: z.string().optional(),
}).refine(
  (data) => !data.hasTimeLimit || (data.hasTimeLimit && data.timeLimitEnd),
  { message: 'Time limit end date is required when time limit is set', path: ['timeLimitEnd'] },
);
export type RtwReviewInput = z.infer<typeof rtwReviewSchema>;

// ============================================================
// Schema 15: RTW Create
// ============================================================

export const rtwCreateSchema = z.object({
  checkMethod: z.nativeEnum(RtwCheckMethod, { error: 'Invalid check method' }),
});
export type RtwCreateInput = z.infer<typeof rtwCreateSchema>;


// ============================================================
// Schema 16: DBS Application Submission
// ============================================================

export const dbsApplicationSchema = z.object({
  applicationReference: z.string().min(1, 'Application reference is required').max(200),
});
export type DbsApplicationInput = z.infer<typeof dbsApplicationSchema>;

// ============================================================
// Schema 17: DBS Certificate Received
// ============================================================

export const dbsCertificateSchema = z.object({
  certificateNumber: z.string().min(1, 'Certificate number is required').max(50),
  certificateDate: z.string().min(1, 'Certificate date is required'),
  hasAdverse: z.boolean().default(false),
  adverseDetails: z.string().max(2000).optional(),
}).refine(
  (data) => !data.hasAdverse || (data.hasAdverse && data.adverseDetails && data.adverseDetails.trim().length > 0),
  { message: 'Adverse details are required when adverse information is found', path: ['adverseDetails'] },
);
export type DbsCertificateInput = z.infer<typeof dbsCertificateSchema>;

// ============================================================
// Schema 18: DBS Review
// ============================================================

export const dbsReviewSchema = z.object({
  clear: z.boolean({ error: 'Review decision is required' }),
  reviewNotes: z.string().max(2000).optional(),
});
export type DbsReviewInput = z.infer<typeof dbsReviewSchema>;

// ============================================================
// Schema 19: Case Adjudication
// ============================================================

export const adjudicationSchema = z.object({
  outcome: z.nativeEnum(CaseOutcome, { error: 'Case outcome is required' }),
  notes: z.string().max(4000, 'Notes must not exceed 4000 characters').optional(),
});
export type AdjudicationInput = z.infer<typeof adjudicationSchema>;

// ============================================================
// Schema 20: Case Note
// ============================================================

export const caseNoteSchema = z.object({
  content: z.string().min(1, 'Note content is required').max(4000, 'Note must not exceed 4000 characters'),
  isInternal: z.boolean().default(true),
});
export type CaseNoteInput = z.infer<typeof caseNoteSchema>;

// ============================================================
// Schema 21: Move to Review
// ============================================================

export const moveToReviewSchema = z.object({
  notes: z.string().max(2000).optional(),
});
export type MoveToReviewInput = z.infer<typeof moveToReviewSchema>;

// ============================================================
// Export all schemas as a namespace for convenience
// ============================================================

export const validationSchemas = {
  createCase: createCaseSchema,
  createCandidate: createCandidateSchema,
  address: addressSchema,
  activity: activitySchema,
  declarations: declarationsSchema,
  referee: refereeSchema,
  createClient: createClientSchema,
  note: noteSchema,
  referenceResponse: referenceResponseSchema,
  sendReference: sendReferenceSchema,
  flagDiscrepancy: flagDiscrepancySchema,
  rtwDocument: rtwDocumentSchema,
  rtwShareCode: rtwShareCodeSchema,
  rtwReview: rtwReviewSchema,
  rtwCreate: rtwCreateSchema,
  dbsApplication: dbsApplicationSchema,
  dbsCertificate: dbsCertificateSchema,
  dbsReview: dbsReviewSchema,
  adjudication: adjudicationSchema,
  caseNote: caseNoteSchema,
  moveToReview: moveToReviewSchema,
};
