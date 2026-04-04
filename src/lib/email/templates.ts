interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

const baseStyles = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1f2937;
  line-height: 1.6;
`;

const containerStyles = `
  max-width: 600px;
  margin: 0 auto;
  padding: 20px;
`;

const headerStyles = `
  background-color: #2563eb;
  color: white;
  padding: 30px 20px;
  text-align: center;
  border-radius: 8px 8px 0 0;
`;

const bodyStyles = `
  background-color: #f9fafb;
  padding: 30px 20px;
  border-left: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
`;

const footerStyles = `
  background-color: #f3f4f6;
  padding: 20px;
  text-align: center;
  font-size: 12px;
  color: #6b7280;
  border-left: 1px solid #e5e7eb;
  border-right: 1px solid #e5e7eb;
  border-bottom: 1px solid #e5e7eb;
  border-radius: 0 0 8px 8px;
`;

const buttonStyles = `
  display: inline-block;
  background-color: #2563eb;
  color: white;
  padding: 12px 24px;
  text-decoration: none;
  border-radius: 6px;
  font-weight: 600;
  margin: 20px 0;
`;

const urgentBoxStyles = `
  background-color: #fee2e2;
  border-left: 4px solid #ef4444;
  padding: 15px;
  margin: 20px 0;
  border-radius: 4px;
  color: #991b1b;
`;

function createEmailHTML(
  title: string,
  bodyContent: string,
  footerText?: string
): string {
  return `<!DOCTYPE html>
<html style="${baseStyles}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="background-color: #ffffff; margin: 0; padding: 20px;">
  <div style="${containerStyles}">
    <div style="${headerStyles}">
      <h1 style="margin: 0; font-size: 28px;">Instant Check</h1>
      <p style="margin: 8px 0 0 0; font-size: 14px; opacity: 0.9;">BS7858 Pre-Employment Screening</p>
    </div>
    <div style="${bodyStyles}">
      ${bodyContent}
    </div>
    <div style="${footerStyles}">
      <p style="margin: 0 0 10px 0;">Instant Check — BS7858 Pre-Employment Screening</p>
      <p style="margin: 0;">
        <a href="mailto:support@instantcheck.co.uk" style="color: #2563eb; text-decoration: none;">Contact Support</a> |
        <a href="https://instantcheck.co.uk/unsubscribe" style="color: #2563eb; text-decoration: none;">Manage Preferences</a>
      </p>
      ${footerText ? `<p style="margin: 10px 0 0 0; font-style: italic;">${footerText}</p>` : ''}
    </div>
  </div>
</body>
</html>`;
}

// TEMPLATE 1: Candidate Invite Email
interface CandidateInviteParams {
  candidateName: string;
  loginUrl: string;
  clientName: string;
  caseReference: string;
}

export function candidateInviteEmail(params: CandidateInviteParams): EmailTemplate {
  const { candidateName, loginUrl, clientName, caseReference } = params;

  const htmlBody = `
    <h2 style="margin-top: 0; color: #1f2937;">Welcome to Instant Check</h2>
    <p>Dear ${candidateName},</p>
    <p>You have been invited to complete your pre-employment vetting with <strong>${clientName}</strong>.</p>
    <p>To get started with your application, please click the button below:</p>
    <div style="text-align: center;">
      <a href="${loginUrl}" style="${buttonStyles}">Start Your Application</a>
    </div>
    <p><strong>Your Reference:</strong> ${caseReference}</p>
    <p>This is a secure process that helps us verify your background details quickly and efficiently.</p>
    <p>If you have any questions or need assistance, please contact our support team at <a href="mailto:support@instantcheck.co.uk" style="color: #2563eb;">support@instantcheck.co.uk</a>.</p>
    <p>Best regards,<br>The Instant Check Team</p>
  `;

  const textBody = `
Welcome to Instant Check

Dear ${candidateName},

You have been invited to complete your pre-employment vetting with ${clientName}.

To get started with your application, please visit the following link:
${loginUrl}

Your Reference: ${caseReference}

