/**
 * Schema Templates Library
 * Pre-built schema templates for common industries with fields, relationships, evaluation rules, and topics
 */

import { 
  SchemaDefinition, 
  FieldDefinition, 
  RelationshipDefinition, 
  SchemaEvaluationRule, 
  TopicDefinition,
  InsightCategoryConfig 
} from '@/types/schema';

/**
 * Schema template with complete industry configuration
 */
export interface SchemaTemplate {
  id: string;
  name: string;
  icon: string;
  description: string;
  previewDescription: string;
  version: string;
  industry: 'debt-collection' | 'customer-support' | 'sales' | 'healthcare' | 'airline' | 'telecom' | 'custom';
  schema: Omit<SchemaDefinition, 'id' | 'createdAt' | 'updatedAt'>;
  evaluationRules: Omit<SchemaEvaluationRule, 'id'>[];
  isCustom?: boolean;
}

/**
 * Custom template saved by user
 */
export interface CustomSchemaTemplate extends SchemaTemplate {
  isCustom: true;
  createdAt: string;
  createdBy?: string;
}

// ============================================================================
// DEBT COLLECTION TEMPLATE
// ============================================================================
export const DEBT_COLLECTION_TEMPLATE: SchemaTemplate = {
  id: 'debt-collection',
  name: 'Debt Collection',
  icon: '💰',
  description: 'For debt collection and recovery call centers',
  previewDescription: 'Complete template for debt collection operations including borrower tracking, payment arrangements, compliance requirements, and risk assessment.',
  version: '1.0.0',
  industry: 'debt-collection',
  schema: {
    name: 'Debt Collection',
    version: '1.0.0',
    businessContext: 'Debt collection call center focused on recovering outstanding balances while maintaining compliance with regulations and treating borrowers fairly.',
    fields: [
      {
        id: 'account_id',
        name: 'account_id',
        displayName: 'Account ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'borrower_name',
        name: 'borrower_name',
        displayName: 'Borrower Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Borrower',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Agent Name',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Collection Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'product',
        name: 'product',
        displayName: 'Product',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Personal Loan', 'Credit Card', 'Auto Loan', 'Mortgage', 'Line of Credit', 'Other'],
        cardinalityHint: 'low',
      },
      {
        id: 'due_amount',
        name: 'due_amount',
        displayName: 'Due Amount',
        type: 'number',
        semanticRole: 'metric',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'days_past_due',
        name: 'days_past_due',
        displayName: 'Days Past Due',
        type: 'number',
        semanticRole: 'metric',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'nationality',
        name: 'nationality',
        displayName: 'Nationality',
        type: 'string',
        semanticRole: 'dimension',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'follow_up_status',
        name: 'follow_up_status',
        displayName: 'Follow-up Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Promise to Pay', 'Payment Made', 'Refused', 'No Contact', 'Callback Scheduled', 'Dispute', 'Hardship'],
        cardinalityHint: 'low',
      },
      {
        id: 'escalated',
        name: 'escalated',
        displayName: 'Escalated',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'escalation_reason',
        name: 'escalation_reason',
        displayName: 'Escalation Reason',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Supervisor Request', 'Complaint', 'Legal Threat', 'Hardship Review', 'Dispute Resolution', 'Other'],
        cardinalityHint: 'low',
        dependsOn: {
          fieldId: 'escalated',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'show',
      },
    ],
    relationships: [
      {
        id: 'risk_score',
        type: 'complex',
        description: 'Risk score based on days past due and amount',
        formula: 'Math.min(100, (days_past_due / 90) * 50 + (due_amount / 10000) * 50)',
        involvedFields: ['days_past_due', 'due_amount'],
        displayName: 'Risk Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
      {
        id: 'dpd_amount_correlation',
        type: 'simple',
        description: 'Higher amounts tend to have more days past due',
        involvedFields: ['days_past_due', 'due_amount'],
        useInPrompt: true,
      },
    ],
    topicTaxonomy: [
      {
        id: 'payment-arrangement',
        name: 'Payment Arrangements',
        description: 'Discussions about setting up payment plans or settlements',
        keywords: ['payment plan', 'arrangement', 'settle', 'installment', 'pay off'],
        color: '#3b82f6',
      },
      {
        id: 'hardship',
        name: 'Financial Hardship',
        description: 'Customer expressing financial difficulties',
        keywords: ['hardship', 'cannot pay', 'lost job', 'medical', 'difficulty'],
        color: '#ef4444',
      },
      {
        id: 'dispute',
        name: 'Dispute & Complaints',
        description: 'Customer disputing charges or making complaints',
        keywords: ['dispute', 'wrong', 'error', 'complaint', 'not mine'],
        color: '#f59e0b',
      },
      {
        id: 'verification',
        name: 'Identity Verification',
        description: 'Verifying borrower identity and account details',
        keywords: ['verify', 'confirm', 'identity', 'date of birth', 'address'],
        color: '#8b5cf6',
      },
      {
        id: 'promise-to-pay',
        name: 'Promise to Pay',
        description: 'Customer committing to make a payment',
        keywords: ['will pay', 'promise', 'by friday', 'next week', 'payday'],
        color: '#10b981',
      },
    ],
    insightCategories: [
      {
        id: 'risk-assessment',
        name: 'Risk Assessment',
        description: 'Analyze the risk level and payment probability based on call dynamics',
        icon: '⚠️',
        color: '#ef4444',
        promptInstructions: `Analyze the call for risk indicators and payment likelihood:
- Assess the borrower's financial situation based on statements made
- Evaluate willingness to pay vs ability to pay
- Consider days past due and amount owed context
- Look for hardship indicators or dispute signals
- Determine if escalation is recommended`,
        outputFields: [
          { id: 'riskTier', name: 'Risk Tier', type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Critical'], description: 'Overall risk classification' },
          { id: 'riskScore', name: 'Risk Score', type: 'number', description: 'Numeric risk score 0-100' },
          { id: 'paymentProbability', name: 'Payment Probability', type: 'number', description: 'Likelihood of payment 0-100%' },
          { id: 'escalationRecommended', name: 'Escalation Recommended', type: 'boolean', description: 'Whether to escalate this account' },
          { id: 'detailedAnalysis', name: 'Analysis', type: 'text', description: 'Detailed risk analysis explanation' },
        ],
        enabled: true,
      },
      {
        id: 'payment-behavior',
        name: 'Payment Behavior',
        description: 'Analyze payment patterns and commitment signals',
        icon: '💳',
        color: '#3b82f6',
        promptInstructions: `Analyze the borrower's payment behavior and commitment:
- Identify any payment promises made and their specificity
- Assess historical payment pattern indicators mentioned
- Evaluate the strength of commitment language used
- Look for payment arrangement requests
- Determine follow-up timing recommendations`,
        outputFields: [
          { id: 'commitmentLevel', name: 'Commitment Level', type: 'enum', enumValues: ['None', 'Weak', 'Moderate', 'Strong'], description: 'Strength of payment commitment' },
          { id: 'promiseToPayDate', name: 'Promise to Pay Date', type: 'string', description: 'Specific date mentioned for payment if any' },
          { id: 'paymentArrangementRequested', name: 'Arrangement Requested', type: 'boolean', description: 'Whether borrower requested payment plan' },
          { id: 'behaviorIndicators', name: 'Behavior Indicators', type: 'tags', description: 'Key behavioral signals observed' },
          { id: 'followUpRecommendation', name: 'Follow-up Recommendation', type: 'text', description: 'Recommended next steps and timing' },
        ],
        enabled: true,
      },
      {
        id: 'cultural-communication',
        name: 'Cultural & Communication',
        description: 'Analyze communication effectiveness and cultural factors',
        icon: '🌍',
        color: '#8b5cf6',
        promptInstructions: `Analyze cultural and communication aspects of the call:
- Consider nationality/cultural context if available
- Assess language barrier or communication challenges
- Evaluate rapport building effectiveness
- Identify communication style preferences
- Recommend communication adjustments for future calls`,
        outputFields: [
          { id: 'communicationEffectiveness', name: 'Communication Effectiveness', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'How effective was the communication' },
          { id: 'culturalFactors', name: 'Cultural Factors', type: 'tags', description: 'Relevant cultural considerations identified' },
          { id: 'rapportLevel', name: 'Rapport Level', type: 'enum', enumValues: ['Hostile', 'Cold', 'Neutral', 'Warm', 'Positive'], description: 'Level of rapport established' },
          { id: 'recommendedAdjustments', name: 'Recommended Adjustments', type: 'text', description: 'Suggestions for improving future communication' },
        ],
        enabled: true,
      },
      {
        id: 'outcome-prediction',
        name: 'Outcome Prediction',
        description: 'Predict likely outcome and categorize call result',
        icon: '🎯',
        color: '#10b981',
        promptInstructions: `Predict and categorize the call outcome:
- Categorize into: success, promise-to-pay, refused, no-contact, callback-needed, other
- Estimate probability of successful resolution
- Identify key factors influencing the outcome
- Provide reasoning for the prediction`,
        outputFields: [
          { id: 'categorizedOutcome', name: 'Outcome Category', type: 'enum', enumValues: ['success', 'promise-to-pay', 'refused', 'no-contact', 'callback-needed', 'other'], description: 'Primary outcome category' },
          { id: 'successProbability', name: 'Success Probability', type: 'number', description: 'Likelihood of successful resolution 0-100%' },
          { id: 'keyFactors', name: 'Key Factors', type: 'tags', description: 'Main factors influencing outcome' },
          { id: 'reasoning', name: 'Reasoning', type: 'text', description: 'Explanation of outcome prediction' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Proper Opening',
      definition: 'Agent must properly identify themselves and the company within the first 30 seconds',
      evaluationCriteria: 'Agent states name, company name, and purpose of call clearly',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Hi, this is John from ABC Collections calling about your account'],
    },
    {
      type: 'Must Do',
      name: 'Mini-Miranda Disclosure',
      definition: 'Agent must provide the Mini-Miranda warning on every call',
      evaluationCriteria: 'Agent states this is an attempt to collect a debt and information will be used for that purpose',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['This is an attempt to collect a debt and any information obtained will be used for that purpose'],
    },
    {
      type: 'Must Do',
      name: 'Identity Verification',
      definition: 'Agent must verify they are speaking with the right party before discussing account details',
      evaluationCriteria: 'Agent verifies at least 2 pieces of identifying information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you please verify your date of birth and last four of your SSN?'],
    },
    {
      type: 'Must Do',
      name: 'Account Summary',
      definition: 'Agent must clearly state the amount owed and any relevant account details',
      evaluationCriteria: 'Agent mentions the current balance and account status',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your current balance is $1,234.56 and the account is 45 days past due'],
    },
    {
      type: 'Must Do',
      name: 'Payment Options',
      definition: 'Agent must offer payment options or solutions',
      evaluationCriteria: 'Agent presents at least one way for the customer to resolve the debt',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['You can pay in full today, or we can set up a payment arrangement'],
    },
    {
      type: 'Must Not Do',
      name: 'No Harassment',
      definition: 'Agent must not use threatening, harassing, or abusive language',
      evaluationCriteria: 'No threats, profanity, or intimidating statements',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid: "We will garnish your wages" or using raised voice'],
    },
    {
      type: 'Must Not Do',
      name: 'No False Statements',
      definition: 'Agent must not make false or misleading statements',
      evaluationCriteria: 'All statements about account, consequences, and options are accurate',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid: "You will go to jail if you do not pay"'],
    },
    {
      type: 'Must Do',
      name: 'Professional Tone',
      definition: 'Agent maintains professional and respectful tone throughout the call',
      evaluationCriteria: 'Agent is polite, patient, and does not escalate tension',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I understand this is a difficult situation, let me see how I can help'],
    },
    {
      type: 'Must Do',
      name: 'Proper Closing',
      definition: 'Agent must properly close the call with next steps',
      evaluationCriteria: 'Agent summarizes any agreements and states what will happen next',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['So we have agreed to a payment of $200 on Friday. I will send you a confirmation'],
    },
    {
      type: 'Must Do',
      name: 'Documentation Offer',
      definition: 'Agent must offer to send written documentation when requested',
      evaluationCriteria: 'Agent offers or agrees to send validation letter or payment confirmation',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['I can send you a letter confirming this arrangement'],
    },
  ],
};

// ============================================================================
// CUSTOMER SUPPORT TEMPLATE
// ============================================================================
export const CUSTOMER_SUPPORT_TEMPLATE: SchemaTemplate = {
  id: 'customer-support',
  name: 'Customer Support',
  icon: '🎧',
  description: 'For customer service and technical support centers',
  previewDescription: 'Comprehensive template for customer support operations including ticket management, issue resolution tracking, satisfaction measurement, and service quality evaluation.',
  version: '1.0.0',
  industry: 'customer-support',
  schema: {
    name: 'Customer Support',
    version: '1.0.0',
    businessContext: 'Customer support center focused on resolving customer issues efficiently while maintaining high satisfaction and first-call resolution rates.',
    fields: [
      {
        id: 'ticket_id',
        name: 'ticket_id',
        displayName: 'Ticket ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'customer_name',
        name: 'customer_name',
        displayName: 'Customer Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Customer',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Agent Name',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Support Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'issue_category',
        name: 'issue_category',
        displayName: 'Issue Category',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Billing', 'Technical', 'Account', 'Product', 'Shipping', 'Returns', 'General Inquiry', 'Complaint'],
        cardinalityHint: 'low',
      },
      {
        id: 'priority',
        name: 'priority',
        displayName: 'Priority',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Low', 'Medium', 'High', 'Urgent'],
        defaultValue: 'Medium',
        cardinalityHint: 'low',
      },
      {
        id: 'resolution_status',
        name: 'resolution_status',
        displayName: 'Resolution Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Resolved', 'Pending', 'Escalated', 'Follow-up Required', 'Transferred'],
        cardinalityHint: 'low',
      },
      {
        id: 'customer_tier',
        name: 'customer_tier',
        displayName: 'Customer Tier',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Standard', 'Premium', 'VIP', 'Enterprise'],
        cardinalityHint: 'low',
      },
      {
        id: 'csat_score',
        name: 'csat_score',
        displayName: 'CSAT Score',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: false,
        enableAnalytics: true,
        cardinalityHint: 'low',
      },
      {
        id: 'escalated',
        name: 'escalated',
        displayName: 'Escalated',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'escalation_reason',
        name: 'escalation_reason',
        displayName: 'Escalation Reason',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Supervisor Request', 'Technical Complexity', 'Customer Dissatisfaction', 'Policy Exception', 'Complaint', 'Other'],
        cardinalityHint: 'low',
        dependsOn: {
          fieldId: 'escalated',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'show',
      },
    ],
    relationships: [
      {
        id: 'priority_impact',
        type: 'simple',
        description: 'Higher priority tickets are more likely to be escalated',
        involvedFields: ['priority', 'escalated'],
        useInPrompt: true,
      },
      {
        id: 'resolution_satisfaction',
        type: 'simple',
        description: 'Resolution status correlates with customer satisfaction',
        involvedFields: ['resolution_status', 'csat_score'],
        useInPrompt: true,
      },
    ],
    topicTaxonomy: [
      {
        id: 'billing-inquiry',
        name: 'Billing & Payments',
        description: 'Questions about charges, payments, refunds',
        keywords: ['charge', 'bill', 'payment', 'refund', 'invoice'],
        color: '#3b82f6',
      },
      {
        id: 'technical-issue',
        name: 'Technical Issues',
        description: 'Product malfunctions, errors, bugs',
        keywords: ['not working', 'error', 'broken', 'bug', 'crash'],
        color: '#ef4444',
      },
      {
        id: 'account-management',
        name: 'Account Management',
        description: 'Account access, settings, profile changes',
        keywords: ['password', 'login', 'account', 'profile', 'settings'],
        color: '#8b5cf6',
      },
      {
        id: 'product-info',
        name: 'Product Information',
        description: 'Questions about features, usage, compatibility',
        keywords: ['how to', 'feature', 'compatible', 'works with', 'does it'],
        color: '#10b981',
      },
      {
        id: 'complaint',
        name: 'Complaints & Feedback',
        description: 'Customer complaints and negative feedback',
        keywords: ['unhappy', 'disappointed', 'complaint', 'terrible', 'worst'],
        color: '#f59e0b',
      },
    ],
    insightCategories: [
      {
        id: 'issue-complexity',
        name: 'Issue Complexity',
        description: 'Analyze the complexity and nature of the customer issue',
        icon: '🔍',
        color: '#3b82f6',
        promptInstructions: `Analyze the complexity of the customer's issue:
- Assess technical difficulty of the problem
- Determine if issue requires specialist knowledge
- Identify root cause indicators
- Evaluate if first-call resolution is achievable
- Note any recurring issue patterns`,
        outputFields: [
          { id: 'complexityLevel', name: 'Complexity Level', type: 'enum', enumValues: ['Simple', 'Moderate', 'Complex', 'Critical'], description: 'Overall issue complexity' },
          { id: 'issueType', name: 'Issue Type', type: 'enum', enumValues: ['User Error', 'Bug', 'Configuration', 'Documentation', 'Feature Request', 'Policy', 'Other'], description: 'Primary issue classification' },
          { id: 'rootCause', name: 'Root Cause', type: 'string', description: 'Identified or suspected root cause' },
          { id: 'fcrPossible', name: 'FCR Possible', type: 'boolean', description: 'Whether first-call resolution is achievable' },
          { id: 'analysis', name: 'Analysis', type: 'text', description: 'Detailed issue analysis' },
        ],
        enabled: true,
      },
      {
        id: 'customer-satisfaction',
        name: 'Customer Satisfaction',
        description: 'Predict customer satisfaction based on interaction quality',
        icon: '😊',
        color: '#10b981',
        promptInstructions: `Predict customer satisfaction based on the interaction:
- Assess customer sentiment throughout the call
- Evaluate if expectations were met
- Consider resolution quality and completeness
- Note any frustration or satisfaction signals
- Predict likely CSAT score`,
        outputFields: [
          { id: 'predictedCSAT', name: 'Predicted CSAT', type: 'number', description: 'Predicted satisfaction score 1-5' },
          { id: 'satisfactionLevel', name: 'Satisfaction Level', type: 'enum', enumValues: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], description: 'Overall satisfaction prediction' },
          { id: 'satisfactionDrivers', name: 'Satisfaction Drivers', type: 'tags', description: 'Factors positively affecting satisfaction' },
          { id: 'dissatisfactionDrivers', name: 'Dissatisfaction Drivers', type: 'tags', description: 'Factors negatively affecting satisfaction' },
          { id: 'reasoning', name: 'Reasoning', type: 'text', description: 'Explanation of satisfaction prediction' },
        ],
        enabled: true,
      },
      {
        id: 'resolution-quality',
        name: 'Resolution Quality',
        description: 'Evaluate the quality and completeness of issue resolution',
        icon: '✅',
        color: '#8b5cf6',
        promptInstructions: `Evaluate the quality of issue resolution:
- Assess if the issue was fully resolved
- Check if proper troubleshooting steps were followed
- Evaluate completeness of solution provided
- Identify any gaps or follow-up needed
- Rate overall resolution effectiveness`,
        outputFields: [
          { id: 'resolutionStatus', name: 'Resolution Status', type: 'enum', enumValues: ['Fully Resolved', 'Partially Resolved', 'Unresolved', 'Escalated', 'Pending'], description: 'Current resolution status' },
          { id: 'resolutionQuality', name: 'Resolution Quality', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'Quality of resolution provided' },
          { id: 'stepsFollowed', name: 'Steps Followed', type: 'tags', description: 'Troubleshooting steps properly followed' },
          { id: 'gapsIdentified', name: 'Gaps Identified', type: 'tags', description: 'Missing steps or information gaps' },
          { id: 'followUpNeeded', name: 'Follow-up Needed', type: 'text', description: 'Any required follow-up actions' },
        ],
        enabled: true,
      },
      {
        id: 'escalation-risk',
        name: 'Escalation Risk',
        description: 'Assess risk of escalation or complaint',
        icon: '⚡',
        color: '#ef4444',
        promptInstructions: `Assess the risk of escalation or complaint:
- Identify escalation triggers in the conversation
- Assess customer frustration level
- Evaluate if agent handled situation appropriately
- Predict likelihood of formal complaint
- Recommend de-escalation strategies if needed`,
        outputFields: [
          { id: 'escalationRisk', name: 'Escalation Risk', type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Critical'], description: 'Risk level for escalation' },
          { id: 'escalationTriggers', name: 'Escalation Triggers', type: 'tags', description: 'Factors that could trigger escalation' },
          { id: 'customerFrustration', name: 'Frustration Level', type: 'enum', enumValues: ['None', 'Mild', 'Moderate', 'High', 'Severe'], description: 'Customer frustration level' },
          { id: 'complaintLikelihood', name: 'Complaint Likelihood', type: 'number', description: 'Probability of formal complaint 0-100%' },
          { id: 'deescalationAdvice', name: 'De-escalation Advice', type: 'text', description: 'Recommended de-escalation strategies' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Greeting & Introduction',
      definition: 'Agent must greet the customer professionally and introduce themselves',
      evaluationCriteria: 'Agent says greeting, their name, and offers assistance',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Thank you for calling XYZ Support, my name is Sarah, how can I help you today?'],
    },
    {
      type: 'Must Do',
      name: 'Active Listening',
      definition: 'Agent demonstrates active listening by acknowledging the customer\'s issue',
      evaluationCriteria: 'Agent paraphrases or summarizes the issue to confirm understanding',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['So if I understand correctly, you are unable to log into your account since yesterday?'],
    },
    {
      type: 'Must Do',
      name: 'Empathy Statement',
      definition: 'Agent expresses empathy for the customer\'s situation',
      evaluationCriteria: 'Agent acknowledges the customer\'s frustration or concern',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I understand how frustrating this must be, and I am here to help resolve this for you'],
    },
    {
      type: 'Must Do',
      name: 'Troubleshooting Steps',
      definition: 'Agent follows proper troubleshooting methodology',
      evaluationCriteria: 'Agent asks relevant questions and attempts to diagnose the issue',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Let me ask a few questions to better understand the issue. When did this start?'],
    },
    {
      type: 'Must Do',
      name: 'Clear Explanation',
      definition: 'Agent explains the solution or next steps clearly',
      evaluationCriteria: 'Agent provides clear, jargon-free explanation of the resolution',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['What I am going to do is reset your password, and then I will guide you through logging in'],
    },
    {
      type: 'Must Do',
      name: 'Resolution Confirmation',
      definition: 'Agent confirms the issue is resolved or explains next steps',
      evaluationCriteria: 'Agent verifies the customer is satisfied or sets clear expectations',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Is there anything else I can help you with today?', 'You should receive an email within 24 hours'],
    },
    {
      type: 'Must Not Do',
      name: 'No Interrupting',
      definition: 'Agent should not interrupt the customer while they are speaking',
      evaluationCriteria: 'Agent waits for customer to finish before responding',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid cutting off the customer mid-sentence'],
    },
    {
      type: 'Must Do',
      name: 'Professional Tone',
      definition: 'Agent maintains professional and courteous tone throughout',
      evaluationCriteria: 'Agent remains calm, polite, and helpful even with difficult customers',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I apologize for the inconvenience this has caused'],
    },
    {
      type: 'Must Do',
      name: 'Proper Closing',
      definition: 'Agent closes the call appropriately',
      evaluationCriteria: 'Agent thanks the customer and offers further assistance',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Thank you for calling XYZ Support. Have a great day!'],
    },
    {
      type: 'Must Do',
      name: 'First Call Resolution Attempt',
      definition: 'Agent attempts to resolve the issue on the first call',
      evaluationCriteria: 'Agent makes genuine effort to resolve without unnecessary escalation',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['Let me see what I can do to fix this for you right now'],
    },
  ],
};

// ============================================================================
// SALES TEMPLATE
// ============================================================================
export const SALES_TEMPLATE: SchemaTemplate = {
  id: 'sales',
  name: 'Sales',
  icon: '📈',
  description: 'For sales and lead qualification call centers',
  previewDescription: 'Complete template for sales operations including lead tracking, deal management, competitor analysis, and sales performance evaluation.',
  version: '1.0.0',
  industry: 'sales',
  schema: {
    name: 'Sales',
    version: '1.0.0',
    businessContext: 'Sales call center focused on lead qualification, product demonstrations, closing deals, and maintaining high conversion rates.',
    fields: [
      {
        id: 'lead_id',
        name: 'lead_id',
        displayName: 'Lead ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'prospect_name',
        name: 'prospect_name',
        displayName: 'Prospect Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Prospect',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'sales_rep',
        name: 'sales_rep',
        displayName: 'Sales Rep',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Sales Representative',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'company',
        name: 'company',
        displayName: 'Company',
        type: 'string',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'deal_value',
        name: 'deal_value',
        displayName: 'Deal Value',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'product_interest',
        name: 'product_interest',
        displayName: 'Product Interest',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Basic Plan', 'Professional Plan', 'Enterprise Plan', 'Custom Solution', 'Multiple Products'],
        cardinalityHint: 'low',
      },
      {
        id: 'stage',
        name: 'stage',
        displayName: 'Pipeline Stage',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Qualification', 'Discovery', 'Demo', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'],
        cardinalityHint: 'low',
      },
      {
        id: 'lead_source',
        name: 'lead_source',
        displayName: 'Lead Source',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Website', 'Referral', 'Cold Call', 'Trade Show', 'Advertisement', 'Partner', 'Other'],
        cardinalityHint: 'low',
      },
      {
        id: 'competitor_mentioned',
        name: 'competitor_mentioned',
        displayName: 'Competitor Mentioned',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'competitor_name',
        name: 'competitor_name',
        displayName: 'Competitor Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
        dependsOn: {
          fieldId: 'competitor_mentioned',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'show',
      },
      {
        id: 'next_action',
        name: 'next_action',
        displayName: 'Next Action',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Schedule Demo', 'Send Proposal', 'Follow-up Call', 'Send Information', 'Close Deal', 'No Further Action'],
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'deal_score',
        type: 'complex',
        description: 'Lead score based on deal value and stage progression',
        formula: '(deal_value > 10000 ? 50 : deal_value / 200) + (stage === "Negotiation" ? 30 : stage === "Proposal" ? 20 : 10)',
        involvedFields: ['deal_value', 'stage'],
        displayName: 'Deal Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
      {
        id: 'value_stage_correlation',
        type: 'simple',
        description: 'Higher value deals tend to progress further in the pipeline',
        involvedFields: ['deal_value', 'stage'],
        useInPrompt: true,
      },
    ],
    topicTaxonomy: [
      {
        id: 'pricing-discussion',
        name: 'Pricing & Budget',
        description: 'Discussions about pricing, discounts, budget constraints',
        keywords: ['price', 'cost', 'budget', 'discount', 'afford'],
        color: '#3b82f6',
      },
      {
        id: 'product-demo',
        name: 'Product Demo',
        description: 'Product demonstrations and feature explanations',
        keywords: ['show me', 'demo', 'how does', 'feature', 'works'],
        color: '#10b981',
      },
      {
        id: 'objection-handling',
        name: 'Objections',
        description: 'Customer objections and concerns',
        keywords: ['concern', 'worry', 'not sure', 'hesitant', 'problem'],
        color: '#f59e0b',
      },
      {
        id: 'competitor-comparison',
        name: 'Competitor Comparison',
        description: 'Comparisons with competitor products',
        keywords: ['competitor', 'alternative', 'compared to', 'versus', 'other option'],
        color: '#ef4444',
      },
      {
        id: 'closing',
        name: 'Closing & Commitment',
        description: 'Moving towards purchase decision',
        keywords: ['ready', 'sign', 'proceed', 'start', 'next step'],
        color: '#8b5cf6',
      },
    ],
    insightCategories: [
      {
        id: 'deal-probability',
        name: 'Deal Probability',
        description: 'Analyze likelihood of closing the deal',
        icon: '🎯',
        color: '#10b981',
        promptInstructions: `Analyze the probability of closing this deal:
- Assess buying signals and commitment level
- Evaluate budget authority and timeline indicators
- Consider objections raised and how they were handled
- Look for decision-maker engagement
- Factor in competition and alternatives mentioned`,
        outputFields: [
          { id: 'closeProbability', name: 'Close Probability', type: 'number', description: 'Likelihood of closing 0-100%' },
          { id: 'dealStage', name: 'Recommended Stage', type: 'enum', enumValues: ['Qualification', 'Discovery', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'], description: 'Recommended pipeline stage' },
          { id: 'buyingSignals', name: 'Buying Signals', type: 'tags', description: 'Positive indicators observed' },
          { id: 'dealBlockers', name: 'Deal Blockers', type: 'tags', description: 'Obstacles to closing' },
          { id: 'analysis', name: 'Analysis', type: 'text', description: 'Detailed deal analysis' },
        ],
        enabled: true,
      },
      {
        id: 'objection-analysis',
        name: 'Objection Analysis',
        description: 'Analyze objections raised and handling effectiveness',
        icon: '🛡️',
        color: '#f59e0b',
        promptInstructions: `Analyze objections raised during the call:
- Identify all objections (price, timing, competition, etc.)
- Evaluate how each objection was handled
- Assess if objections were overcome
- Note any unaddressed concerns
- Recommend strategies for remaining objections`,
        outputFields: [
          { id: 'primaryObjection', name: 'Primary Objection', type: 'enum', enumValues: ['Price', 'Timing', 'Competition', 'Need', 'Authority', 'Trust', 'None'], description: 'Main objection raised' },
          { id: 'objectionCount', name: 'Objection Count', type: 'number', description: 'Number of distinct objections' },
          { id: 'handlingQuality', name: 'Handling Quality', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'How well objections were handled' },
          { id: 'objectionsList', name: 'Objections List', type: 'tags', description: 'All objections identified' },
          { id: 'recommendations', name: 'Recommendations', type: 'text', description: 'Strategies for addressing remaining objections' },
        ],
        enabled: true,
      },
      {
        id: 'competitor-intelligence',
        name: 'Competitor Intelligence',
        description: 'Extract competitive intelligence from the conversation',
        icon: '🔍',
        color: '#ef4444',
        promptInstructions: `Extract competitive intelligence from the call:
- Identify any competitors mentioned by name
- Note competitor strengths cited by prospect
- Identify competitor weaknesses or gaps
- Assess prospect's evaluation criteria
- Recommend competitive positioning strategies`,
        outputFields: [
          { id: 'competitorsIdentified', name: 'Competitors', type: 'tags', description: 'Competitors mentioned in the call' },
          { id: 'competitorStrengths', name: 'Competitor Strengths', type: 'tags', description: 'Competitor advantages mentioned' },
          { id: 'ourAdvantages', name: 'Our Advantages', type: 'tags', description: 'Our competitive advantages mentioned' },
          { id: 'competitivePosition', name: 'Competitive Position', type: 'enum', enumValues: ['Leading', 'Competitive', 'Lagging', 'Unknown'], description: 'Our position vs competition' },
          { id: 'positioningAdvice', name: 'Positioning Advice', type: 'text', description: 'Recommended competitive positioning' },
        ],
        enabled: true,
      },
      {
        id: 'buying-signals',
        name: 'Buying Signals',
        description: 'Identify and analyze buying signals and intent',
        icon: '💡',
        color: '#3b82f6',
        promptInstructions: `Identify buying signals and purchase intent:
- Look for explicit interest statements
- Note questions about pricing, implementation, timeline
- Identify stakeholder involvement indicators
- Assess urgency and timeline signals
- Evaluate BANT criteria (Budget, Authority, Need, Timeline)`,
        outputFields: [
          { id: 'intentLevel', name: 'Purchase Intent', type: 'enum', enumValues: ['None', 'Low', 'Medium', 'High', 'Very High'], description: 'Overall purchase intent level' },
          { id: 'budgetConfirmed', name: 'Budget Confirmed', type: 'boolean', description: 'Whether budget was confirmed' },
          { id: 'authorityIdentified', name: 'Authority Identified', type: 'boolean', description: 'Whether decision maker was identified' },
          { id: 'needEstablished', name: 'Need Established', type: 'boolean', description: 'Whether clear need was established' },
          { id: 'timelineIdentified', name: 'Timeline Identified', type: 'boolean', description: 'Whether purchase timeline was identified' },
          { id: 'signals', name: 'Buying Signals', type: 'tags', description: 'Specific buying signals observed' },
          { id: 'nextBestAction', name: 'Next Best Action', type: 'text', description: 'Recommended next action' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Professional Introduction',
      definition: 'Sales rep must introduce themselves and the company professionally',
      evaluationCriteria: 'Rep states name, company, and establishes credibility',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Hi, this is Mike from Acme Solutions. We specialize in helping companies like yours...'],
    },
    {
      type: 'Must Do',
      name: 'Needs Discovery',
      definition: 'Rep must ask discovery questions to understand prospect needs',
      evaluationCriteria: 'Rep asks at least 3 open-ended questions about the prospect\'s situation',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['What challenges are you currently facing with...?', 'Tell me about your current process for...'],
    },
    {
      type: 'Must Do',
      name: 'Value Proposition',
      definition: 'Rep must clearly articulate the value proposition',
      evaluationCriteria: 'Rep explains how the product/service addresses the prospect\'s specific needs',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Based on what you told me, our solution would help you reduce costs by...'],
    },
    {
      type: 'Must Do',
      name: 'Objection Handling',
      definition: 'Rep must address objections professionally',
      evaluationCriteria: 'Rep acknowledges concerns and provides relevant responses',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I understand your concern about pricing. Let me explain the ROI you can expect...'],
    },
    {
      type: 'Must Do',
      name: 'Competitor Handling',
      definition: 'Rep must handle competitor mentions professionally without disparaging',
      evaluationCriteria: 'Rep focuses on own strengths rather than competitor weaknesses',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['That is a good company. What sets us apart is our dedicated support team...'],
    },
    {
      type: 'Must Do',
      name: 'Clear Next Steps',
      definition: 'Rep must establish clear next steps',
      evaluationCriteria: 'Call ends with specific action items and timeline',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Let\'s schedule a demo for next Tuesday at 2pm. I\'ll send you a calendar invite'],
    },
    {
      type: 'Must Not Do',
      name: 'No High Pressure',
      definition: 'Rep must not use high-pressure sales tactics',
      evaluationCriteria: 'Rep does not create false urgency or pressure prospect',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid: "This offer expires today" or "You need to decide now"'],
    },
    {
      type: 'Must Do',
      name: 'Active Listening',
      definition: 'Rep demonstrates active listening throughout the call',
      evaluationCriteria: 'Rep references specific things the prospect said',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['You mentioned earlier that time savings is important to you...'],
    },
    {
      type: 'Must Do',
      name: 'Qualification Questions',
      definition: 'Rep must qualify the prospect appropriately',
      evaluationCriteria: 'Rep determines budget, authority, need, and timeline',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['What is your timeline for making a decision?', 'Who else would be involved in this decision?'],
    },
    {
      type: 'Must Do',
      name: 'Product Knowledge',
      definition: 'Rep demonstrates strong product knowledge',
      evaluationCriteria: 'Rep answers questions accurately and confidently',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['Our platform integrates with over 50 different CRM systems including...'],
    },
  ],
};

// ============================================================================
// HEALTHCARE TEMPLATE
// ============================================================================
export const HEALTHCARE_TEMPLATE: SchemaTemplate = {
  id: 'healthcare',
  name: 'Healthcare',
  icon: '🏥',
  description: 'For healthcare and medical service call centers',
  previewDescription: 'HIPAA-compliant template for healthcare operations including patient scheduling, insurance verification, medical inquiries, and compliance-focused evaluation rules.',
  version: '1.0.0',
  industry: 'healthcare',
  schema: {
    name: 'Healthcare',
    version: '1.0.0',
    businessContext: 'Healthcare call center focused on patient services, appointment scheduling, insurance verification, and medical inquiries while maintaining HIPAA compliance.',
    fields: [
      {
        id: 'patient_id',
        name: 'patient_id',
        displayName: 'Patient ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'patient_name',
        name: 'patient_name',
        displayName: 'Patient Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Patient',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Agent Name',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Healthcare Representative',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'call_type',
        name: 'call_type',
        displayName: 'Call Type',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Appointment Scheduling', 'Appointment Change', 'Insurance Verification', 'Medical Question', 'Prescription Refill', 'Test Results', 'Billing Inquiry', 'Referral Request'],
        cardinalityHint: 'low',
      },
      {
        id: 'department',
        name: 'department',
        displayName: 'Department',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Primary Care', 'Cardiology', 'Orthopedics', 'Pediatrics', 'OB/GYN', 'Neurology', 'Oncology', 'General'],
        cardinalityHint: 'low',
      },
      {
        id: 'insurance_status',
        name: 'insurance_status',
        displayName: 'Insurance Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Verified', 'Pending Verification', 'Not Covered', 'Self-Pay', 'Unknown'],
        cardinalityHint: 'low',
      },
      {
        id: 'urgency',
        name: 'urgency',
        displayName: 'Urgency',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Routine', 'Urgent', 'Emergency Referral'],
        defaultValue: 'Routine',
        cardinalityHint: 'low',
      },
      {
        id: 'resolution_status',
        name: 'resolution_status',
        displayName: 'Resolution Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Resolved', 'Transferred to Nurse', 'Transferred to Provider', 'Callback Required', 'Pending'],
        cardinalityHint: 'low',
      },
      {
        id: 'follow_up_required',
        name: 'follow_up_required',
        displayName: 'Follow-up Required',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'follow_up_date',
        name: 'follow_up_date',
        displayName: 'Follow-up Date',
        type: 'date',
        semanticRole: 'timestamp',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
        dependsOn: {
          fieldId: 'follow_up_required',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'require',
      },
      {
        id: 'hipaa_compliant',
        name: 'hipaa_compliant',
        displayName: 'HIPAA Compliant',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: false,
        enableAnalytics: true,
        defaultValue: true,
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'urgency_resolution',
        type: 'simple',
        description: 'Urgent calls require faster resolution paths',
        involvedFields: ['urgency', 'resolution_status'],
        useInPrompt: true,
      },
    ],
    topicTaxonomy: [
      {
        id: 'appointment-scheduling',
        name: 'Appointment Scheduling',
        description: 'Booking, changing, or canceling appointments',
        keywords: ['appointment', 'schedule', 'book', 'cancel', 'reschedule'],
        color: '#3b82f6',
      },
      {
        id: 'insurance-billing',
        name: 'Insurance & Billing',
        description: 'Insurance coverage, billing questions, payments',
        keywords: ['insurance', 'coverage', 'bill', 'payment', 'copay'],
        color: '#10b981',
      },
      {
        id: 'medical-inquiry',
        name: 'Medical Inquiries',
        description: 'Medical questions and health concerns',
        keywords: ['symptoms', 'medication', 'side effects', 'condition', 'treatment'],
        color: '#8b5cf6',
      },
      {
        id: 'prescription',
        name: 'Prescriptions & Refills',
        description: 'Prescription refills and medication questions',
        keywords: ['prescription', 'refill', 'medication', 'pharmacy', 'dosage'],
        color: '#f59e0b',
      },
      {
        id: 'test-results',
        name: 'Test Results',
        description: 'Lab results, imaging results, test inquiries',
        keywords: ['results', 'lab', 'test', 'bloodwork', 'scan'],
        color: '#ef4444',
      },
    ],
    insightCategories: [
      {
        id: 'urgency-assessment',
        name: 'Urgency Assessment',
        description: 'Assess the medical urgency of the patient inquiry',
        icon: '🚨',
        color: '#ef4444',
        promptInstructions: `Assess the medical urgency of this call:
- Identify any symptoms or conditions mentioned
- Evaluate if immediate medical attention may be needed
- Consider the patient's described situation severity
- Note any red flag symptoms or emergency indicators
- Recommend appropriate care pathway`,
        outputFields: [
          { id: 'urgencyLevel', name: 'Urgency Level', type: 'enum', enumValues: ['Routine', 'Semi-Urgent', 'Urgent', 'Emergency'], description: 'Assessed urgency level' },
          { id: 'symptomsIdentified', name: 'Symptoms', type: 'tags', description: 'Symptoms or conditions mentioned' },
          { id: 'redFlags', name: 'Red Flags', type: 'tags', description: 'Any concerning symptoms requiring attention' },
          { id: 'recommendedAction', name: 'Recommended Action', type: 'enum', enumValues: ['Standard Appointment', 'Same-Day Appointment', 'Nurse Triage', 'ER Referral', 'Call 911'], description: 'Recommended care pathway' },
          { id: 'assessment', name: 'Assessment', type: 'text', description: 'Detailed urgency assessment' },
        ],
        enabled: true,
      },
      {
        id: 'hipaa-compliance',
        name: 'HIPAA Compliance',
        description: 'Evaluate HIPAA compliance during the call',
        icon: '🔒',
        color: '#8b5cf6',
        promptInstructions: `Evaluate HIPAA compliance in this call:
- Check if proper identity verification was performed
- Assess if PHI was handled appropriately
- Note any potential HIPAA violations
- Evaluate authorization for third-party discussions
- Rate overall compliance level`,
        outputFields: [
          { id: 'identityVerified', name: 'Identity Verified', type: 'boolean', description: 'Whether proper identity verification was done' },
          { id: 'complianceLevel', name: 'Compliance Level', type: 'enum', enumValues: ['Non-Compliant', 'Partial', 'Compliant', 'Exemplary'], description: 'Overall HIPAA compliance' },
          { id: 'potentialIssues', name: 'Potential Issues', type: 'tags', description: 'Any compliance concerns identified' },
          { id: 'thirdPartyHandling', name: 'Third Party Handling', type: 'enum', enumValues: ['N/A', 'Proper Authorization', 'No Authorization', 'Declined Appropriately'], description: 'How third-party requests were handled' },
          { id: 'notes', name: 'Compliance Notes', type: 'text', description: 'Additional compliance observations' },
        ],
        enabled: true,
      },
      {
        id: 'patient-experience',
        name: 'Patient Experience',
        description: 'Evaluate the patient experience and satisfaction',
        icon: '💙',
        color: '#3b82f6',
        promptInstructions: `Evaluate the patient experience during this call:
- Assess empathy and compassion shown
- Evaluate clarity of information provided
- Consider wait times or inconveniences mentioned
- Note patient emotional state throughout call
- Predict patient satisfaction level`,
        outputFields: [
          { id: 'experienceRating', name: 'Experience Rating', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'Overall patient experience' },
          { id: 'empathyDisplayed', name: 'Empathy Displayed', type: 'enum', enumValues: ['None', 'Minimal', 'Adequate', 'Exceptional'], description: 'Level of empathy shown' },
          { id: 'informationClarity', name: 'Information Clarity', type: 'enum', enumValues: ['Confusing', 'Unclear', 'Clear', 'Very Clear'], description: 'How clearly information was provided' },
          { id: 'patientConcerns', name: 'Patient Concerns', type: 'tags', description: 'Concerns expressed by patient' },
          { id: 'experienceNotes', name: 'Experience Notes', type: 'text', description: 'Observations about patient experience' },
        ],
        enabled: true,
      },
      {
        id: 'care-coordination',
        name: 'Care Coordination',
        description: 'Assess care coordination and follow-up needs',
        icon: '🔄',
        color: '#10b981',
        promptInstructions: `Assess care coordination aspects of the call:
- Identify any referrals or transfers needed
- Note coordination between departments
- Evaluate follow-up arrangements made
- Check if all patient needs were addressed
- Recommend coordination improvements`,
        outputFields: [
          { id: 'coordinationQuality', name: 'Coordination Quality', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'Quality of care coordination' },
          { id: 'referralsNeeded', name: 'Referrals Needed', type: 'tags', description: 'Any referrals identified' },
          { id: 'followUpArranged', name: 'Follow-up Arranged', type: 'boolean', description: 'Whether appropriate follow-up was arranged' },
          { id: 'departmentsInvolved', name: 'Departments', type: 'tags', description: 'Departments involved or referenced' },
          { id: 'coordinationNotes', name: 'Coordination Notes', type: 'text', description: 'Care coordination observations' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'HIPAA Identity Verification',
      definition: 'Agent must verify patient identity before discussing any health information',
      evaluationCriteria: 'Agent verifies at least 2 pieces of identifying information (DOB, last 4 SSN, address)',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Before I can discuss your account, can you please verify your date of birth and address?'],
    },
    {
      type: 'Must Do',
      name: 'Professional Greeting',
      definition: 'Agent must greet patient professionally',
      evaluationCriteria: 'Agent identifies themselves and the healthcare organization',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Thank you for calling ABC Medical Center, this is Sarah speaking, how may I help you?'],
    },
    {
      type: 'Must Do',
      name: 'Empathetic Response',
      definition: 'Agent must show empathy and understanding',
      evaluationCriteria: 'Agent acknowledges patient concerns with appropriate empathy',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I understand you are concerned about your symptoms. Let me help you get the care you need'],
    },
    {
      type: 'Must Not Do',
      name: 'No Medical Advice',
      definition: 'Agent must not provide medical advice or diagnosis',
      evaluationCriteria: 'Agent refers medical questions to appropriate clinical staff',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['I am not able to advise on that, but I can transfer you to our nurse line'],
    },
    {
      type: 'Must Do',
      name: 'Accurate Information',
      definition: 'Agent provides accurate appointment and insurance information',
      evaluationCriteria: 'Agent confirms details and reads back important information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your appointment is scheduled for Monday, March 15th at 2:30 PM with Dr. Smith. Is that correct?'],
    },
    {
      type: 'Must Do',
      name: 'Clear Next Steps',
      definition: 'Agent must provide clear next steps and expectations',
      evaluationCriteria: 'Agent explains what will happen next and any patient responsibilities',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Please arrive 15 minutes early and bring your insurance card and photo ID'],
    },
    {
      type: 'Must Not Do',
      name: 'No PHI Disclosure',
      definition: 'Agent must not disclose PHI to unauthorized individuals',
      evaluationCriteria: 'Agent does not share health information without proper verification',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Verify authorization before discussing any patient information with third parties'],
    },
    {
      type: 'Must Do',
      name: 'Urgency Assessment',
      definition: 'Agent must properly assess urgency of medical situations',
      evaluationCriteria: 'Agent asks appropriate questions to determine if immediate care is needed',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Are you experiencing any chest pain, difficulty breathing, or severe symptoms right now?'],
    },
    {
      type: 'Must Do',
      name: 'Proper Documentation',
      definition: 'Agent must document the call properly',
      evaluationCriteria: 'Agent mentions documenting the conversation or creating a record',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['I have noted this in your record', 'I am documenting this request'],
    },
    {
      type: 'Must Do',
      name: 'Professional Closing',
      definition: 'Agent must close the call professionally',
      evaluationCriteria: 'Agent confirms resolution and offers further assistance',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Is there anything else I can help you with today? Thank you for calling ABC Medical Center'],
    },
  ],
};

// ============================================================================
// AIRLINE CUSTOMER SERVICE TEMPLATE
// ============================================================================
export const AIRLINE_TEMPLATE: SchemaTemplate = {
  id: 'airline',
  name: 'Airline Customer Service',
  icon: '✈️',
  description: 'For airline customer service and flight operations centers',
  previewDescription: 'Complete template for airline customer service operations including flight disruptions, rebooking, luggage claims, refunds, upgrades, special assistance, and loyalty program support.',
  version: '1.0.0',
  industry: 'airline',
  schema: {
    name: 'Airline Customer Service',
    version: '1.0.0',
    businessContext: 'Airline customer service center focused on flight disruptions, rebooking, luggage claims, and passenger assistance while maintaining service recovery, regulatory compliance, and loyalty program benefits.',
    fields: [
      {
        id: 'booking_reference',
        name: 'booking_reference',
        displayName: 'Booking Reference',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'passenger_name',
        name: 'passenger_name',
        displayName: 'Passenger Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Passenger',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Agent Name',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Airline Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'issue_type',
        name: 'issue_type',
        displayName: 'Issue Type',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Missed Flight', 'Lost Luggage', 'Delayed Luggage', 'Rebooking', 'Cancellation', 'Flight Delay', 'Refund', 'Upgrade', 'Special Assistance', 'Unaccompanied Minor'],
        cardinalityHint: 'low',
      },
      {
        id: 'flight_number',
        name: 'flight_number',
        displayName: 'Flight Number',
        type: 'string',
        semanticRole: 'dimension',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'route',
        name: 'route',
        displayName: 'Route',
        type: 'string',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'cabin_class',
        name: 'cabin_class',
        displayName: 'Cabin Class',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Economy', 'Premium Economy', 'Business', 'First'],
        cardinalityHint: 'low',
      },
      {
        id: 'loyalty_tier',
        name: 'loyalty_tier',
        displayName: 'Loyalty Tier',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['None', 'Bronze', 'Silver', 'Gold', 'Platinum'],
        defaultValue: 'None',
        cardinalityHint: 'low',
      },
      {
        id: 'compensation_offered',
        name: 'compensation_offered',
        displayName: 'Compensation Offered',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['None', 'Voucher', 'Miles', 'Refund', 'Hotel Accommodation', 'Meal Voucher', 'Lounge Access', 'Upgrade'],
        cardinalityHint: 'low',
      },
      {
        id: 'resolution_status',
        name: 'resolution_status',
        displayName: 'Resolution Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Resolved', 'Pending', 'Escalated', 'Transferred', 'Follow-up Required'],
        cardinalityHint: 'low',
      },
      {
        id: 'escalated',
        name: 'escalated',
        displayName: 'Escalated',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'escalation_reason',
        name: 'escalation_reason',
        displayName: 'Escalation Reason',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Supervisor Request', 'Compensation Dispute', 'Legal Threat', 'Safety Concern', 'VIP Passenger', 'Other'],
        cardinalityHint: 'low',
        dependsOn: {
          fieldId: 'escalated',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'show',
      },
      {
        id: 'rebooked_flight_date',
        name: 'rebooked_flight_date',
        displayName: 'Rebooked Flight Date',
        type: 'date',
        semanticRole: 'timestamp',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
        dependsOn: {
          fieldId: 'issue_type',
          operator: 'equals',
          value: 'Rebooking',
        },
        dependsOnBehavior: 'show',
      },
    ],
    relationships: [
      {
        id: 'priority_score',
        type: 'complex',
        description: 'Priority score based on loyalty tier and issue severity',
        formula: '(loyalty_tier === "Platinum" ? 40 : loyalty_tier === "Gold" ? 30 : loyalty_tier === "Silver" ? 20 : loyalty_tier === "Bronze" ? 10 : 0) + (issue_type === "Missed Flight" || issue_type === "Unaccompanied Minor" ? 30 : issue_type === "Lost Luggage" || issue_type === "Flight Delay" ? 20 : 10)',
        involvedFields: ['loyalty_tier', 'issue_type'],
        displayName: 'Priority Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
      {
        id: 'loyalty_compensation_correlation',
        type: 'simple',
        description: 'Higher loyalty tiers tend to receive better compensation offers',
        involvedFields: ['loyalty_tier', 'compensation_offered'],
        useInPrompt: true,
      },
    ],
    topicTaxonomy: [
      {
        id: 'flight-disruptions',
        name: 'Flight Disruptions',
        description: 'Issues related to missed, delayed, cancelled, or diverted flights',
        keywords: ['missed flight', 'delay', 'cancelled', 'diverted', 'overbooked', 'denied boarding', 'connection'],
        color: '#ef4444',
      },
      {
        id: 'luggage-issues',
        name: 'Luggage Issues',
        description: 'Lost, delayed, or damaged baggage claims',
        keywords: ['lost luggage', 'delayed baggage', 'damaged', 'claim', 'baggage', 'suitcase', 'tracking'],
        color: '#f59e0b',
      },
      {
        id: 'rebooking-changes',
        name: 'Rebooking & Changes',
        description: 'Flight changes, rebooking, and schedule modifications',
        keywords: ['rebook', 'change flight', 'reschedule', 'alternative', 'next available', 'transfer'],
        color: '#3b82f6',
      },
      {
        id: 'refunds-compensation',
        name: 'Refunds & Compensation',
        description: 'Refund requests and compensation discussions',
        keywords: ['refund', 'voucher', 'compensation', 'EU261', 'DOT', 'reimburse', 'expense'],
        color: '#10b981',
      },
      {
        id: 'loyalty-upgrades',
        name: 'Loyalty & Upgrades',
        description: 'Loyalty program benefits, miles, and upgrade requests',
        keywords: ['miles', 'upgrade', 'status', 'lounge', 'priority', 'elite', 'frequent flyer'],
        color: '#8b5cf6',
      },
    ],
    insightCategories: [
      {
        id: 'disruption-impact',
        name: 'Disruption Impact',
        description: 'Analyze the impact and severity of flight disruption',
        icon: '✈️',
        color: '#ef4444',
        promptInstructions: `Analyze the impact of the flight disruption on the passenger:
- Assess severity of the disruption (delay length, missed connections)
- Identify downstream impacts (missed meetings, events, connections)
- Evaluate financial impact mentioned
- Consider passenger's travel purpose (business, leisure, emergency)
- Rate overall disruption severity`,
        outputFields: [
          { id: 'disruptionSeverity', name: 'Severity', type: 'enum', enumValues: ['Minor', 'Moderate', 'Significant', 'Severe'], description: 'Overall disruption severity' },
          { id: 'delayHours', name: 'Delay Hours', type: 'number', description: 'Estimated delay in hours' },
          { id: 'downstreamImpacts', name: 'Downstream Impacts', type: 'tags', description: 'Consequential impacts identified' },
          { id: 'travelPurpose', name: 'Travel Purpose', type: 'enum', enumValues: ['Business', 'Leisure', 'Family Emergency', 'Medical', 'Unknown'], description: 'Passenger travel purpose' },
          { id: 'impactAnalysis', name: 'Impact Analysis', type: 'text', description: 'Detailed impact assessment' },
        ],
        enabled: true,
      },
      {
        id: 'compensation-eligibility',
        name: 'Compensation Eligibility',
        description: 'Assess eligibility for compensation under regulations',
        icon: '💰',
        color: '#10b981',
        promptInstructions: `Assess passenger eligibility for compensation:
- Consider EU261 regulations if applicable (EU flights)
- Consider DOT regulations if applicable (US flights)
- Evaluate if disruption was within airline control
- Assess duty of care obligations
- Recommend appropriate compensation level`,
        outputFields: [
          { id: 'eligibilityStatus', name: 'Eligibility', type: 'enum', enumValues: ['Not Eligible', 'Possibly Eligible', 'Likely Eligible', 'Definitely Eligible'], description: 'Compensation eligibility assessment' },
          { id: 'applicableRegulation', name: 'Regulation', type: 'enum', enumValues: ['EU261', 'DOT', 'Airline Policy', 'None', 'Unknown'], description: 'Applicable compensation regulation' },
          { id: 'recommendedCompensation', name: 'Recommended', type: 'tags', description: 'Recommended compensation types' },
          { id: 'airlineResponsibility', name: 'Airline Responsible', type: 'boolean', description: 'Whether disruption was airline responsibility' },
          { id: 'eligibilityNotes', name: 'Eligibility Notes', type: 'text', description: 'Compensation eligibility analysis' },
        ],
        enabled: true,
      },
      {
        id: 'service-recovery',
        name: 'Service Recovery',
        description: 'Evaluate service recovery effectiveness',
        icon: '🔄',
        color: '#3b82f6',
        promptInstructions: `Evaluate the effectiveness of service recovery:
- Assess how well the agent addressed the issue
- Evaluate rebooking or alternative options provided
- Consider compensation offered vs. expected
- Rate passenger's likely satisfaction with resolution
- Identify service recovery gaps`,
        outputFields: [
          { id: 'recoveryEffectiveness', name: 'Recovery Effectiveness', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'How effective was service recovery' },
          { id: 'optionsProvided', name: 'Options Provided', type: 'tags', description: 'Alternatives offered to passenger' },
          { id: 'passengerSatisfaction', name: 'Satisfaction Prediction', type: 'enum', enumValues: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], description: 'Predicted passenger satisfaction' },
          { id: 'recoveryGaps', name: 'Recovery Gaps', type: 'tags', description: 'Missed recovery opportunities' },
          { id: 'recoveryNotes', name: 'Recovery Notes', type: 'text', description: 'Service recovery observations' },
        ],
        enabled: true,
      },
      {
        id: 'passenger-sentiment',
        name: 'Passenger Sentiment',
        description: 'Analyze passenger emotional state and loyalty impact',
        icon: '😊',
        color: '#8b5cf6',
        promptInstructions: `Analyze passenger sentiment and loyalty impact:
- Track sentiment progression throughout the call
- Assess initial frustration level
- Evaluate sentiment change after resolution
- Consider impact on loyalty and future bookings
- Identify loyalty-saving or damaging moments`,
        outputFields: [
          { id: 'initialSentiment', name: 'Initial Sentiment', type: 'enum', enumValues: ['Very Negative', 'Negative', 'Neutral', 'Positive'], description: 'Sentiment at call start' },
          { id: 'finalSentiment', name: 'Final Sentiment', type: 'enum', enumValues: ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'], description: 'Sentiment at call end' },
          { id: 'sentimentChange', name: 'Sentiment Change', type: 'enum', enumValues: ['Worsened', 'Unchanged', 'Improved', 'Significantly Improved'], description: 'How sentiment changed' },
          { id: 'loyaltyImpact', name: 'Loyalty Impact', type: 'enum', enumValues: ['Likely Lost', 'At Risk', 'Neutral', 'Strengthened'], description: 'Impact on customer loyalty' },
          { id: 'sentimentNotes', name: 'Sentiment Notes', type: 'text', description: 'Sentiment analysis observations' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Empathy for Disruption',
      definition: 'Agent must acknowledge the inconvenience and show empathy for travel disruptions',
      evaluationCriteria: 'Agent expresses understanding and apologizes for the inconvenience caused',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I sincerely apologize for the inconvenience this delay has caused', 'I understand how frustrating it must be to miss your connection'],
    },
    {
      type: 'Must Do',
      name: 'Identity Verification',
      definition: 'Agent must verify passenger identity before making changes or discussing booking details',
      evaluationCriteria: 'Agent verifies booking reference and at least one piece of identifying information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you please confirm your booking reference and date of birth?'],
    },
    {
      type: 'Must Do',
      name: 'Rebooking Options',
      definition: 'Agent must offer available rebooking options for disrupted flights',
      evaluationCriteria: 'Agent presents at least one alternative flight option with details',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I can rebook you on the next available flight at 3:45 PM, or there is another option tomorrow morning at 7:00 AM'],
    },
    {
      type: 'Must Do',
      name: 'Compensation Disclosure',
      definition: 'Agent must inform passengers of applicable compensation rights when relevant',
      evaluationCriteria: 'Agent explains compensation entitlements for delays, cancellations, or denied boarding as per regulations',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Due to the length of your delay, you may be entitled to compensation. Let me explain your options'],
    },
    {
      type: 'Must Do',
      name: 'Luggage Claim Procedure',
      definition: 'Agent must properly initiate and explain the luggage claim process',
      evaluationCriteria: 'Agent creates a claim reference and explains next steps and timeline',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I have created a baggage claim with reference number ABC123. You should receive an update within 24 hours'],
    },
    {
      type: 'Must Do',
      name: 'Loyalty Recognition',
      definition: 'Agent must acknowledge and honor loyalty program benefits',
      evaluationCriteria: 'Agent recognizes passenger status and offers applicable benefits',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['I see you are a Gold member, so I will prioritize your rebooking and offer you lounge access while you wait'],
    },
    {
      type: 'Must Do',
      name: 'Accurate Flight Information',
      definition: 'Agent must provide accurate and current flight information',
      evaluationCriteria: 'Agent confirms flight details and reads back important information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your new flight is AA1234 departing at 6:30 PM from Gate B12. Would you like me to send this confirmation to your email?'],
    },
    {
      type: 'Must Not Do',
      name: 'No False Compensation Promises',
      definition: 'Agent must not make false or unauthorized promises about compensation',
      evaluationCriteria: 'Agent does not commit to compensation outside of policy or regulatory requirements',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid: "I will definitely get you $500 compensation" without verifying eligibility'],
    },
    {
      type: 'Must Not Do',
      name: 'No Blame on Passenger',
      definition: 'Agent must not blame the passenger for airline-caused issues',
      evaluationCriteria: 'Agent does not suggest the passenger is at fault for operational issues',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid: "You should have arrived earlier" for a missed connection due to delay'],
    },
    {
      type: 'Must Do',
      name: 'Professional Closing',
      definition: 'Agent must close the call professionally with clear next steps',
      evaluationCriteria: 'Agent summarizes the resolution and confirms passenger understanding',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['To confirm, you are now booked on flight AA5678 tomorrow at 9 AM. You will receive a confirmation email shortly. Is there anything else I can help you with?'],
    },
  ],
};

// ============================================================================
// TELECOM RETENTION TEMPLATE
// ============================================================================
export const TELECOM_RETENTION_TEMPLATE: SchemaTemplate = {
  id: 'telecom-retention',
  name: 'Telecom Retention',
  icon: '📱',
  description: 'For outbound telecom retention and churn prevention',
  previewDescription: 'Complete template for telecom retention operations including churn prevention, win-back campaigns, retention offers, competitive analysis, and customer loyalty management.',
  version: '1.0.0',
  industry: 'telecom',
  schema: {
    name: 'Telecom Retention',
    version: '1.0.0',
    businessContext: 'Outbound telecom retention center focused on reducing customer churn, presenting competitive retention offers, addressing service concerns, and maximizing customer lifetime value.',
    fields: [
      {
        id: 'account_id',
        name: 'account_id',
        displayName: 'Account ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'customer_name',
        name: 'customer_name',
        displayName: 'Customer Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Customer',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Agent Name',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Retention Specialist',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'current_plan',
        name: 'current_plan',
        displayName: 'Current Plan',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Basic', 'Standard', 'Premium', 'Unlimited', 'Family', 'Business', 'Legacy'],
        cardinalityHint: 'low',
      },
      {
        id: 'monthly_spend',
        name: 'monthly_spend',
        displayName: 'Monthly Spend',
        type: 'number',
        semanticRole: 'metric',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'tenure_months',
        name: 'tenure_months',
        displayName: 'Tenure (Months)',
        type: 'number',
        semanticRole: 'metric',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'churn_risk',
        name: 'churn_risk',
        displayName: 'Churn Risk',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Low', 'Medium', 'High', 'Critical'],
        cardinalityHint: 'low',
      },
      {
        id: 'churn_reason',
        name: 'churn_reason',
        displayName: 'Churn Reason',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Price Too High', 'Poor Coverage', 'Service Quality', 'Better Competitor Offer', 'Moving/Relocating', 'No Longer Needed', 'Contract Terms', 'Billing Issues', 'Customer Service Experience', 'Other'],
        cardinalityHint: 'low',
      },
      {
        id: 'competitor_mentioned',
        name: 'competitor_mentioned',
        displayName: 'Competitor Mentioned',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'competitor_name',
        name: 'competitor_name',
        displayName: 'Competitor Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
        dependsOn: {
          fieldId: 'competitor_mentioned',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'show',
      },
      {
        id: 'retention_offer',
        name: 'retention_offer',
        displayName: 'Retention Offer',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['None', 'Discount 10%', 'Discount 20%', 'Discount 30%', 'Free Upgrade', 'Bonus Data', 'Loyalty Credit', 'Free Device', 'Waived Fees', 'Contract Buyout', 'Custom Offer'],
        cardinalityHint: 'low',
      },
      {
        id: 'offer_accepted',
        name: 'offer_accepted',
        displayName: 'Offer Accepted',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'outcome',
        name: 'outcome',
        displayName: 'Outcome',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Retained', 'Cancelled', 'Callback Scheduled', 'Escalated', 'No Answer', 'Not Interested', 'Thinking It Over'],
        cardinalityHint: 'low',
      },
      {
        id: 'escalated',
        name: 'escalated',
        displayName: 'Escalated',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'escalation_reason',
        name: 'escalation_reason',
        displayName: 'Escalation Reason',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Manager Request', 'Special Retention Offer', 'Complaint', 'Billing Dispute', 'Technical Issue', 'VIP Customer', 'Other'],
        cardinalityHint: 'low',
        dependsOn: {
          fieldId: 'escalated',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'show',
      },
      {
        id: 'callback_date',
        name: 'callback_date',
        displayName: 'Callback Date',
        type: 'date',
        semanticRole: 'timestamp',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
        dependsOn: {
          fieldId: 'outcome',
          operator: 'equals',
          value: 'Callback Scheduled',
        },
        dependsOnBehavior: 'show',
      },
    ],
    relationships: [
      {
        id: 'customer_value_score',
        type: 'complex',
        description: 'Customer value score based on tenure and monthly spend',
        formula: 'Math.min(100, (tenure_months / 60) * 50 + (monthly_spend / 200) * 50)',
        involvedFields: ['tenure_months', 'monthly_spend'],
        displayName: 'Customer Value Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
      {
        id: 'tenure_spend_correlation',
        type: 'simple',
        description: 'Longer tenure customers often have higher monthly spend',
        involvedFields: ['tenure_months', 'monthly_spend'],
        useInPrompt: true,
      },
      {
        id: 'churn_offer_correlation',
        type: 'simple',
        description: 'Higher churn risk customers may need better retention offers',
        involvedFields: ['churn_risk', 'retention_offer'],
        useInPrompt: true,
      },
    ],
    topicTaxonomy: [
      {
        id: 'price-value',
        name: 'Price & Value',
        description: 'Discussions about pricing, value for money, and cost concerns',
        keywords: ['expensive', 'price', 'cost', 'cheaper', 'value', 'afford', 'bill', 'rate'],
        color: '#ef4444',
      },
      {
        id: 'service-quality',
        name: 'Service Quality',
        description: 'Issues with coverage, speed, reliability, and service quality',
        keywords: ['coverage', 'signal', 'speed', 'slow', 'dropped', 'quality', 'network', 'outage'],
        color: '#f59e0b',
      },
      {
        id: 'competitor-comparison',
        name: 'Competitor Comparison',
        description: 'Mentions of competitor offers and comparisons',
        keywords: ['competitor', 'switch', 'better deal', 'offer', 'promotion', 'other provider'],
        color: '#8b5cf6',
      },
      {
        id: 'contract-terms',
        name: 'Contract & Terms',
        description: 'Contract length, early termination, and terms discussions',
        keywords: ['contract', 'cancel', 'termination', 'fee', 'commitment', 'lock-in', 'terms'],
        color: '#3b82f6',
      },
      {
        id: 'retention-offers',
        name: 'Retention Offers',
        description: 'Presentation of retention offers and loyalty benefits',
        keywords: ['discount', 'offer', 'loyalty', 'upgrade', 'bonus', 'credit', 'free', 'deal'],
        color: '#10b981',
      },
    ],
    insightCategories: [
      {
        id: 'churn-probability',
        name: 'Churn Probability',
        description: 'Analyze likelihood of customer churning',
        icon: '📉',
        color: '#ef4444',
        promptInstructions: `Analyze the probability of this customer churning:
- Assess stated reasons for considering leaving
- Evaluate emotional commitment to switching
- Consider tenure and relationship depth
- Identify churn triggers mentioned
- Calculate overall churn risk`,
        outputFields: [
          { id: 'churnProbability', name: 'Churn Probability', type: 'number', description: 'Likelihood of churn 0-100%' },
          { id: 'churnRisk', name: 'Churn Risk Level', type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Imminent'], description: 'Overall churn risk category' },
          { id: 'primaryChurnDriver', name: 'Primary Driver', type: 'enum', enumValues: ['Price', 'Service Quality', 'Competition', 'Moving', 'No Longer Needed', 'Customer Service', 'Other'], description: 'Main reason for considering churn' },
          { id: 'churnTriggers', name: 'Churn Triggers', type: 'tags', description: 'Specific triggers identified' },
          { id: 'churnAnalysis', name: 'Churn Analysis', type: 'text', description: 'Detailed churn risk analysis' },
        ],
        enabled: true,
      },
      {
        id: 'competitive-threat',
        name: 'Competitive Threat',
        description: 'Analyze competitive threats and positioning',
        icon: '⚔️',
        color: '#8b5cf6',
        promptInstructions: `Analyze competitive threats from this call:
- Identify any competitors mentioned
- Note specific competitor offers cited
- Assess attractiveness of competitor offers
- Evaluate customer's evaluation criteria
- Recommend competitive counter-positioning`,
        outputFields: [
          { id: 'threatLevel', name: 'Threat Level', type: 'enum', enumValues: ['None', 'Low', 'Medium', 'High'], description: 'Level of competitive threat' },
          { id: 'competitorsMentioned', name: 'Competitors', type: 'tags', description: 'Competitors mentioned in call' },
          { id: 'competitorOffer', name: 'Competitor Offer', type: 'string', description: 'Specific competitor offer mentioned' },
          { id: 'evaluationCriteria', name: 'Customer Criteria', type: 'tags', description: 'What customer is evaluating on' },
          { id: 'counterStrategy', name: 'Counter Strategy', type: 'text', description: 'Recommended competitive response' },
        ],
        enabled: true,
      },
      {
        id: 'offer-effectiveness',
        name: 'Offer Effectiveness',
        description: 'Evaluate effectiveness of retention offers presented',
        icon: '🎁',
        color: '#10b981',
        promptInstructions: `Evaluate the effectiveness of retention offers:
- Identify all offers presented during the call
- Assess customer reaction to each offer
- Determine which offers resonated most
- Identify offer gaps (what could have worked better)
- Predict offer acceptance likelihood`,
        outputFields: [
          { id: 'offerEffectiveness', name: 'Effectiveness', type: 'enum', enumValues: ['Ineffective', 'Somewhat Effective', 'Effective', 'Very Effective'], description: 'Overall offer effectiveness' },
          { id: 'offersPresented', name: 'Offers Presented', type: 'tags', description: 'All offers mentioned' },
          { id: 'bestReceivedOffer', name: 'Best Received', type: 'string', description: 'Offer that resonated most' },
          { id: 'acceptanceLikelihood', name: 'Acceptance Likelihood', type: 'number', description: 'Probability of accepting 0-100%' },
          { id: 'offerRecommendations', name: 'Recommendations', type: 'text', description: 'Offer strategy recommendations' },
        ],
        enabled: true,
      },
      {
        id: 'customer-lifetime-value',
        name: 'Customer Value Assessment',
        description: 'Assess customer value and retention priority',
        icon: '💎',
        color: '#3b82f6',
        promptInstructions: `Assess the customer's value and retention priority:
- Consider tenure and spend level
- Evaluate growth potential
- Assess referral/influence potential
- Calculate retention investment justification
- Recommend retention effort level`,
        outputFields: [
          { id: 'valueSegment', name: 'Value Segment', type: 'enum', enumValues: ['Low Value', 'Medium Value', 'High Value', 'Premium'], description: 'Customer value segment' },
          { id: 'retentionPriority', name: 'Retention Priority', type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Critical'], description: 'How much effort to retain' },
          { id: 'lifetimeValue', name: 'Estimated LTV', type: 'number', description: 'Estimated lifetime value in currency' },
          { id: 'growthPotential', name: 'Growth Potential', type: 'enum', enumValues: ['Limited', 'Moderate', 'High'], description: 'Potential for upsell/cross-sell' },
          { id: 'valueAssessment', name: 'Value Assessment', type: 'text', description: 'Customer value analysis' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Professional Introduction',
      definition: 'Agent must introduce themselves and clearly state the purpose of the outbound call',
      evaluationCriteria: 'Agent identifies themselves, the company, and explains this is a retention/loyalty call',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Hi, this is Sarah from ABC Telecom. I am calling because we value you as a customer and wanted to discuss some exclusive offers available to you'],
    },
    {
      type: 'Must Do',
      name: 'Active Listening',
      definition: 'Agent must actively listen to customer concerns and acknowledge them',
      evaluationCriteria: 'Agent paraphrases or acknowledges specific concerns raised by the customer',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I understand that you feel the current price is too high for what you are getting. Let me see what I can do to address that'],
    },
    {
      type: 'Must Do',
      name: 'Value Reinforcement',
      definition: 'Agent must highlight the value and benefits of staying with the company',
      evaluationCriteria: 'Agent mentions specific benefits, features, or advantages of the current service',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['As a customer of 3 years, you have access to our priority support line and your loyalty rewards balance is currently at 5000 points'],
    },
    {
      type: 'Must Do',
      name: 'Personalized Offer',
      definition: 'Agent must present a retention offer tailored to customer needs',
      evaluationCriteria: 'Agent presents at least one offer that addresses the customer specific concerns',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Based on your concern about the price, I can offer you a 20% discount for the next 12 months, bringing your bill down to $60'],
    },
    {
      type: 'Must Do',
      name: 'Objection Handling',
      definition: 'Agent must professionally address objections without being pushy',
      evaluationCriteria: 'Agent responds to objections with relevant information and alternatives',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I hear that the competitor is offering a lower price. Let me show you how our total value, including the benefits you already have, compares'],
    },
    {
      type: 'Must Not Do',
      name: 'No High-Pressure Tactics',
      definition: 'Agent must not use aggressive or high-pressure sales tactics',
      evaluationCriteria: 'Agent does not pressure, guilt, or use scare tactics to retain customer',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid: "You will regret switching" or "This offer expires in 5 minutes"'],
    },
    {
      type: 'Must Not Do',
      name: 'No False Promises',
      definition: 'Agent must not make promises they cannot guarantee',
      evaluationCriteria: 'Agent does not commit to things outside their authority or misrepresent offers',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid: "I guarantee your service will never have issues again"'],
    },
    {
      type: 'Must Do',
      name: 'Respect Customer Decision',
      definition: 'Agent must respect the customer decision if they choose to cancel',
      evaluationCriteria: 'Agent accepts the decision gracefully and provides cancellation information if needed',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I understand and respect your decision. Let me provide you with the information you need for the cancellation process'],
    },
    {
      type: 'Must Do',
      name: 'Clear Next Steps',
      definition: 'Agent must clearly communicate next steps regardless of outcome',
      evaluationCriteria: 'Agent confirms what will happen next and any actions required',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Great, I have applied the 20% discount to your account. You will see this reflected on your next bill'],
    },
    {
      type: 'Must Do',
      name: 'Professional Closing',
      definition: 'Agent must close the call professionally and leave a positive impression',
      evaluationCriteria: 'Agent thanks the customer and offers future assistance',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['Thank you for your time today and for being a valued customer. Please do not hesitate to call us if you have any questions'],
    },
  ],
};

// ============================================================================
// TEMPLATE REGISTRY
// ============================================================================

/**
 * All available built-in templates
 */
export const SCHEMA_TEMPLATES: Record<string, SchemaTemplate> = {
  'debt-collection': DEBT_COLLECTION_TEMPLATE,
  'customer-support': CUSTOMER_SUPPORT_TEMPLATE,
  'sales': SALES_TEMPLATE,
  'healthcare': HEALTHCARE_TEMPLATE,
  'airline': AIRLINE_TEMPLATE,
  'telecom-retention': TELECOM_RETENTION_TEMPLATE,
};

/**
 * Get all templates including custom user templates
 */
export function getAllTemplates(): SchemaTemplate[] {
  const builtIn = Object.values(SCHEMA_TEMPLATES);
  const custom = getCustomTemplates();
  return [...builtIn, ...custom];
}

/**
 * Get a template by ID
 */
export function getTemplateById(id: string): SchemaTemplate | undefined {
  return SCHEMA_TEMPLATES[id] || getCustomTemplates().find(t => t.id === id);
}

/**
 * Check if a template has updates available
 */
export function hasTemplateUpdate(schemaTemplateId: string | undefined, schemaTemplateVersion: string | undefined): boolean {
  if (!schemaTemplateId || !schemaTemplateVersion) return false;
  const template = SCHEMA_TEMPLATES[schemaTemplateId];
  if (!template) return false;
  return template.version !== schemaTemplateVersion;
}

/**
 * Get the current version of a template
 */
export function getTemplateVersion(templateId: string): string | undefined {
  return SCHEMA_TEMPLATES[templateId]?.version;
}

// ============================================================================
// CUSTOM TEMPLATE STORAGE
// ============================================================================

const CUSTOM_TEMPLATES_KEY = 'custom-schema-templates';

/**
 * Get all custom templates saved by the user
 */
export function getCustomTemplates(): CustomSchemaTemplate[] {
  try {
    const stored = localStorage.getItem(CUSTOM_TEMPLATES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

/**
 * Save a schema as a custom template
 */
export function saveCustomTemplate(
  schema: SchemaDefinition,
  evaluationRules: Omit<SchemaEvaluationRule, 'id'>[],
  name: string,
  description: string
): CustomSchemaTemplate {
  const templates = getCustomTemplates();
  
  const newTemplate: CustomSchemaTemplate = {
    id: `custom-${Date.now()}`,
    name,
    icon: '⭐',
    description,
    previewDescription: description,
    version: '1.0.0',
    industry: 'custom',
    isCustom: true,
    createdAt: new Date().toISOString(),
    schema: {
      name: schema.name,
      version: schema.version,
      businessContext: schema.businessContext,
      fields: schema.fields,
      relationships: schema.relationships,
      topicTaxonomy: schema.topicTaxonomy,
    },
    evaluationRules,
  };
  
  templates.push(newTemplate);
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(templates));
  
  return newTemplate;
}

/**
 * Delete a custom template
 */
export function deleteCustomTemplate(templateId: string): boolean {
  const templates = getCustomTemplates();
  const filtered = templates.filter(t => t.id !== templateId);
  
  if (filtered.length === templates.length) return false;
  
  localStorage.setItem(CUSTOM_TEMPLATES_KEY, JSON.stringify(filtered));
  return true;
}

/**
 * Create a schema from a template
 */
export function createSchemaFromTemplate(template: SchemaTemplate): SchemaDefinition {
  return {
    id: `schema-${Date.now()}`,
    name: template.schema.name,
    version: template.schema.version,
    createdAt: new Date().toISOString(),
    businessContext: template.schema.businessContext,
    fields: JSON.parse(JSON.stringify(template.schema.fields)), // Deep clone
    relationships: JSON.parse(JSON.stringify(template.schema.relationships || [])),
    topicTaxonomy: JSON.parse(JSON.stringify(template.schema.topicTaxonomy || [])),
    insightCategories: JSON.parse(JSON.stringify(template.schema.insightCategories || [])),
    templateId: template.id,
    templateVersion: template.version,
  };
}
