// ============================================================
// TypeScript enums mirroring Postgres enums from Step 2
// These are the single source of truth for all status values
// in the frontend. They MUST match the database enums exactly.
// ============================================================

export enum UserType {
  Internal = 'internal',
  Client = 'client',
  Candidate = 'candidate',
}

export enum InternalRole {
  SuperAdmin = 'super_admin',
  ComplianceManager = 'compliance_manager',
  QAReviewer = 'qa_reviewer',
  CaseHandler = 'case_handler',
}

export enum CaseStatus {
  New = 'new',
  AwaitingCandidate = 'awaiting_candidate',
  InProgress = 'in_progress',
  AwaitingThirdParty = 'awaiting_third_party',
  UnderReview = 'under_review',
  Complete = 'complete',
  OnHold = 'on_hold',
  Cancelled = 'cancelled',
}

export enum CaseOutcome {
  Clear = 'clear',
  ClearWithAdvisory = 'clear_with_advisory',
  InsufficientEvidence = 'insufficient_evidence',
  AdverseInformation = 'adverse_information',
  Failed = 'failed',
}

export enum CasePriority {
  Standard = 'standard',
  Urgent = 'urgent',
  Critical = 'critical',
}

export enum CheckType {
  IdentityVerification = 'identity_verification',
  RightToWork = 'right_to_work',
  AddressHistory = 'address_history',
  ActivityHistory = 'activity_history',
  EmploymentReference = 'employment_reference',
  EducationReference = 'education_reference',
  CharacterReference = 'character_reference',
  DbsBasic = 'dbs_basic',
  DbsStandard = 'dbs_standard',
  DbsEnhanced = 'dbs_enhanced',
  CreditCheck = 'credit_check',
  DirectorshipCheck = 'directorship_check',
  MediaCheck = 'media_check',
  SanctionsCheck = 'sanctions_check',
  CriminalDeclaration = 'criminal_declaration',
  FinancialDeclaration = 'financial_declaration',
  HealthDeclaration = 'health_declaration',
}

export enum CheckStatus {
  NotStarted = 'not_started',
  AwaitingCandidate = 'awaiting_candidate',
  InProgress = 'in_progress',
  AwaitingThirdParty = 'awaiting_third_party',
  NeedsReview = 'needs_review',
  Passed = 'passed',
  Failed = 'failed',
  InsufficientEvidence = 'insufficient_evidence',
  Complete = 'complete',
  NotApplicable = 'not_applicable',
}

export enum CheckOutcome {
  Clear = 'clear',
  Adverse = 'adverse',
  Advisory = 'advisory',
  Insufficient = 'insufficient',
  NotApplicable = 'not_applicable',
}

export enum ActivityType {
  Employed = 'employed',
  SelfEmployed = 'self_employed',
  Unemployed = 'unemployed',
  Education = 'education',
  Travel = 'travel',
  CareerBreak = 'career_break',
  MaternityPaternity = 'maternity_paternity',
  Volunteering = 'volunteering',
  Other = 'other',
}

export enum DocumentType {
  Passport = 'passport',
  DrivingLicence = 'driving_licence',
  NationalId = 'national_id',
  BirthCertificate = 'birth_certificate',
  UtilityBill = 'utility_bill',
  BankStatement = 'bank_statement',
  CouncilTaxBill = 'council_tax_bill',
  TenancyAgreement = 'tenancy_agreement',
  MortgageStatement = 'mortgage_statement',
  P45 = 'p45',
  P60 = 'p60',
  Payslip = 'payslip',
  EmploymentContract = 'employment_contract',
  EducationCertificate = 'education_certificate',
  ProfessionalCertificate = 'professional_certificate',
  DbsCertificate = 'dbs_certificate',
  RightToWorkEvidence = 'right_to_work_evidence',
  ReferenceResponse = 'reference_response',
  Other = 'other',
}

export enum DocumentStatus {
  PendingReview = 'pending_review',
  Accepted = 'accepted',
  Rejected = 'rejected',
  Expired = 'expired',
}

export enum ReferenceType {
  Employment = 'employment',
  Education = 'education',
  Character = 'character',
  Landlord = 'landlord',
}

export enum ReferenceStatus {
  Draft = 'draft',
  Sent = 'sent',
  ReminderSent = 'reminder_sent',
  Received = 'received',
  DiscrepancyFlagged = 'discrepancy_flagged',
  Verified = 'verified',
  Unresponsive = 'unresponsive',
  Declined = 'declined',
}

export enum TaskStatus {
  Pending = 'pending',
  InProgress = 'in_progress',
  Completed = 'completed',
  Cancelled = 'cancelled',
}

export enum TaskPriority {
  Low = 'low',
  Medium = 'medium',
  High = 'high',
  Urgent = 'urgent',
}

export enum ReportStatus {
  Generating = 'generating',
  Ready = 'ready',
  Failed = 'failed',
  Archived = 'archived',
}

export enum RtwCheckMethod {
  ManualDocument = 'manual_document',
  Idvt = 'idvt',
  EmployerCheckingService = 'employer_checking_service',
  ShareCode = 'share_code',
}

export enum RtwStatus {
  NotStarted = 'not_started',
  DocumentSubmitted = 'document_submitted',
  UnderReview = 'under_review',
  Verified = 'verified',
  Failed = 'failed',
  Expired = 'expired',
}

export enum DbsStatus {
  NotStarted = 'not_started',
  ApplicationSubmitted = 'application_submitted',
  IdVerified = 'id_verified',
  SentToDbs = 'sent_to_dbs',
  Received = 'received',
  Clear = 'clear',
  Adverse = 'adverse',
  Disputed = 'disputed',
}