This is a secure process that helps us verify your background details quickly and efficiently.

If you have any questions or need assistance, please contact our support team at support@instantcheck.co.uk.

Best regards,
The Instant Check Team
  `.trim();

  return {
    subject: `Complete Your Pre-Employment Vetting - ${clientName}`,
    html: createEmailHTML('Candidate Invitation', htmlBody),
    text: textBody,
  };
}

// TEMPLATE 2: Reference Request Email
interface ReferenceRequestParams {
  refereeName: string;
  candidateName: string;
  referenceUrl: string;
  expiryDate: string;
  organisationName: string;
}

export function referenceRequestEmail(params: ReferenceRequestParams): EmailTemplate {
  const { refereeName, candidateName, referenceUrl, expiryDate, organisationName } = params;

  const htmlBody = `
    <h2 style="margin-top: 0; color: #1f2937;">Reference Request for ${candidateName}</h2>
    <p>Dear ${refereeName},</p>
    <p><strong>${candidateName}</strong> has applied for a position at <strong>${organisationName}</strong> and has provided your details as a professional reference.</p>
    <p>We would appreciate if you could take a few minutes to complete a reference questionnaire about your professional experience with them.</p>
    <div style="text-align: center;">
      <a href="${referenceUrl}" style="${buttonStyles}">Provide Reference</a>
    </div>
    <p><strong>Important:</strong> Please complete this reference by <strong>${expiryDate}</strong>.</p>
    <p>The reference form is confidential and will be used solely for employment verification purposes.</p>
    <p>If you have any questions about the reference process, please contact us at <a href="mailto:references@instantcheck.co.uk" style="color: #2563eb;">references@instantcheck.co.uk</a>.</p>
    <p>Thank you for your time and assistance.</p>
    <p>Best regards,<br>Instant Check Verification Team</p>
  `;

  const textBody = `
Reference Request for ${candidateName}

Dear ${refereeName},

${candidateName} has applied for a position at ${organisationName} and has provided your details as a professional reference.

We would appreciate if you could take a few minutes to complete a reference questionnaire about your professional experience with them.

Please visit the following link to provide your reference:
${referenceUrl}

Important: Please complete this reference by ${expiryDate}.

The reference form is confidential and will be used solely for employment verification purposes.

If you have any questions about the reference process, please contact us at references@instantcheck.co.uk.

Thank you for your time and assistance.

Best regards,
Instant Check Verification Team
  `.trim();

  return {
    subject: `Reference Request for ${candidateName}`,
    html: createEmailHTML('Reference Request', htmlBody),
    text: textBody,
  };
}

// TEMPLATE 3: Reference Reminder Email
interface ReferenceReminderParams {
  refereeName: string;
  candidateName: string;
  referenceUrl: string;
  expiryDate: string;
  reminderNumber: number;
}

export function referenceReminderEmail(params: ReferenceReminderParams): EmailTemplate {
  const { refereeName, candidateName, referenceUrl, expiryDate, reminderNumber } = params;

  const urgencyLevel = reminderNumber === 1 ? 'reminder' : 'final reminder';
  const urgencyColor = reminderNumber > 2 ? '#dc2626' : '#f59e0b';

  const htmlBody = `
    <h2 style="margin-top: 0; color: #1f2937;">Reference ${urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)} for ${candidateName}</h2>
    <p>Dear ${refereeName},</p>
    ${
      reminderNumber > 2
        ? `<div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; color: #991b1b;"><strong>This is our final reminder.</strong> Please provide the reference at your earliest convenience.</div>`
        : `<div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 4px; color: #78350f;"><strong>Friendly reminder:</strong> We have not yet received the reference for ${candidateName}.</div>`
    }
    <p>To complete the reference, please click the link below:</p>
    <div style="text-align: center;">
      <a href="${referenceUrl}" style="${buttonStyles}">Complete Reference</a>
    </div>
    <p><strong>Deadline:</strong> ${expiryDate}</p>
    <p>Your prompt response will help us complete the verification process as quickly as possible.</p>
    <p>If you have already submitted the reference, please disregard this message. Thank you!</p>
    <p>Best regards,<br>Instant Check Verification Team</p>
  `;

  const textBody = `
Reference ${urgencyLevel.charAt(0).toUpperCase() + urgencyLevel.slice(1)} for ${candidateName}

Dear ${refereeName},

${reminderNumber > 2 ? 'This is our final reminder. Please provide the reference at your earliest convenience.' : `Friendly reminder: We have not yet received the reference for ${candidateName}.`}

To complete the reference, please visit:
${referenceUrl}

Deadline: ${expiryDate}

Your prompt response will help us complete the verification process as quickly as possible.

If you have already submitted the reference, please disregard this message. Thank you!

Best regards,
Instant Check Verification Team
  `.trim();

  return {
    subject: `[${urgencyLevel.toUpperCase()}] Reference Needed for ${candidateName}`,
    html: createEmailHTML(`Reference ${urgencyLevel}`, htmlBody),
    text: textBody,
  };
}

// TEMPLATE 4: Case Completed Email
interface CaseCompletedParams {
  clientContactName: string;
  candidateName: string;
  caseReference: string;
  outcome: 'clear' | 'referred' | 'declined';
  reportUrl?: string;
}

export function caseCompletedEmail(params: CaseCompletedParams): EmailTemplate {
  const { clientContactName, candidateName, caseReference, outcome, reportUrl } = params;

  const outcomeText =
    outcome === 'clear'
      ? 'Satisfactory - all checks completed'
      : outcome === 'referred'
        ? 'Referred for Further Investigation'
        : 'Not Satisfactory';

  const outcomeColor =
    outcome === 'clear'
      ? '#10b981'
      : outcome === 'referred'
        ? '#f59e0b'
        : '#ef4444';

  const htmlBody = `
    <h2 style="margin-top: 0; color: #1f2937;">Vetting Complete for ${candidateName}</h2>
    <p>Dear ${clientContactName},</p>
    <p>The pre-employment vetting for <strong>${candidateName}</strong> has been completed.</p>
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Case Reference:</strong> ${caseReference}</p>
      <p style="margin: 0 0 10px 0;"><strong>Candidate:</strong> ${candidateName}</p>
      <p style="margin: 0; padding: 10px; background-color: white; border-left: 4px solid ${outcomeColor}; border-radius: 4px;">
        <strong>Outcome:</strong> <span style="color: ${outcomeColor};">${outcomeText}</span>
      </p>
    </div>
    ${
      reportUrl
        ? `<div style="text-align: center;">
      <a href="${reportUrl}" style="${buttonStyles}">View Full Report</a>
    </div>`
        : ''
    }
    <p>The candidate's vetting documentation is now available in your dashboard.</p>
    <p>If you have any questions regarding the outcome or need further information, please contact our team at <a href="mailto:support@instantcheck.co.uk" style="color: #2563eb;">support@instantcheck.co.uk</a>.</p>
    <p>Best regards,<br>Instant Check Team</p>
  `;

  const textBody = `
Vetting Complete for ${candidateName}

Dear ${clientContactName},

The pre-employment vetting for ${candidateName} has been completed.

Case Reference: ${caseReference}
Candidate: ${candidateName}
Outcome: ${outcomeText}

${reportUrl ? `View the full report: ${reportUrl}\n` : ''}

The candidate's vetting documentation is now available in your dashboard.

If you have any questions regarding the outcome or need further information, please contact our team at support@instantcheck.co.uk.

Best regards,
Instant Check Team
  `.trim();

  return {
    subject: `Vetting Completed: ${candidateName} (${caseReference})`,
    html: createEmailHTML('Case Completed', htmlBody),
    text: textBody,
  };
}

// TEMPLATE 5: SLA Breach Notification Email
interface SlaBreachParams {
  assigneeName: string;
  caseReference: string;
  caseUrl: string;
  daysOverdue: number;
  clientName: string;
}

export function slaBreachNotificationEmail(params: SlaBreachParams): EmailTemplate {
  const { assigneeName, caseReference, caseUrl, daysOverdue, clientName } = params;

  const htmlBody = `
    <h2 style="margin-top: 0; color: #1f2937;">SLA Breach Alert</h2>
    <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px;">
      <p style="margin: 0; color: #991b1b;"><strong>URGENT:</strong> The SLA deadline for this case has been exceeded.</p>
    </div>
    <p>Dear ${assigneeName},</p>
    <p>This is an urgent notification that case <strong>${caseReference}</strong> for <strong>${clientName}</strong> is now <strong>${daysOverdue} days overdue</strong>.</p>
    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0;"><strong>Case Reference:</strong> ${caseReference}</p>
      <p style="margin: 0 0 10px 0;"><strong>Client:</strong> ${clientName}</p>
      <p style="margin: 0;"><strong>Days Overdue:</strong> ${daysOverdue}</p>
    </div>
    <p>Immediate action is required to resolve this case. Please review the case and take appropriate steps to complete the vetting process urgently.</p>
    <div style="text-align: center;">
      <a href="${caseUrl}" style="${buttonStyles}">Review Case</a>
    </div>
    <p>Please prioritize this case to maintain our service standards.</p>
    <p>Best regards,<br>Instant Check Operations</p>
  `;

  const textBody = `
SLA Breach Alert

URGENT: The SLA deadline for this case has been exceeded.

Dear ${assigneeName},

This is an urgent notification that case ${caseReference} for ${clientName} is now ${daysOverdue} days overdue.

Case Reference: ${caseReference}
Client: ${clientName}
Days Overdue: ${daysOverdue}

Immediate action is required to resolve this case. Please review the case and take appropriate steps to complete the vetting process urgently.

Review the case: ${caseUrl}

Please prioritize this case to maintain our service standards.

Best regards,
Instant Check Operations
  `.trim();

  return {
    subject: `URGENT: SLA Breach - ${caseReference}`,
    html: createEmailHTML('SLA Breach Alert', htmlBody),
    text: textBody,
  };
}

// TEMPLATE 6: Password Reset Email
interface PasswordResetParams {
  userName: string;
  resetUrl: string;
  expiryMinutes: number;
}

export function passwordResetEmail(params: PasswordResetParams): EmailTemplate {
  const { userName, resetUrl, expiryMinutes } = params;

  const htmlBody = `
    <h2 style="margin-top: 0; color: #1f2937;">Password Reset Request</h2>
    <p>Dear ${userName},</p>
    <p>We received a request to reset the password for your Instant Check account.</p>
    <p>To reset your password, click the button below:</p>
    <div style="text-align: center;">
      <a href="${resetUrl}" style="${buttonStyles}">Reset Password</a>
    </div>
    <p><strong>This link will expire in ${expiryMinutes} minutes.</strong> If you did not request a password reset, you can safely ignore this email.</p>
    <p>For security reasons, we recommend that you:</p>
    <ul style="color: #4b5563;">
      <li>Use a strong, unique password</li>
      <li>Do not share your password with anyone</li>
      <li>Keep your credentials confidential</li>
    </ul>
    <p>If you continue to have trouble accessing your account, please contact our support team at <a href="mailto:support@instantcheck.co.uk" style="color: #2563eb;">support@instantcheck.co.uk</a>.</p>
    <p>Best regards,<br>The Instant Check Team</p>
  `;

  const textBody = `
Password Reset Request

Dear ${userName},

We received a request to reset the password for your Instant Check account.

To reset your password, please visit the following link:
${resetUrl}

This link will expire in ${expiryMinutes} minutes. If you did not request a password reset, you can safely ignore this email.

For security reasons, we recommend that you:
- Use a strong, unique password
- Do not share your password with anyone
- Keep your credentials confidential

If you continue to have trouble accessing your account, please contact our support team at support@instantcheck.co.uk.

Best regards,
The Instant Check Team
  `.trim();

  return {
    subject: 'Reset Your Instant Check Password',
    html: createEmailHTML('Password Reset', htmlBody),
    text: textBody,
  };
}
