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
  industry: 'debt-collection' | 'customer-support' | 'sales' | 'healthcare' | 'airline' | 'telecom' | 'insurance' | 'banking' | 'ecommerce' | 'it-helpdesk' | 'utilities' | 'hospitality' | 'real-estate' | 'automotive' | 'government' | 'custom';
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
      {
        id: 'audio_file_name',
        name: 'audio_file_name',
        displayName: 'Audio File Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: false,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
    ],
    relationships: [
      {
        id: 'risk_score',
        type: 'complex',
        description: 'Risk score based on days past due and amount',
        formula: 'const dpd = Number(metadata.days_past_due || 0); const amount = Number(metadata.due_amount || 0); return Math.min(100, (dpd / 90) * 50 + (amount / 10000) * 50);',
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
      {
        id: 'audio_file_name',
        name: 'audio_file_name',
        displayName: 'Audio File Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: false,
        enableAnalytics: false,
        cardinalityHint: 'high',
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
      {
        id: 'audio_file_name',
        name: 'audio_file_name',
        displayName: 'Audio File Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: false,
        enableAnalytics: false,
        cardinalityHint: 'high',
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
      {
        id: 'audio_file_name',
        name: 'audio_file_name',
        displayName: 'Audio File Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: false,
        enableAnalytics: false,
        cardinalityHint: 'high',
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
      {
        id: 'audio_file_name',
        name: 'audio_file_name',
        displayName: 'Audio File Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: false,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
    ],
    relationships: [
      {
        id: 'priority_score',
        type: 'complex',
        description: 'Priority score based on loyalty tier and issue severity',
        formula: 'const tier = metadata.loyalty_tier || "None"; const issue = metadata.issue_type || ""; const tierScore = tier === "Platinum" ? 40 : tier === "Gold" ? 30 : tier === "Silver" ? 20 : tier === "Bronze" ? 10 : 0; const issueScore = issue === "Missed Flight" || issue === "Unaccompanied Minor" ? 30 : issue === "Lost Luggage" || issue === "Flight Delay" ? 20 : 10; return tierScore + issueScore;',
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
      {
        id: 'audio_file_name',
        name: 'audio_file_name',
        displayName: 'Audio File Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: false,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
    ],
    relationships: [
      {
        id: 'customer_value_score',
        type: 'complex',
        description: 'Customer value score based on tenure and monthly spend',
        formula: 'const tenure = Number(metadata.tenure_months || 0); const spend = Number(metadata.monthly_spend || 0); return Math.min(100, (tenure / 60) * 50 + (spend / 200) * 50);',
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
// INSURANCE CLAIMS TEMPLATE
// ============================================================================
export const INSURANCE_CLAIMS_TEMPLATE: SchemaTemplate = {
  id: 'insurance-claims',
  name: 'Insurance Claims & Underwriting',
  icon: '🛡️',
  description: 'For property, casualty, health, and auto insurance claims processing',
  previewDescription: 'Comprehensive template for insurance claims operations including FNOL documentation, fraud detection, adjuster coordination, settlement authorization, and regulatory compliance tracking.',
  version: '1.0.0',
  industry: 'insurance',
  schema: {
    name: 'Insurance Claims',
    version: '1.0.0',
    businessContext: 'Insurance claims center focused on efficient First Notice of Loss documentation, accurate claim assessment, fraud prevention, and compassionate customer service during difficult situations.',
    fields: [
      {
        id: 'claim_id',
        name: 'claim_id',
        displayName: 'Claim ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'policy_number',
        name: 'policy_number',
        displayName: 'Policy Number',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'claimant_name',
        name: 'claimant_name',
        displayName: 'Claimant Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Claimant',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Claims Agent',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Claims Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'claim_type',
        name: 'claim_type',
        displayName: 'Claim Type',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Auto Collision', 'Auto Comprehensive', 'Property Fire', 'Property Theft', 'Property Water Damage', 'Health Medical', 'Health Dental', 'Liability', 'Workers Comp'],
        cardinalityHint: 'low',
      },
      {
        id: 'incident_date',
        name: 'incident_date',
        displayName: 'Incident Date',
        type: 'date',
        semanticRole: 'timestamp',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'claim_amount',
        name: 'claim_amount',
        displayName: 'Claim Amount',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'injury_severity',
        name: 'injury_severity',
        displayName: 'Injury Severity',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['None', 'Minor', 'Moderate', 'Severe', 'Fatal'],
        cardinalityHint: 'low',
      },
      {
        id: 'fraud_risk_score',
        name: 'fraud_risk_score',
        displayName: 'Fraud Risk Score',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'adjuster_name',
        name: 'adjuster_name',
        displayName: 'Adjuster Assigned',
        type: 'string',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'claim_status',
        name: 'claim_status',
        displayName: 'Claim Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['FNOL Received', 'Under Investigation', 'Pending Documentation', 'Approved', 'Denied', 'Settled', 'Closed'],
        cardinalityHint: 'low',
      },
      {
        id: 'policy_coverage',
        name: 'policy_coverage',
        displayName: 'Policy Coverage',
        type: 'string',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
    ],
    relationships: [
      {
        id: 'claim_complexity',
        type: 'complex',
        description: 'Claim complexity based on amount and injury severity',
        formula: 'const amount = Number(metadata.claim_amount || 0); const severity = metadata.injury_severity || "None"; const severityScore = {None: 0, Minor: 20, Moderate: 40, Severe: 70, Fatal: 100}[severity] || 0; const amountScore = Math.min(50, (amount / 50000) * 50); return Math.min(100, amountScore + severityScore);',
        involvedFields: ['claim_amount', 'injury_severity'],
        displayName: 'Complexity Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'fnol-documentation',
        name: 'FNOL Documentation',
        description: 'First Notice of Loss - initial claim reporting and details gathering',
        keywords: ['first notice', 'incident details', 'what happened', 'when did', 'police report'],
        color: '#3b82f6',
      },
      {
        id: 'injury-assessment',
        name: 'Injury Assessment',
        description: 'Discussion about injuries sustained in the incident',
        keywords: ['injured', 'hospital', 'medical', 'ambulance', 'doctor', 'pain'],
        color: '#ef4444',
      },
      {
        id: 'fraud-indicators',
        name: 'Fraud Indicators',
        description: 'Potential fraud red flags or inconsistencies in claim',
        keywords: ['suspicious', 'inconsistent', 'conflict', 'changed story', 'unusual'],
        color: '#f59e0b',
      },
      {
        id: 'settlement-negotiation',
        name: 'Settlement Negotiation',
        description: 'Discussion about claim payout and settlement terms',
        keywords: ['settlement', 'offer', 'payout', 'compensation', 'how much'],
        color: '#10b981',
      },
      {
        id: 'documentation-request',
        name: 'Documentation Request',
        description: 'Requesting additional documents or evidence',
        keywords: ['need documents', 'send photos', 'receipt', 'estimate', 'proof'],
        color: '#8b5cf6',
      },
    ],
    insightCategories: [
      {
        id: 'fraud-detection',
        name: 'Fraud Detection',
        description: 'Analyze call for potential fraud indicators and risk assessment',
        icon: '🚨',
        color: '#ef4444',
        promptInstructions: `Analyze the claim call for fraud indicators and risk factors:
- Identify inconsistencies in the claimant's story or timeline
- Evaluate level of detail provided about the incident
- Look for suspicious patterns (late reporting, excessive damage, opportunistic timing)
- Assess emotional appropriateness for the claimed loss
- Flag any red flags mentioned by the agent
- Consider fraud_risk_score context if available`,
        outputFields: [
          { id: 'fraudRisk', name: 'Fraud Risk', type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Critical'], description: 'Overall fraud risk assessment' },
          { id: 'fraudScore', name: 'Fraud Score', type: 'number', description: 'Numeric fraud risk 0-100' },
          { id: 'redFlags', name: 'Red Flags', type: 'tags', description: 'Specific fraud indicators identified' },
          { id: 'investigationRecommended', name: 'Investigation Recommended', type: 'boolean', description: 'Whether SIU investigation is warranted' },
          { id: 'fraudAnalysis', name: 'Fraud Analysis', type: 'text', description: 'Detailed fraud risk explanation' },
        ],
        enabled: true,
      },
      {
        id: 'empathy-assessment',
        name: 'Empathy & Compassion',
        description: 'Evaluate agent empathy during difficult situation',
        icon: '💙',
        color: '#3b82f6',
        promptInstructions: `Assess the agent's empathy and compassionate communication:
- Evaluate acknowledgment of claimant's difficult situation
- Look for empathetic phrases and active listening signals
- Assess balance between compassion and professional boundaries
- Identify moments where additional empathy was needed
- Consider injury severity context for appropriate tone`,
        outputFields: [
          { id: 'empathyLevel', name: 'Empathy Level', type: 'enum', enumValues: ['Poor', 'Adequate', 'Good', 'Exceptional'], description: 'Overall empathy rating' },
          { id: 'empathyExamples', name: 'Empathy Examples', type: 'tags', description: 'Specific empathetic phrases used' },
          { id: 'missedOpportunities', name: 'Missed Opportunities', type: 'tags', description: 'Moments where more empathy was needed' },
          { id: 'empathyScore', name: 'Empathy Score', type: 'number', description: 'Empathy score 0-100' },
        ],
        enabled: true,
      },
      {
        id: 'documentation-completeness',
        name: 'Documentation Completeness',
        description: 'Assess completeness of FNOL and claim documentation',
        icon: '📋',
        color: '#10b981',
        promptInstructions: `Evaluate the completeness of claim documentation gathered:
- Check if all FNOL elements were captured (who, what, when, where, how)
- Verify required documentation was requested
- Assess if follow-up documentation needs are clear
- Identify any missing critical information
- Evaluate clarity of next steps communicated`,
        outputFields: [
          { id: 'completenessScore', name: 'Completeness Score', type: 'number', description: 'Documentation completeness 0-100' },
          { id: 'capturedElements', name: 'Captured Elements', type: 'tags', description: 'FNOL elements successfully documented' },
          { id: 'missingElements', name: 'Missing Elements', type: 'tags', description: 'Critical information not collected' },
          { id: 'nextSteps', name: 'Next Steps Clear', type: 'boolean', description: 'Whether next steps were clearly communicated' },
        ],
        enabled: true,
      },
      {
        id: 'settlement-authority',
        name: 'Settlement Authority',
        description: 'Verify proper authorization and settlement process',
        icon: '✅',
        color: '#8b5cf6',
        promptInstructions: `Analyze settlement discussion for proper procedures:
- Check if settlement amount is within agent authority limits
- Verify proper approval process followed if needed
- Assess if coverage limits were properly explained
- Evaluate if settlement terms are clearly documented
- Flag any policy violations or unauthorized commitments`,
        outputFields: [
          { id: 'withinAuthority', name: 'Within Authority', type: 'boolean', description: 'Settlement within agent authority' },
          { id: 'approvalObtained', name: 'Approval Obtained', type: 'boolean', description: 'Supervisor approval obtained if needed' },
          { id: 'policyCompliance', name: 'Policy Compliance', type: 'enum', enumValues: ['Compliant', 'Minor Issue', 'Major Violation'], description: 'Compliance with settlement policies' },
          { id: 'complianceNotes', name: 'Compliance Notes', type: 'text', description: 'Details on settlement authorization' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Proper Introduction',
      definition: 'Agent must identify themselves, company, and purpose of call',
      evaluationCriteria: 'Agent states name, company, and that this is regarding their insurance claim',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Hi, this is Sarah from ABC Insurance. I am calling regarding your recent claim filed on January 15th'],
    },
    {
      type: 'Must Do',
      name: 'Verify Policy Holder',
      definition: 'Agent must verify identity before discussing claim details',
      evaluationCriteria: 'Agent verifies at least 2 identifying pieces of information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you please verify your date of birth and policy number?'],
    },
    {
      type: 'Must Do',
      name: 'Empathy & Acknowledgment',
      definition: 'Agent must acknowledge the difficulty of the situation with empathy',
      evaluationCriteria: 'Agent expresses understanding and compassion for the loss',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I understand this has been a difficult time for you, and I want to help get your claim processed as quickly as possible'],
    },
    {
      type: 'Must Do',
      name: 'Complete FNOL Details',
      definition: 'Agent must gather complete First Notice of Loss information',
      evaluationCriteria: 'Agent captures: date, time, location, what happened, who was involved, and damages',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you walk me through exactly what happened? When and where did the incident occur?'],
    },
    {
      type: 'Must Do',
      name: 'Injury Inquiry',
      definition: 'Agent must ask about any injuries sustained',
      evaluationCriteria: 'Agent inquires if anyone was injured and to what extent',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Was anyone injured in the accident? Did anyone seek medical attention?'],
    },
    {
      type: 'Must Do',
      name: 'Documentation Request',
      definition: 'Agent must clearly explain what documentation is needed',
      evaluationCriteria: 'Agent lists specific documents needed and how to submit them',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I will need you to send photos of the damage, the police report, and any repair estimates. You can upload these through our portal or email them to claims@insurance.com'],
    },
    {
      type: 'Must Do',
      name: 'Coverage Explanation',
      definition: 'Agent must explain coverage and what is/is not covered',
      evaluationCriteria: 'Agent clarifies coverage limits and deductible information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your policy has a $500 deductible and covers up to $50,000 for property damage'],
    },
    {
      type: 'Must Do',
      name: 'Timeline Communication',
      definition: 'Agent must provide realistic timeline for claim processing',
      evaluationCriteria: 'Agent gives specific timeframe for adjuster contact or claim resolution',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['An adjuster will contact you within 2-3 business days to schedule an inspection'],
    },
    {
      type: 'Must Not Do',
      name: 'No Unauthorized Commitments',
      definition: 'Agent must not make settlement promises outside their authority',
      evaluationCriteria: 'Agent avoids committing to specific settlement amounts without approval',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Once the adjuster completes the assessment, we will determine the appropriate settlement amount'],
    },
    {
      type: 'Must Do',
      name: 'Fraud Red Flag Documentation',
      definition: 'Agent must properly document any suspicious details or inconsistencies',
      evaluationCriteria: 'Agent notes inconsistencies or follows up on unclear details',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Just to clarify, you mentioned the accident happened on Tuesday, but earlier you said Wednesday. Can you confirm the correct date?'],
    },
  ],
};

// ============================================================================
// BANKING SUPPORT TEMPLATE
// ============================================================================
export const BANKING_SUPPORT_TEMPLATE: SchemaTemplate = {
  id: 'banking-support',
  name: 'Banking & Financial Services',
  icon: '🏦',
  description: 'For retail banking, fraud alerts, disputes, and account support',
  previewDescription: 'Complete template for banking operations including account inquiries, fraud investigation, dispute resolution, PCI compliance, transaction verification, and regulatory adherence.',
  version: '1.0.0',
  industry: 'banking',
  schema: {
    name: 'Banking Support',
    version: '1.0.0',
    businessContext: 'Retail banking support center focused on account security, fraud prevention, transaction disputes, compliance with financial regulations, and delivering exceptional customer service.',
    fields: [
      {
        id: 'account_number',
        name: 'account_number',
        displayName: 'Account Number',
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
        displayName: 'Banking Agent',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Banking Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'product_type',
        name: 'product_type',
        displayName: 'Product Type',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Checking Account', 'Savings Account', 'Credit Card', 'Personal Loan', 'Mortgage', 'Line of Credit', 'Certificate of Deposit'],
        cardinalityHint: 'low',
      },
      {
        id: 'transaction_id',
        name: 'transaction_id',
        displayName: 'Transaction ID',
        type: 'string',
        semanticRole: 'identifier',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'dispute_amount',
        name: 'dispute_amount',
        displayName: 'Dispute Amount',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'fraud_indicator',
        name: 'fraud_indicator',
        displayName: 'Fraud Indicator',
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
        id: 'customer_tenure_years',
        name: 'customer_tenure_years',
        displayName: 'Customer Tenure (Years)',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'account_balance',
        name: 'account_balance',
        displayName: 'Account Balance',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'resolution_type',
        name: 'resolution_type',
        displayName: 'Resolution Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Account Info Provided', 'Fraud Reported', 'Dispute Filed', 'Card Blocked', 'Chargeback Initiated', 'Hold Placed', 'Transfer Completed', 'Escalated'],
        cardinalityHint: 'low',
      },
      {
        id: 'compliance_flag',
        name: 'compliance_flag',
        displayName: 'Compliance Flag',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'customer_value',
        type: 'complex',
        description: 'Customer value based on tenure and balance',
        formula: 'const tenure = Number(metadata.customer_tenure_years || 0); const balance = Number(metadata.account_balance || 0); return Math.min(100, (tenure * 10) + (balance / 10000) * 20);',
        involvedFields: ['customer_tenure_years', 'account_balance'],
        displayName: 'Customer Value Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'fraud-alert',
        name: 'Fraud & Security',
        description: 'Fraud alerts, suspicious transactions, account security',
        keywords: ['fraud', 'suspicious', 'unauthorized', 'stolen', 'hacked', 'security'],
        color: '#ef4444',
      },
      {
        id: 'transaction-dispute',
        name: 'Transaction Dispute',
        description: 'Disputing charges or transactions',
        keywords: ['dispute', 'charge', 'did not make', 'wrong amount', 'refund'],
        color: '#f59e0b',
      },
      {
        id: 'account-inquiry',
        name: 'Account Inquiry',
        description: 'Balance inquiries, statement requests, account details',
        keywords: ['balance', 'statement', 'account info', 'transaction history'],
        color: '#3b82f6',
      },
      {
        id: 'authentication',
        name: 'Authentication & Verification',
        description: 'Identity verification and account access',
        keywords: ['verify', 'authenticate', 'security question', 'password', 'PIN'],
        color: '#8b5cf6',
      },
      {
        id: 'payment-transfer',
        name: 'Payments & Transfers',
        description: 'Wire transfers, bill payments, account transfers',
        keywords: ['transfer', 'wire', 'payment', 'send money', 'bill pay'],
        color: '#10b981',
      },
    ],
    insightCategories: [
      {
        id: 'fraud-investigation',
        name: 'Fraud Investigation',
        description: 'Analyze fraud indicators and investigation quality',
        icon: '🔍',
        color: '#ef4444',
        promptInstructions: `Analyze the fraud investigation process and customer responses:
- Evaluate thoroughness of agent's investigation questions
- Assess customer's credibility and consistency
- Identify fraud risk indicators from the conversation
- Determine if proper fraud protocols were followed
- Recommend next steps for fraud team`,
        outputFields: [
          { id: 'fraudLikelihood', name: 'Fraud Likelihood', type: 'enum', enumValues: ['Very Low', 'Low', 'Medium', 'High', 'Very High'], description: 'Likelihood this is fraud' },
          { id: 'investigationQuality', name: 'Investigation Quality', type: 'enum', enumValues: ['Poor', 'Adequate', 'Good', 'Thorough'], description: 'Quality of agent investigation' },
          { id: 'fraudIndicators', name: 'Fraud Indicators', type: 'tags', description: 'Red flags identified' },
          { id: 'recommendedAction', name: 'Recommended Action', type: 'text', description: 'Next steps for fraud team' },
        ],
        enabled: true,
      },
      {
        id: 'pci-compliance',
        name: 'PCI Compliance',
        description: 'Verify adherence to PCI-DSS and data security standards',
        icon: '🔒',
        color: '#8b5cf6',
        promptInstructions: `Assess PCI-DSS compliance during the call:
- Check if agent requested or stated full card numbers (violation)
- Verify proper authentication methods used
- Ensure sensitive data not captured in transcript
- Evaluate secure payment processing adherence
- Flag any compliance violations`,
        outputFields: [
          { id: 'pciCompliant', name: 'PCI Compliant', type: 'boolean', description: 'Whether call was PCI compliant' },
          { id: 'violations', name: 'Violations', type: 'tags', description: 'Any PCI violations identified' },
          { id: 'complianceScore', name: 'Compliance Score', type: 'number', description: 'Compliance score 0-100' },
          { id: 'complianceNotes', name: 'Compliance Notes', type: 'text', description: 'Detailed compliance assessment' },
        ],
        enabled: true,
      },
      {
        id: 'dispute-resolution',
        name: 'Dispute Resolution',
        description: 'Analyze dispute handling and resolution quality',
        icon: '⚖️',
        color: '#f59e0b',
        promptInstructions: `Evaluate the dispute resolution process:
- Assess agent's understanding of dispute policies
- Verify proper documentation of dispute details
- Evaluate customer communication about dispute process
- Check if timeline and next steps were clearly explained
- Determine if resolution was fair and appropriate`,
        outputFields: [
          { id: 'resolutionQuality', name: 'Resolution Quality', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'Quality of dispute resolution' },
          { id: 'procedureFollowed', name: 'Procedure Followed', type: 'boolean', description: 'Whether proper procedures followed' },
          { id: 'customerSatisfaction', name: 'Customer Satisfaction', type: 'enum', enumValues: ['Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], description: 'Customer satisfaction with resolution' },
          { id: 'resolutionNotes', name: 'Resolution Notes', type: 'text', description: 'Details on dispute resolution' },
        ],
        enabled: true,
      },
      {
        id: 'authentication-security',
        name: 'Authentication & Security',
        description: 'Assess identity verification and security protocols',
        icon: '🛡️',
        color: '#10b981',
        promptInstructions: `Analyze authentication and security measures:
- Verify proper identity verification performed
- Assess number and quality of security questions asked
- Check if agent followed security protocols before account access
- Evaluate if sensitive actions required appropriate authorization
- Identify any security gaps or improvements needed`,
        outputFields: [
          { id: 'authenticationStrength', name: 'Authentication Strength', type: 'enum', enumValues: ['Weak', 'Adequate', 'Strong', 'Multi-Factor'], description: 'Strength of authentication' },
          { id: 'securityProtocolsFollowed', name: 'Security Protocols Followed', type: 'boolean', description: 'Whether security protocols followed' },
          { id: 'verificationMethods', name: 'Verification Methods', type: 'tags', description: 'Methods used for verification' },
          { id: 'securityNotes', name: 'Security Notes', type: 'text', description: 'Security assessment details' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Proper Greeting',
      definition: 'Agent must identify themselves and the bank within first 30 seconds',
      evaluationCriteria: 'Agent states name, bank name, and department clearly',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Good morning, this is James from ABC Bank customer service. How can I help you today?'],
    },
    {
      type: 'Must Do',
      name: 'Customer Authentication',
      definition: 'Agent must verify customer identity before discussing account details',
      evaluationCriteria: 'Agent verifies at least 2 authentication factors',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['For security purposes, can you verify your date of birth and the last four digits of your social security number?'],
    },
    {
      type: 'Must Not Do',
      name: 'No Full Card Numbers',
      definition: 'Agent must never request or state full card numbers',
      evaluationCriteria: 'Agent only references last 4 digits of card number',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['I can see the card ending in 1234. Is that the card you are calling about?'],
    },
    {
      type: 'Must Do',
      name: 'Fraud Protocol',
      definition: 'For fraud cases, agent must follow proper investigation procedures',
      evaluationCriteria: 'Agent asks about transaction recognition, location, and recent card usage',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Do you recognize this transaction? Where was your card at the time? Have you shared your card or PIN with anyone?'],
    },
    {
      type: 'Must Do',
      name: 'Dispute Documentation',
      definition: 'Agent must document all required dispute details',
      evaluationCriteria: 'Agent captures transaction details, reason for dispute, and supporting information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Let me document this. The transaction was for $150 at MerchantName on March 1st, and you are disputing it because you never received the merchandise. Is that correct?'],
    },
    {
      type: 'Must Do',
      name: 'Timeline Communication',
      definition: 'Agent must provide clear timeline for resolution or next steps',
      evaluationCriteria: 'Agent gives specific timeframe for investigation or resolution',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your dispute will be investigated within 10 business days, and you will receive a provisional credit within 48 hours'],
    },
    {
      type: 'Must Do',
      name: 'Account Security Advice',
      definition: 'For security incidents, agent must provide security recommendations',
      evaluationCriteria: 'Agent suggests password change, card replacement, or account monitoring',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I recommend changing your online banking password and monitoring your account closely for any other unauthorized activity'],
    },
    {
      type: 'Must Do',
      name: 'Proper Hold Procedure',
      definition: 'Agent must ask permission and explain reason before placing on hold',
      evaluationCriteria: 'Agent requests permission and states what they will be doing',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['May I place you on a brief hold while I review your account details? This should take about 2 minutes'],
    },
    {
      type: 'Must Do',
      name: 'Confirmation of Actions',
      definition: 'Agent must summarize actions taken and confirm customer understanding',
      evaluationCriteria: 'Agent recaps what was done and verifies customer comprehension',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['To confirm, I have blocked your card, filed a fraud report, and ordered a replacement card. You should receive it in 7-10 business days. Is there anything else I can clarify?'],
    },
    {
      type: 'Must Do',
      name: 'Professional Closing',
      definition: 'Agent must thank customer and offer additional assistance',
      evaluationCriteria: 'Agent thanks customer and provides clear way to contact bank again',
      scoringStandard: { passed: 5, failed: 0 },
      examples: ['Thank you for calling ABC Bank. If you have any other questions, please feel free to call us at any time'],
    },
  ],
};

// ============================================================================
// E-COMMERCE SUPPORT TEMPLATE
// ============================================================================
export const ECOMMERCE_SUPPORT_TEMPLATE: SchemaTemplate = {
  id: 'ecommerce-support',
  name: 'E-commerce & Retail Support',
  icon: '🛒',
  description: 'For online retail, order tracking, returns, and customer inquiries',
  previewDescription: 'Complete template for e-commerce operations including order management, return processing, shipping inquiries, product knowledge assessment, upsell tracking, and customer lifetime value optimization.',
  version: '1.0.0',
  industry: 'ecommerce',
  schema: {
    name: 'E-commerce Support',
    version: '1.0.0',
    businessContext: 'E-commerce support center focused on efficient order resolution, return processing, product expertise, customer retention, and identifying upsell opportunities while maintaining high satisfaction.',
    fields: [
      {
        id: 'order_id',
        name: 'order_id',
        displayName: 'Order ID',
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
        displayName: 'Support Agent',
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
        id: 'product_sku',
        name: 'product_sku',
        displayName: 'Product SKU',
        type: 'string',
        semanticRole: 'identifier',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
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
        selectOptions: ['Order Tracking', 'Return Request', 'Product Inquiry', 'Damaged Item', 'Wrong Item', 'Shipping Delay', 'Refund Status', 'Product Recommendation'],
        cardinalityHint: 'low',
      },
      {
        id: 'return_reason',
        name: 'return_reason',
        displayName: 'Return Reason',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Wrong Size', 'Defective', 'Not as Described', 'Changed Mind', 'Better Price Elsewhere', 'Arrived Late', 'Duplicate Order'],
        cardinalityHint: 'low',
      },
      {
        id: 'refund_amount',
        name: 'refund_amount',
        displayName: 'Refund Amount',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'customer_lifetime_value',
        name: 'customer_lifetime_value',
        displayName: 'Customer Lifetime Value',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'delivery_status',
        name: 'delivery_status',
        displayName: 'Delivery Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Processing', 'Shipped', 'In Transit', 'Out for Delivery', 'Delivered', 'Delayed', 'Returned to Sender'],
        cardinalityHint: 'low',
      },
      {
        id: 'warehouse_location',
        name: 'warehouse_location',
        displayName: 'Warehouse Location',
        type: 'string',
        semanticRole: 'dimension',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'low',
      },
      {
        id: 'resolution_type',
        name: 'resolution_type',
        displayName: 'Resolution Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Tracking Provided', 'Return Initiated', 'Refund Processed', 'Replacement Sent', 'Discount Applied', 'Escalated', 'Upsell Completed'],
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'customer_retention_risk',
        type: 'complex',
        description: 'Retention risk based on CLV and issue severity',
        formula: 'const clv = Number(metadata.customer_lifetime_value || 0); const issueScore = {\"Order Tracking\": 20, \"Product Inquiry\": 10, \"Return Request\": 40, \"Damaged Item\": 60, \"Wrong Item\": 70, \"Shipping Delay\": 50, \"Refund Status\": 45}[metadata.issue_type] || 30; return Math.min(100, (clv > 1000 ? issueScore * 1.5 : issueScore));',
        involvedFields: ['customer_lifetime_value', 'issue_type'],
        displayName: 'Retention Risk Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'order-tracking',
        name: 'Order Tracking',
        description: 'Customer inquiring about order status and delivery',
        keywords: ['where is my order', 'tracking', 'shipped', 'delivery', 'when will I receive'],
        color: '#3b82f6',
      },
      {
        id: 'return-refund',
        name: 'Returns & Refunds',
        description: 'Return processing and refund requests',
        keywords: ['return', 'refund', 'send back', 'money back', 'exchange'],
        color: '#f59e0b',
      },
      {
        id: 'product-defect',
        name: 'Product Issues',
        description: 'Damaged, defective, or wrong items',
        keywords: ['damaged', 'broken', 'defective', 'wrong item', 'not working'],
        color: '#ef4444',
      },
      {
        id: 'product-inquiry',
        name: 'Product Questions',
        description: 'Product information, compatibility, recommendations',
        keywords: ['how does it work', 'compatible', 'recommend', 'features', 'specifications'],
        color: '#8b5cf6',
      },
      {
        id: 'shipping-delay',
        name: 'Shipping Delays',
        description: 'Late deliveries and shipping issues',
        keywords: ['late', 'delayed', 'not arrived', 'still waiting', 'taking too long'],
        color: '#ef4444',
      },
    ],
    insightCategories: [
      {
        id: 'retention-analysis',
        name: 'Retention & Churn Risk',
        description: 'Assess customer retention risk and satisfaction',
        icon: '💎',
        color: '#8b5cf6',
        promptInstructions: `Analyze customer retention risk and churn probability:
- Evaluate customer frustration level and satisfaction
- Consider customer lifetime value context in agent approach
- Assess likelihood customer will continue shopping with company
- Identify retention-saving actions taken by agent
- Determine if additional compensation or gestures recommended`,
        outputFields: [
          { id: 'churnRisk', name: 'Churn Risk', type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Critical'], description: 'Risk of customer churning' },
          { id: 'customerSentiment', name: 'Customer Sentiment', type: 'enum', enumValues: ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'], description: 'Overall customer sentiment' },
          { id: 'retentionActions', name: 'Retention Actions', type: 'tags', description: 'Actions taken to retain customer' },
          { id: 'recommendedGesture', name: 'Recommended Gesture', type: 'text', description: 'Suggested retention gestures if needed' },
        ],
        enabled: true,
      },
      {
        id: 'upsell-opportunities',
        name: 'Upsell Opportunities',
        description: 'Identify and evaluate upsell/cross-sell opportunities',
        icon: '📈',
        color: '#10b981',
        promptInstructions: `Analyze upsell and cross-sell opportunities in the call:
- Identify if agent recognized upsell opportunities
- Assess quality of product recommendations made
- Evaluate if upsell was appropriate for the context
- Determine if customer showed interest in additional products
- Recommend products that could have been suggested`,
        outputFields: [
          { id: 'upsellAttempted', name: 'Upsell Attempted', type: 'boolean', description: 'Whether agent attempted upsell' },
          { id: 'upsellQuality', name: 'Upsell Quality', type: 'enum', enumValues: ['Not Attempted', 'Poor', 'Good', 'Excellent'], description: 'Quality of upsell approach' },
          { id: 'customerReceptiveness', name: 'Customer Receptiveness', type: 'enum', enumValues: ['Not Interested', 'Neutral', 'Interested', 'Very Interested'], description: 'Customer interest level' },
          { id: 'missedOpportunities', name: 'Missed Opportunities', type: 'tags', description: 'Products that could have been suggested' },
          { id: 'upsellNotes', name: 'Upsell Notes', type: 'text', description: 'Details on upsell opportunities' },
        ],
        enabled: true,
      },
      {
        id: 'product-knowledge',
        name: 'Product Knowledge',
        description: 'Assess agent product expertise and accuracy',
        icon: '🎓',
        color: '#3b82f6',
        promptInstructions: `Evaluate agent's product knowledge and expertise:
- Assess accuracy of product information provided
- Evaluate confidence and clarity in explanations
- Check if agent addressed all product questions
- Identify knowledge gaps or incorrect information
- Determine if agent used resources effectively`,
        outputFields: [
          { id: 'knowledgeLevel', name: 'Knowledge Level', type: 'enum', enumValues: ['Poor', 'Basic', 'Good', 'Expert'], description: 'Agent product knowledge level' },
          { id: 'accuracyScore', name: 'Accuracy Score', type: 'number', description: 'Information accuracy 0-100' },
          { id: 'knowledgeGaps', name: 'Knowledge Gaps', type: 'tags', description: 'Topics where agent lacked knowledge' },
          { id: 'trainingRecommendations', name: 'Training Recommendations', type: 'text', description: 'Suggested training areas' },
        ],
        enabled: true,
      },
      {
        id: 'return-analysis',
        name: 'Return Reason Analysis',
        description: 'Analyze return reasons and prevent future returns',
        icon: '↩️',
        color: '#f59e0b',
        promptInstructions: `Analyze the return request and underlying causes:
- Identify the true reason for return (may differ from stated)
- Assess if return was due to product issue vs. customer expectations
- Evaluate if agent attempted to resolve without return
- Determine if this reveals product quality or description issues
- Recommend actions to prevent similar returns`,
        outputFields: [
          { id: 'returnCategory', name: 'Return Category', type: 'enum', enumValues: ['Product Defect', 'Wrong Expectations', 'Customer Error', 'Shipping Issue', 'Better Alternative'], description: 'True return category' },
          { id: 'preventable', name: 'Preventable', type: 'boolean', description: 'Whether return was preventable' },
          { id: 'rootCause', name: 'Root Cause', type: 'text', description: 'Underlying cause of return' },
          { id: 'preventionRecommendations', name: 'Prevention Recommendations', type: 'text', description: 'How to prevent future similar returns' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Friendly Greeting',
      definition: 'Agent must greet customer warmly and identify company',
      evaluationCriteria: 'Agent provides friendly greeting with company name',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Hi! Thank you for contacting ShopXYZ customer service. My name is Alex. How can I help you today?'],
    },
    {
      type: 'Must Do',
      name: 'Order Verification',
      definition: 'Agent must verify customer identity and locate order',
      evaluationCriteria: 'Agent confirms customer name, email, or order number',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can I have your order number or the email address you used for the order?'],
    },
    {
      type: 'Must Do',
      name: 'Active Listening',
      definition: 'Agent must demonstrate active listening and empathy for customer issue',
      evaluationCriteria: 'Agent acknowledges customer concern and shows understanding',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I completely understand your frustration with the delayed delivery. Let me look into this for you right away'],
    },
    {
      type: 'Must Do',
      name: 'Proactive Solutions',
      definition: 'Agent must offer solutions or alternatives without customer needing to ask',
      evaluationCriteria: 'Agent presents at least one solution or next step',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I can expedite a replacement for you at no extra charge, or if you prefer, I can process a full refund immediately'],
    },
    {
      type: 'Must Do',
      name: 'Return Policy Explanation',
      definition: 'For returns, agent must clearly explain return policy and process',
      evaluationCriteria: 'Agent states return window, process steps, and refund timeline',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Our return policy allows returns within 30 days. I will email you a prepaid return label, and once we receive the item, your refund will process within 5-7 business days'],
    },
    {
      type: 'Must Do',
      name: 'Tracking Information',
      definition: 'Agent must provide specific tracking information or delivery estimate',
      evaluationCriteria: 'Agent gives tracking number or specific delivery date range',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your tracking number is 1Z999AA10123456784, and it shows delivery expected tomorrow between 2-6 PM'],
    },
    {
      type: 'Should Do',
      name: 'Identify Upsell Opportunity',
      definition: 'Agent should recognize and attempt appropriate upsell or cross-sell',
      evaluationCriteria: 'Agent suggests complementary product or upgrade when context appropriate',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Since you are ordering the camera, many customers also find our premium carrying case very useful. Would you like me to add it at a 20% discount?'],
    },
    {
      type: 'Must Do',
      name: 'Product Knowledge',
      definition: 'Agent must provide accurate product information',
      evaluationCriteria: 'Agent answers product questions correctly or finds accurate information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Let me check the specifications for you... Yes, this model is compatible with both Windows and Mac'],
    },
    {
      type: 'Must Do',
      name: 'Compensation Appropriateness',
      definition: 'Agent must offer appropriate compensation for issues within policy guidelines',
      evaluationCriteria: 'Compensation matches issue severity and company policy',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I apologize for the inconvenience. I will refund your shipping cost and provide a 15% discount on your next order'],
    },
    {
      type: 'Must Do',
      name: 'Clear Next Steps & Follow-up',
      definition: 'Agent must clearly explain what happens next and provide follow-up information',
      evaluationCriteria: 'Agent summarizes actions, timeline, and how customer can follow up',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['To recap, I have processed your return and emailed the return label. You should receive your refund within 7 days after we receive the package. If you have any questions, you can reply to that email or call us anytime'],
    },
  ],
};

// ============================================================================
// IT HELP DESK TEMPLATE
// ============================================================================
export const IT_HELPDESK_TEMPLATE: SchemaTemplate = {
  id: 'it-helpdesk',
  name: 'IT Help Desk & Tech Support',
  icon: '💻',
  description: 'For enterprise IT support, software troubleshooting, and technical issues',
  previewDescription: 'Comprehensive template for IT help desk operations including ticket management, SLA tracking, troubleshooting methodology, escalation procedures, root cause analysis, and technical documentation.',
  version: '1.0.0',
  industry: 'it-helpdesk',
  schema: {
    name: 'IT Help Desk',
    version: '1.0.0',
    businessContext: 'IT help desk center focused on efficient technical issue resolution, proper troubleshooting methodology, SLA compliance, knowledge documentation, and customer education.',
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
        id: 'user_name',
        name: 'user_name',
        displayName: 'User Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'User',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'technician_name',
        name: 'technician_name',
        displayName: 'Technician',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Technician',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'product_module',
        name: 'product_module',
        displayName: 'Product/Module',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Email/Outlook', 'VPN/Network', 'Software Application', 'Hardware', 'Password/Access', 'Printer', 'Phone System', 'Database', 'Operating System'],
        cardinalityHint: 'low',
      },
      {
        id: 'severity_level',
        name: 'severity_level',
        displayName: 'Severity Level',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['P1 - Critical', 'P2 - High', 'P3 - Medium', 'P4 - Low'],
        cardinalityHint: 'low',
      },
      {
        id: 'error_code',
        name: 'error_code',
        displayName: 'Error Code',
        type: 'string',
        semanticRole: 'identifier',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'resolution_time_minutes',
        name: 'resolution_time_minutes',
        displayName: 'Resolution Time (Minutes)',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'sla_status',
        name: 'sla_status',
        displayName: 'SLA Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Within SLA', 'At Risk', 'Breached'],
        cardinalityHint: 'low',
      },
      {
        id: 'technician_expertise_level',
        name: 'technician_expertise_level',
        displayName: 'Technician Level',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['L1 - Tier 1', 'L2 - Tier 2', 'L3 - Senior', 'L4 - Expert'],
        cardinalityHint: 'low',
      },
      {
        id: 'root_cause',
        name: 'root_cause',
        displayName: 'Root Cause',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['User Error', 'Software Bug', 'Configuration Issue', 'Hardware Failure', 'Network Issue', 'Third-Party Service', 'Known Issue'],
        cardinalityHint: 'low',
      },
      {
        id: 'resolution_type',
        name: 'resolution_type',
        displayName: 'Resolution Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Resolved', 'Workaround Provided', 'Escalated to L2', 'Escalated to Vendor', 'Requires Change Request', 'User Trained'],
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'complexity_score',
        type: 'complex',
        description: 'Issue complexity based on severity and resolution time',
        formula: 'const severityScore = {\"P1 - Critical\": 100, \"P2 - High\": 70, \"P3 - Medium\": 40, \"P4 - Low\": 20}[metadata.severity_level] || 40; const time = Number(metadata.resolution_time_minutes || 30); const timeScore = Math.min(50, (time / 60) * 50); return Math.min(100, (severityScore * 0.6) + (timeScore * 0.4));',
        involvedFields: ['severity_level', 'resolution_time_minutes'],
        displayName: 'Complexity Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'troubleshooting',
        name: 'Troubleshooting Steps',
        description: 'Technical troubleshooting and diagnostic procedures',
        keywords: ['try this', 'restart', 'reinstall', 'check settings', 'diagnostic', 'test'],
        color: '#3b82f6',
      },
      {
        id: 'error-diagnosis',
        name: 'Error Diagnosis',
        description: 'Identifying and diagnosing error messages',
        keywords: ['error message', 'error code', 'why', 'what does mean', 'diagnosis'],
        color: '#f59e0b',
      },
      {
        id: 'escalation',
        name: 'Escalation',
        description: 'Issues requiring escalation to higher tier support',
        keywords: ['escalate', 'tier 2', 'senior tech', 'beyond my scope', 'complex issue'],
        color: '#ef4444',
      },
      {
        id: 'user-training',
        name: 'User Training',
        description: 'Teaching users how to use features or avoid issues',
        keywords: ['how to', 'show you', 'tutorial', 'learn', 'prevent'],
        color: '#10b981',
      },
      {
        id: 'ticket-documentation',
        name: 'Ticket Documentation',
        description: 'Documenting issue details and resolution steps',
        keywords: ['document', 'note', 'record', 'ticket update', 'knowledge base'],
        color: '#8b5cf6',
      },
    ],
    insightCategories: [
      {
        id: 'troubleshooting-methodology',
        name: 'Troubleshooting Methodology',
        description: 'Assess quality of troubleshooting approach and diagnostic steps',
        icon: '🔧',
        color: '#3b82f6',
        promptInstructions: `Analyze the technician's troubleshooting methodology:
- Evaluate if proper diagnostic steps were followed (gather info, isolate issue, test solution)
- Assess logical flow and systematic approach vs. random guessing
- Check if technician verified the fix before closing
- Identify shortcuts taken or steps skipped
- Rate overall troubleshooting effectiveness`,
        outputFields: [
          { id: 'methodologyQuality', name: 'Methodology Quality', type: 'enum', enumValues: ['Poor', 'Basic', 'Good', 'Excellent'], description: 'Quality of troubleshooting approach' },
          { id: 'stepsFollowed', name: 'Steps Followed', type: 'tags', description: 'Diagnostic steps taken' },
          { id: 'stepsSkipped', name: 'Steps Skipped', type: 'tags', description: 'Important steps missed' },
          { id: 'verifiedFix', name: 'Verified Fix', type: 'boolean', description: 'Whether solution was verified before closing' },
          { id: 'methodologyNotes', name: 'Methodology Notes', type: 'text', description: 'Detailed assessment of approach' },
        ],
        enabled: true,
      },
      {
        id: 'technical-knowledge',
        name: 'Technical Knowledge',
        description: 'Evaluate technician expertise and accuracy',
        icon: '🎓',
        color: '#8b5cf6',
        promptInstructions: `Assess the technician's technical knowledge and expertise:
- Evaluate accuracy of technical explanations
- Check if technician understood the root cause
- Assess confidence and clarity in technical communication
- Identify knowledge gaps or incorrect information
- Consider if expertise level matches ticket complexity`,
        outputFields: [
          { id: 'knowledgeLevel', name: 'Knowledge Level', type: 'enum', enumValues: ['Insufficient', 'Basic', 'Proficient', 'Expert'], description: 'Technician knowledge level' },
          { id: 'technicalAccuracy', name: 'Technical Accuracy', type: 'number', description: 'Accuracy of technical information 0-100' },
          { id: 'knowledgeGaps', name: 'Knowledge Gaps', type: 'tags', description: 'Areas where knowledge was lacking' },
          { id: 'trainingNeeds', name: 'Training Needs', type: 'text', description: 'Recommended training areas' },
        ],
        enabled: true,
      },
      {
        id: 'sla-compliance',
        name: 'SLA & Time Management',
        description: 'Analyze SLA adherence and time efficiency',
        icon: '⏱️',
        color: '#10b981',
        promptInstructions: `Evaluate SLA compliance and time management:
- Assess if resolution time was appropriate for issue severity
- Check if technician worked efficiently vs. unnecessarily prolonging
- Identify time wasters or efficiency opportunities
- Consider if escalation should have happened sooner
- Evaluate communication about timeline expectations`,
        outputFields: [
          { id: 'timeEfficiency', name: 'Time Efficiency', type: 'enum', enumValues: ['Inefficient', 'Adequate', 'Efficient', 'Optimal'], description: 'Time management quality' },
          { id: 'slaRisk', name: 'SLA Risk', type: 'enum', enumValues: ['None', 'Low', 'Medium', 'High'], description: 'Risk to SLA compliance' },
          { id: 'delayFactors', name: 'Delay Factors', type: 'tags', description: 'Factors that caused delays' },
          { id: 'efficiencyRecommendations', name: 'Efficiency Recommendations', type: 'text', description: 'Suggestions for improvement' },
        ],
        enabled: true,
      },
      {
        id: 'documentation-quality',
        name: 'Documentation Quality',
        description: 'Assess ticket documentation and knowledge capture',
        icon: '📝',
        color: '#f59e0b',
        promptInstructions: `Evaluate the quality of ticket documentation:
- Assess if root cause was clearly documented
- Check if resolution steps are reproducible by others
- Verify error codes and technical details were captured
- Determine if this should be added to knowledge base
- Evaluate clarity and completeness for audit trail`,
        outputFields: [
          { id: 'documentationCompleteness', name: 'Documentation Completeness', type: 'number', description: 'Completeness score 0-100' },
          { id: 'reproducibility', name: 'Reproducibility', type: 'enum', enumValues: ['Not Reproducible', 'Partially', 'Fully Reproducible'], description: 'Whether another tech could follow' },
          { id: 'knowledgeBaseWorthy', name: 'Knowledge Base Worthy', type: 'boolean', description: 'Should be added to KB' },
          { id: 'documentationNotes', name: 'Documentation Notes', type: 'text', description: 'Documentation assessment details' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Professional Introduction',
      definition: 'Technician must identify themselves and IT help desk',
      evaluationCriteria: 'Technician states name, IT help desk, and confirms ticket/issue',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Hi, this is Mike from IT Help Desk. I am calling about ticket #12345 regarding your email issue'],
    },
    {
      type: 'Must Do',
      name: 'Issue Verification',
      definition: 'Technician must verify and understand the reported issue',
      evaluationCriteria: 'Technician confirms issue details and asks clarifying questions',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you describe exactly what error message you are seeing and when it occurs?'],
    },
    {
      type: 'Must Do',
      name: 'Systematic Troubleshooting',
      definition: 'Technician must follow logical troubleshooting steps',
      evaluationCriteria: 'Technician works through diagnostic steps systematically (gather info, isolate, test)',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Let me first check if this is affecting just you or multiple users. Then we will test the connection'],
    },
    {
      type: 'Must Do',
      name: 'Technical Accuracy',
      definition: 'Technician must provide accurate technical information',
      evaluationCriteria: 'All technical explanations and solutions are correct',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['The error code 0x80070005 indicates a permissions issue. We need to adjust your access rights'],
    },
    {
      type: 'Must Do',
      name: 'User-Friendly Explanation',
      definition: 'Technician must explain technical concepts in user-friendly language',
      evaluationCriteria: 'Technician avoids jargon and explains clearly for non-technical users',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['The VPN creates a secure tunnel, like a private highway, between your computer and our network'],
    },
    {
      type: 'Must Do',
      name: 'Solution Verification',
      definition: 'Technician must verify the solution worked before closing',
      evaluationCriteria: 'Technician confirms with user that issue is resolved',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you try accessing your email again and confirm it is working properly now?'],
    },
    {
      type: 'Must Do',
      name: 'Proper Escalation',
      definition: 'Technician must escalate appropriately when beyond their expertise',
      evaluationCriteria: 'Technician recognizes limitations and escalates to appropriate tier',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['This issue requires database-level access which is handled by our Tier 2 team. I will escalate this ticket to them immediately'],
    },
    {
      type: 'Must Do',
      name: 'Ticket Documentation',
      definition: 'Technician must document troubleshooting steps and resolution',
      evaluationCriteria: 'Technician states they are documenting the issue and solution in the ticket',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I am documenting the steps we took and the solution in your ticket for future reference'],
    },
    {
      type: 'Should Do',
      name: 'User Education',
      definition: 'Technician should educate user to prevent future issues',
      evaluationCriteria: 'Technician provides tips or explains how to avoid the issue',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['To prevent this in the future, make sure to save your work before logging off'],
    },
    {
      type: 'Must Do',
      name: 'Clear Closing & Follow-up',
      definition: 'Technician must provide clear next steps and follow-up information',
      evaluationCriteria: 'Technician explains what happens next and how to reopen if needed',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I will close this ticket as resolved. If the issue returns, please respond to the ticket email or call us and reference ticket #12345'],
    },
  ],
};

// ============================================================================
// UTILITIES & ENERGY TEMPLATE
// ============================================================================
export const UTILITIES_TEMPLATE: SchemaTemplate = {
  id: 'utilities',
  name: 'Utilities & Energy Services',
  icon: '⚡',
  description: 'For electric, gas, water utility companies and energy providers',
  previewDescription: 'Complete template for utility operations including billing inquiries, outage reporting, safety protocols, payment arrangements, service connections, disconnection procedures, and regulatory compliance.',
  version: '1.0.0',
  industry: 'utilities',
  schema: {
    name: 'Utilities Services',
    version: '1.0.0',
    businessContext: 'Utility company call center focused on billing support, outage management, safety-critical communications, payment assistance, and regulatory compliance in customer interactions.',
    fields: [
      {
        id: 'account_number',
        name: 'account_number',
        displayName: 'Account Number',
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
        displayName: 'Service Agent',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Service Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'service_address',
        name: 'service_address',
        displayName: 'Service Address',
        type: 'string',
        semanticRole: 'dimension',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
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
        selectOptions: ['Billing Inquiry', 'Outage Report', 'Payment Arrangement', 'Service Connection', 'Disconnection Notice', 'High Bill Complaint', 'Safety Emergency', 'Meter Reading'],
        cardinalityHint: 'low',
      },
      {
        id: 'billing_dispute_amount',
        name: 'billing_dispute_amount',
        displayName: 'Billing Dispute Amount',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'outage_duration_hours',
        name: 'outage_duration_hours',
        displayName: 'Outage Duration (Hours)',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'meter_id',
        name: 'meter_id',
        displayName: 'Meter ID',
        type: 'string',
        semanticRole: 'identifier',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'payment_plan_terms',
        name: 'payment_plan_terms',
        displayName: 'Payment Plan Terms',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'medium',
      },
      {
        id: 'disconnect_risk',
        name: 'disconnect_risk',
        displayName: 'Disconnection Risk',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['None', 'Low', 'Moderate', 'High', 'Imminent'],
        cardinalityHint: 'low',
      },
      {
        id: 'safety_flag',
        name: 'safety_flag',
        displayName: 'Safety Flag',
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
        id: 'resolution_type',
        name: 'resolution_type',
        displayName: 'Resolution Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Billing Explained', 'Payment Arranged', 'Outage Crew Dispatched', 'Service Scheduled', 'Disconnection Prevented', 'Safety Issue Escalated', 'Meter Investigation'],
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'urgency_score',
        type: 'complex',
        description: 'Call urgency based on type and safety flags',
        formula: 'const isSafety = metadata.safety_flag === true ? 100 : 0; const typeScore = {\"Safety Emergency\": 100, \"Outage Report\": 80, \"Disconnection Notice\": 60, \"High Bill Complaint\": 40, \"Billing Inquiry\": 20}[metadata.call_type] || 30; return Math.max(isSafety, typeScore);',
        involvedFields: ['call_type', 'safety_flag'],
        displayName: 'Urgency Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'safety-emergency',
        name: 'Safety Emergency',
        description: 'Gas leaks, downed power lines, electrical hazards',
        keywords: ['gas leak', 'smell gas', 'power line down', 'sparks', 'emergency', 'danger'],
        color: '#ef4444',
      },
      {
        id: 'outage-restoration',
        name: 'Outage & Restoration',
        description: 'Power outages, service interruptions, restoration updates',
        keywords: ['power out', 'outage', 'no electricity', 'when restored', 'ETA'],
        color: '#f59e0b',
      },
      {
        id: 'billing-explanation',
        name: 'Billing Explanation',
        description: 'High bill inquiries and billing clarifications',
        keywords: ['high bill', 'charges', 'why so much', 'billing', 'explain'],
        color: '#3b82f6',
      },
      {
        id: 'payment-assistance',
        name: 'Payment Assistance',
        description: 'Payment arrangements, financial hardship, assistance programs',
        keywords: ['payment plan', 'cannot pay', 'hardship', 'assistance program', 'extension'],
        color: '#10b981',
      },
      {
        id: 'disconnection-warning',
        name: 'Disconnection',
        description: 'Disconnection notices and prevention',
        keywords: ['disconnect', 'shut off', 'notice', 'turn off service', 'final warning'],
        color: '#ef4444',
      },
    ],
    insightCategories: [
      {
        id: 'safety-protocol-compliance',
        name: 'Safety Protocol Compliance',
        description: 'Verify proper safety procedures were followed',
        icon: '🚨',
        color: '#ef4444',
        promptInstructions: `Assess safety protocol adherence during the call:
- Check if gas leak or electrical hazard was escalated immediately
- Verify agent prioritized safety over all other concerns
- Assess if proper emergency instructions were given
- Evaluate if emergency dispatch was appropriate
- Flag any safety protocol violations`,
        outputFields: [
          { id: 'safetyCompliance', name: 'Safety Compliance', type: 'enum', enumValues: ['Non-Compliant', 'Partial', 'Compliant', 'Exemplary'], description: 'Safety protocol adherence' },
          { id: 'safetyRisk', name: 'Safety Risk', type: 'enum', enumValues: ['None', 'Low', 'Moderate', 'High', 'Critical'], description: 'Safety risk level' },
          { id: 'immediateActions', name: 'Immediate Actions', type: 'tags', description: 'Safety actions taken' },
          { id: 'safetyNotes', name: 'Safety Notes', type: 'text', description: 'Safety compliance assessment' },
        ],
        enabled: true,
      },
      {
        id: 'outage-communication',
        name: 'Outage Communication',
        description: 'Evaluate quality of outage information and expectations',
        icon: '💡',
        color: '#f59e0b',
        promptInstructions: `Assess outage communication effectiveness:
- Check if agent provided restoration time estimate
- Verify crew dispatch information was communicated
- Evaluate empathy for customer inconvenience
- Assess if alternative resources offered (cooling centers, etc.)
- Determine if updates/follow-up process explained`,
        outputFields: [
          { id: 'communicationQuality', name: 'Communication Quality', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'Outage communication quality' },
          { id: 'etaProvided', name: 'ETA Provided', type: 'boolean', description: 'Whether restoration ETA given' },
          { id: 'empathyLevel', name: 'Empathy Level', type: 'enum', enumValues: ['None', 'Minimal', 'Adequate', 'Strong'], description: 'Empathy for inconvenience' },
          { id: 'communicationNotes', name: 'Communication Notes', type: 'text', description: 'Outage communication details' },
        ],
        enabled: true,
      },
      {
        id: 'payment-plan-appropriateness',
        name: 'Payment Plan Appropriateness',
        description: 'Assess payment arrangement quality and compliance',
        icon: '💳',
        color: '#10b981',
        promptInstructions: `Evaluate payment arrangement appropriateness:
- Check if payment plan meets company policies
- Assess if terms are realistic for customer situation
- Verify proper authorization obtained if needed
- Evaluate if disconnection timeline clearly communicated
- Determine if assistance programs were mentioned`,
        outputFields: [
          { id: 'planAppropriate', name: 'Plan Appropriate', type: 'boolean', description: 'Whether plan is appropriate' },
          { id: 'withinPolicy', name: 'Within Policy', type: 'boolean', description: 'Compliant with policies' },
          { id: 'assistanceMentioned', name: 'Assistance Programs Mentioned', type: 'boolean', description: 'Whether assistance programs offered' },
          { id: 'paymentNotes', name: 'Payment Notes', type: 'text', description: 'Payment plan assessment' },
        ],
        enabled: true,
      },
      {
        id: 'regulatory-compliance',
        name: 'Regulatory Compliance',
        description: 'Verify compliance with utility regulations',
        icon: '⚖️',
        color: '#8b5cf6',
        promptInstructions: `Assess regulatory compliance during the call:
- Check if required disconnection warnings provided
- Verify proper notice periods mentioned
- Assess if vulnerable customer protections discussed (medical, elderly)
- Evaluate if consumer rights explained appropriately
- Flag any regulatory violations`,
        outputFields: [
          { id: 'regulatoryCompliant', name: 'Regulatory Compliant', type: 'boolean', description: 'Whether call was compliant' },
          { id: 'violations', name: 'Violations', type: 'tags', description: 'Any regulatory violations' },
          { id: 'protectionsMentioned', name: 'Protections Mentioned', type: 'tags', description: 'Customer protections discussed' },
          { id: 'complianceNotes', name: 'Compliance Notes', type: 'text', description: 'Regulatory compliance details' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Professional Greeting',
      definition: 'Agent must identify themselves and the utility company',
      evaluationCriteria: 'Agent states name and company within first 30 seconds',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Good morning, this is Lisa from City Power Company. How can I assist you today?'],
    },
    {
      type: 'Must Do',
      name: 'Account Verification',
      definition: 'Agent must verify customer identity before discussing account',
      evaluationCriteria: 'Agent verifies at least 2 pieces of information (address, last 4 SSN, account number)',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['For security, can you verify the service address and last four digits of your account number?'],
    },
    {
      type: 'Must Do',
      name: 'Immediate Safety Escalation',
      definition: 'Agent must immediately escalate any safety emergencies',
      evaluationCriteria: 'Gas leaks, downed lines, or electrical hazards escalated within 60 seconds',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['I am dispatching an emergency crew immediately. Please evacuate the area and call 911 if you smell gas'],
    },
    {
      type: 'Must Do',
      name: 'Outage ETA Communication',
      definition: 'Agent must provide restoration time estimate for outages',
      evaluationCriteria: 'Agent gives specific ETA or explains why ETA unavailable',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Our crew is on-site and estimates power restoration by 3 PM today. We will update you if that changes'],
    },
    {
      type: 'Must Do',
      name: 'Billing Explanation',
      definition: 'Agent must clearly explain billing charges and usage',
      evaluationCriteria: 'Agent explains rate structure, usage comparison, or charges clearly',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your bill is higher because usage increased from 500 kWh to 850 kWh. This could be due to heating during the cold snap'],
    },
    {
      type: 'Must Do',
      name: 'Payment Assistance Programs',
      definition: 'For hardship cases, agent must mention available assistance programs',
      evaluationCriteria: 'Agent informs about payment plans, assistance programs, or resources',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['We have payment assistance programs available. You may also qualify for the Low Income Home Energy Assistance Program. Would you like information on these?'],
    },
    {
      type: 'Must Do',
      name: 'Disconnection Warning',
      definition: 'Agent must clearly communicate disconnection timeline and prevention',
      evaluationCriteria: 'Agent states specific disconnection date and payment options to prevent',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Without payment, service will be disconnected on March 15th. To prevent this, you can pay $200 by March 10th or set up a payment arrangement today'],
    },
    {
      type: 'Must Do',
      name: 'Medical/Vulnerable Customer Protocol',
      definition: 'Agent must ask about medical equipment or vulnerable household members',
      evaluationCriteria: 'For disconnection cases, agent inquires about medical necessity or vulnerable persons',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Do you or anyone in your household rely on electrically-powered medical equipment?'],
    },
    {
      type: 'Must Do',
      name: 'Proper Authorization',
      definition: 'Agent must obtain proper authorization for payment arrangements',
      evaluationCriteria: 'Agent verifies authorization level or escalates for approval',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['I can approve a payment plan up to 6 months. For longer terms, I will need supervisor approval'],
    },
    {
      type: 'Must Do',
      name: 'Clear Summary & Next Steps',
      definition: 'Agent must summarize agreement and provide clear next steps',
      evaluationCriteria: 'Agent recaps actions, dates, and follow-up process',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['To confirm, you will pay $150 on the 1st of each month for 4 months. Your first payment is due April 1st. I will send a confirmation letter within 3 business days'],
    },
  ],
};

// ============================================================================
// TRAVEL & HOSPITALITY TEMPLATE
// ============================================================================
export const HOSPITALITY_TEMPLATE: SchemaTemplate = {
  id: 'hospitality',
  name: 'Travel & Hospitality',
  icon: '🏨',
  description: 'For hotels, resorts, vacation rentals, and hospitality services',
  previewDescription: 'Complete template for hospitality operations including reservations, modifications, guest complaints, service recovery, loyalty programs, upsell opportunities, and guest satisfaction management.',
  version: '1.0.0',
  industry: 'hospitality',
  schema: {
    name: 'Travel & Hospitality',
    version: '1.0.0',
    businessContext: 'Hospitality call center focused on exceptional guest service, reservation management, service recovery, loyalty rewards, revenue optimization through upsells, and creating memorable experiences.',
    fields: [
      {
        id: 'reservation_id',
        name: 'reservation_id',
        displayName: 'Reservation ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'guest_name',
        name: 'guest_name',
        displayName: 'Guest Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Guest',
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
        participantLabel: 'Guest Services Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'guest_tier_status',
        name: 'guest_tier_status',
        displayName: 'Guest Tier Status',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Standard', 'Silver', 'Gold', 'Platinum', 'Diamond'],
        cardinalityHint: 'low',
      },
      {
        id: 'check_in_date',
        name: 'check_in_date',
        displayName: 'Check-in Date',
        type: 'date',
        semanticRole: 'timestamp',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'check_out_date',
        name: 'check_out_date',
        displayName: 'Check-out Date',
        type: 'date',
        semanticRole: 'timestamp',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'room_type',
        name: 'room_type',
        displayName: 'Room Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Standard Room', 'Deluxe Room', 'Suite', 'Executive Suite', 'Presidential Suite'],
        cardinalityHint: 'low',
      },
      {
        id: 'call_reason',
        name: 'call_reason',
        displayName: 'Call Reason',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['New Reservation', 'Modify Reservation', 'Cancellation', 'Guest Complaint', 'Special Request', 'Loyalty Inquiry', 'Billing Issue', 'General Inquiry'],
        cardinalityHint: 'low',
      },
      {
        id: 'complaint_category',
        name: 'complaint_category',
        displayName: 'Complaint Category',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Room Cleanliness', 'Noise', 'Staff Service', 'Amenity Issue', 'Maintenance', 'Billing Error', 'Safety Concern'],
        cardinalityHint: 'low',
      },
      {
        id: 'compensation_offered',
        name: 'compensation_offered',
        displayName: 'Compensation Offered',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'medium',
      },
      {
        id: 'property_location',
        name: 'property_location',
        displayName: 'Property Location',
        type: 'string',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'resolution_type',
        name: 'resolution_type',
        displayName: 'Resolution Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Reservation Confirmed', 'Modification Completed', 'Cancellation Processed', 'Complaint Resolved', 'Room Upgraded', 'Compensation Provided', 'Escalated to Manager'],
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'guest_value',
        type: 'complex',
        description: 'Guest value based on tier status',
        formula: 'const tierScore = {Diamond: 100, Platinum: 80, Gold: 60, Silver: 40, Standard: 20}[metadata.guest_tier_status] || 20; return tierScore;',
        involvedFields: ['guest_tier_status'],
        displayName: 'Guest Value Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'reservation-booking',
        name: 'Reservation & Booking',
        description: 'New reservations, availability, rates',
        keywords: ['book', 'reserve', 'available', 'rate', 'price', 'dates'],
        color: '#3b82f6',
      },
      {
        id: 'service-complaint',
        name: 'Service Complaint',
        description: 'Guest complaints and service issues',
        keywords: ['complaint', 'unhappy', 'disappointed', 'problem', 'issue', 'dissatisfied'],
        color: '#ef4444',
      },
      {
        id: 'special-requests',
        name: 'Special Requests',
        description: 'Room preferences, amenities, accommodations',
        keywords: ['request', 'prefer', 'need', 'special', 'celebrate', 'anniversary'],
        color: '#8b5cf6',
      },
      {
        id: 'loyalty-rewards',
        name: 'Loyalty & Rewards',
        description: 'Points, status, loyalty program benefits',
        keywords: ['points', 'rewards', 'status', 'benefits', 'loyalty', 'member'],
        color: '#f59e0b',
      },
      {
        id: 'upsell-upgrade',
        name: 'Upsell & Upgrade',
        description: 'Room upgrades, package add-ons, premium services',
        keywords: ['upgrade', 'suite', 'better room', 'package', 'add-on', 'premium'],
        color: '#10b981',
      },
    ],
    insightCategories: [
      {
        id: 'service-recovery',
        name: 'Service Recovery',
        description: 'Assess service recovery effectiveness for complaints',
        icon: '🛎️',
        color: '#ef4444',
        promptInstructions: `Evaluate service recovery quality for guest complaints:
- Assess agent's empathy and acknowledgment of issue
- Evaluate appropriateness of compensation offered
- Check if resolution addresses root cause vs. just symptom
- Determine if agent turned negative into positive experience
- Assess likelihood guest will return despite issue`,
        outputFields: [
          { id: 'recoveryQuality', name: 'Recovery Quality', type: 'enum', enumValues: ['Poor', 'Adequate', 'Good', 'Exceptional'], description: 'Service recovery effectiveness' },
          { id: 'compensationAppropriate', name: 'Compensation Appropriate', type: 'boolean', description: 'Whether compensation matched issue' },
          { id: 'guestSatisfied', name: 'Guest Satisfied', type: 'enum', enumValues: ['Still Dissatisfied', 'Neutral', 'Satisfied', 'Delighted'], description: 'Guest satisfaction post-resolution' },
          { id: 'recoveryNotes', name: 'Recovery Notes', type: 'text', description: 'Service recovery assessment' },
        ],
        enabled: true,
      },
      {
        id: 'upsell-effectiveness',
        name: 'Upsell Effectiveness',
        description: 'Analyze upsell attempts and revenue optimization',
        icon: '💰',
        color: '#10b981',
        promptInstructions: `Evaluate upsell and revenue optimization efforts:
- Check if agent identified upsell opportunities
- Assess quality and relevance of upsell suggestions
- Evaluate if benefits were clearly communicated
- Determine guest receptiveness to offers
- Identify missed revenue opportunities`,
        outputFields: [
          { id: 'upsellAttempted', name: 'Upsell Attempted', type: 'boolean', description: 'Whether upsell was attempted' },
          { id: 'upsellSuccess', name: 'Upsell Success', type: 'enum', enumValues: ['Not Attempted', 'Declined', 'Accepted', 'Multiple Accepted'], description: 'Upsell outcome' },
          { id: 'revenueOpportunity', name: 'Revenue Opportunity', type: 'number', description: 'Estimated missed revenue' },
          { id: 'upsellRecommendations', name: 'Upsell Recommendations', type: 'text', description: 'Suggested upsell improvements' },
        ],
        enabled: true,
      },
      {
        id: 'brand-standards',
        name: 'Brand Standards',
        description: 'Assess adherence to hospitality brand standards',
        icon: '⭐',
        color: '#8b5cf6',
        promptInstructions: `Evaluate adherence to brand service standards:
- Check if agent used brand-specific greetings and phrases
- Assess personalization and use of guest name
- Verify loyalty tier recognition and benefits mentioned
- Evaluate warmth and hospitality tone
- Identify brand standard deviations`,
        outputFields: [
          { id: 'brandCompliance', name: 'Brand Compliance', type: 'number', description: 'Brand standards compliance 0-100' },
          { id: 'personalizationLevel', name: 'Personalization Level', type: 'enum', enumValues: ['Generic', 'Basic', 'Personalized', 'Highly Personalized'], description: 'Level of personalization' },
          { id: 'standardsViolations', name: 'Standards Violations', type: 'tags', description: 'Brand standards not met' },
          { id: 'brandNotes', name: 'Brand Notes', type: 'text', description: 'Brand standards assessment' },
        ],
        enabled: true,
      },
      {
        id: 'review-impact',
        name: 'Review Impact Prediction',
        description: 'Predict likelihood of positive/negative online review',
        icon: '⭐',
        color: '#f59e0b',
        promptInstructions: `Predict online review likelihood and sentiment:
- Assess overall guest satisfaction based on call tone
- Evaluate if issue resolution will prevent negative review
- Determine if experience worthy of positive review
- Consider guest tier and expectations
- Recommend proactive follow-up if needed`,
        outputFields: [
          { id: 'reviewLikelihood', name: 'Review Likelihood', type: 'enum', enumValues: ['Unlikely', 'Possible', 'Likely', 'Very Likely'], description: 'Probability of review' },
          { id: 'predictedSentiment', name: 'Predicted Sentiment', type: 'enum', enumValues: ['Very Negative', 'Negative', 'Neutral', 'Positive', 'Very Positive'], description: 'Expected review sentiment' },
          { id: 'reviewTriggers', name: 'Review Triggers', type: 'tags', description: 'Factors influencing review' },
          { id: 'followUpRecommended', name: 'Follow-up Recommended', type: 'boolean', description: 'Whether proactive follow-up needed' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Warm Brand Greeting',
      definition: 'Agent must provide warm, brand-appropriate greeting',
      evaluationCriteria: 'Agent uses brand greeting with enthusiasm and warmth',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Thank you for calling Grand Hotel Resorts! This is Jessica. I would be delighted to assist you today!'],
    },
    {
      type: 'Must Do',
      name: 'Guest Recognition',
      definition: 'Agent must recognize and acknowledge loyalty status',
      evaluationCriteria: 'Agent mentions guest tier status and relevant benefits',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I see you are a Platinum member. Thank you for your continued loyalty! You are eligible for complimentary upgrades and late checkout'],
    },
    {
      type: 'Must Do',
      name: 'Empathy for Complaints',
      definition: 'Agent must express genuine empathy for guest issues',
      evaluationCriteria: 'Agent acknowledges disappointment and takes ownership',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I sincerely apologize for the room cleanliness issue. That is absolutely not the experience we want for our guests. Let me make this right for you'],
    },
    {
      type: 'Must Do',
      name: 'Proactive Solutions',
      definition: 'Agent must offer solutions without guest needing to ask',
      evaluationCriteria: 'Agent presents multiple resolution options proactively',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I can immediately move you to a suite at no additional charge, and I will credit one night to your account. Would that work for you?'],
    },
    {
      type: 'Must Do',
      name: 'Personalization',
      definition: 'Agent must use guest name and personalize conversation',
      evaluationCriteria: 'Agent uses guest name at least twice and references previous stays if applicable',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Ms. Johnson, I see you stayed with us in Miami last month. Are you celebrating another special occasion?'],
    },
    {
      type: 'Should Do',
      name: 'Upsell Opportunity',
      definition: 'Agent should identify and present relevant upsell opportunities',
      evaluationCriteria: 'Agent suggests room upgrade, package, or add-on when appropriate',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['For just $40 more per night, I can upgrade you to an ocean-view suite with a private balcony. Many guests celebrating anniversaries love that option'],
    },
    {
      type: 'Must Do',
      name: 'Special Requests Confirmation',
      definition: 'Agent must confirm and document all special requests',
      evaluationCriteria: 'Agent repeats special requests and confirms documentation',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['To confirm, I have noted your requests for a high floor, king bed, and that you will be arriving late around 11 PM. We will hold the room for late arrival'],
    },
    {
      type: 'Must Do',
      name: 'Reservation Summary',
      definition: 'Agent must provide clear reservation summary',
      evaluationCriteria: 'Agent confirms dates, room type, rate, and confirmation number',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your reservation is confirmed for July 15-18, Deluxe Ocean View Room, at $299 per night. Your confirmation number is ABC123456'],
    },
    {
      type: 'Must Do',
      name: 'Cancellation Policy',
      definition: 'For bookings, agent must state cancellation policy',
      evaluationCriteria: 'Agent clearly explains cancellation terms and deadline',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['You may cancel without penalty up to 48 hours before check-in. After that, you will be charged for one night'],
    },
    {
      type: 'Must Do',
      name: 'Memorable Closing',
      definition: 'Agent must close warmly and create anticipation',
      evaluationCriteria: 'Agent expresses excitement for guest arrival and offers future assistance',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['We are so looking forward to welcoming you in July! If there is anything else we can do to make your stay exceptional, please do not hesitate to call. Have a wonderful day!'],
    },
  ],
};

// ============================================================================
// REAL ESTATE & PROPERTY MANAGEMENT TEMPLATE
// ============================================================================
export const REAL_ESTATE_TEMPLATE: SchemaTemplate = {
  id: 'real-estate',
  name: 'Real Estate & Property Management',
  icon: '🏠',
  description: 'For property management, tenant support, and maintenance coordination',
  previewDescription: 'Complete template for property management operations including tenant requests, maintenance coordination, lease management, emergency response, rent collection, and fair housing compliance.',
  version: '1.0.0',
  industry: 'real-estate',
  schema: {
    name: 'Real Estate & Property Management',
    version: '1.0.0',
    businessContext: 'Property management call center focused on tenant satisfaction, efficient maintenance coordination, emergency response, lease compliance, and fair housing adherence.',
    fields: [
      {
        id: 'property_id',
        name: 'property_id',
        displayName: 'Property ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'unit_number',
        name: 'unit_number',
        displayName: 'Unit Number',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'tenant_name',
        name: 'tenant_name',
        displayName: 'Tenant Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Tenant',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Property Agent',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Property Agent',
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
        selectOptions: ['Maintenance Request', 'Emergency Repair', 'Lease Inquiry', 'Rent Payment', 'Noise Complaint', 'Move-in/Move-out', 'Lease Renewal', 'Amenity Issue'],
        cardinalityHint: 'low',
      },
      {
        id: 'maintenance_category',
        name: 'maintenance_category',
        displayName: 'Maintenance Category',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Plumbing', 'HVAC', 'Electrical', 'Appliance', 'Pest Control', 'Structural', 'Cosmetic'],
        cardinalityHint: 'low',
      },
      {
        id: 'urgency_level',
        name: 'urgency_level',
        displayName: 'Urgency Level',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Emergency', 'Urgent', 'Routine', 'Low Priority'],
        cardinalityHint: 'low',
      },
      {
        id: 'lease_expiration',
        name: 'lease_expiration',
        displayName: 'Lease Expiration',
        type: 'date',
        semanticRole: 'timestamp',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'landlord_approval_needed',
        name: 'landlord_approval_needed',
        displayName: 'Landlord Approval Needed',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'estimated_cost',
        name: 'estimated_cost',
        displayName: 'Estimated Cost',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'resolution_type',
        name: 'resolution_type',
        displayName: 'Resolution Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Work Order Created', 'Emergency Dispatch', 'Scheduled Maintenance', 'Self-Resolution Guidance', 'Escalated to Owner', 'Lease Renewed'],
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'response_priority',
        type: 'complex',
        description: 'Response priority based on urgency and category',
        formula: 'const urgencyScore = {Emergency: 100, Urgent: 70, Routine: 40, \"Low Priority\": 20}[metadata.urgency_level] || 40; const categoryBoost = [\"Plumbing\", \"HVAC\", \"Electrical\"].includes(metadata.maintenance_category) ? 20 : 0; return Math.min(100, urgencyScore + categoryBoost);',
        involvedFields: ['urgency_level', 'maintenance_category'],
        displayName: 'Response Priority',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'emergency-maintenance',
        name: 'Emergency Maintenance',
        description: 'Critical repairs requiring immediate attention',
        keywords: ['emergency', 'urgent', 'leak', 'no heat', 'no water', 'flooding'],
        color: '#ef4444',
      },
      {
        id: 'routine-maintenance',
        name: 'Routine Maintenance',
        description: 'Standard maintenance and repair requests',
        keywords: ['repair', 'fix', 'broken', 'not working', 'maintenance'],
        color: '#3b82f6',
      },
      {
        id: 'lease-management',
        name: 'Lease Management',
        description: 'Lease terms, renewals, and agreements',
        keywords: ['lease', 'renew', 'move out', 'contract', 'terms'],
        color: '#8b5cf6',
      },
      {
        id: 'neighbor-issues',
        name: 'Neighbor Issues',
        description: 'Noise complaints, disputes, and community concerns',
        keywords: ['noise', 'loud', 'neighbor', 'complaint', 'disturbing'],
        color: '#f59e0b',
      },
      {
        id: 'rent-payment',
        name: 'Rent & Payment',
        description: 'Rent payment, late fees, payment arrangements',
        keywords: ['rent', 'payment', 'late fee', 'pay', 'balance'],
        color: '#10b981',
      },
    ],
    insightCategories: [
      {
        id: 'emergency-response',
        name: 'Emergency Response',
        description: 'Assess emergency handling and response time',
        icon: '🚨',
        color: '#ef4444',
        promptInstructions: `Evaluate emergency response quality:
- Check if emergency was properly classified and prioritized
- Assess speed of dispatch or emergency coordinator contact
- Verify safety instructions provided to tenant
- Evaluate agent's urgency and professionalism
- Determine if temporary solutions offered while awaiting repair`,
        outputFields: [
          { id: 'responseQuality', name: 'Response Quality', type: 'enum', enumValues: ['Poor', 'Adequate', 'Good', 'Excellent'], description: 'Emergency response effectiveness' },
          { id: 'dispatchTime', name: 'Dispatch Time', type: 'enum', enumValues: ['Immediate', 'Within Hour', 'Same Day', 'Delayed'], description: 'Speed of emergency dispatch' },
          { id: 'safetyGuidance', name: 'Safety Guidance Provided', type: 'boolean', description: 'Whether safety instructions given' },
          { id: 'emergencyNotes', name: 'Emergency Notes', type: 'text', description: 'Emergency response assessment' },
        ],
        enabled: true,
      },
      {
        id: 'maintenance-sla',
        name: 'Maintenance SLA',
        description: 'Verify SLA compliance for maintenance requests',
        icon: '⏱️',
        color: '#3b82f6',
        promptInstructions: `Assess maintenance SLA adherence:
- Check if response timeline matches urgency level
- Verify proper categorization of maintenance type
- Evaluate if tenant expectations were set appropriately
- Determine if escalation was needed and executed
- Assess follow-up process explained`,
        outputFields: [
          { id: 'slaCompliance', name: 'SLA Compliance', type: 'enum', enumValues: ['Non-Compliant', 'At Risk', 'Compliant', 'Exceeded'], description: 'SLA compliance status' },
          { id: 'responseTimeframe', name: 'Response Timeframe', type: 'string', description: 'Committed response time' },
          { id: 'expectationsSet', name: 'Expectations Set', type: 'boolean', description: 'Whether timeline clearly communicated' },
          { id: 'slaNotes', name: 'SLA Notes', type: 'text', description: 'SLA compliance details' },
        ],
        enabled: true,
      },
      {
        id: 'fair-housing-compliance',
        name: 'Fair Housing Compliance',
        description: 'Verify compliance with fair housing regulations',
        icon: '⚖️',
        color: '#8b5cf6',
        promptInstructions: `Assess fair housing compliance during the call:
- Check for any discriminatory language or practices
- Verify consistent policy application
- Assess if reasonable accommodations discussed appropriately
- Flag any protected class references
- Evaluate compliance with disability accommodation laws`,
        outputFields: [
          { id: 'compliant', name: 'Fair Housing Compliant', type: 'boolean', description: 'Whether call was compliant' },
          { id: 'violations', name: 'Potential Violations', type: 'tags', description: 'Any compliance concerns' },
          { id: 'accommodationsHandled', name: 'Accommodations Handled', type: 'boolean', description: 'Whether requests handled properly' },
          { id: 'complianceNotes', name: 'Compliance Notes', type: 'text', description: 'Fair housing assessment' },
        ],
        enabled: true,
      },
      {
        id: 'tenant-retention',
        name: 'Tenant Retention',
        description: 'Assess tenant satisfaction and retention risk',
        icon: '🏡',
        color: '#10b981',
        promptInstructions: `Evaluate tenant retention factors:
- Assess tenant satisfaction with service
- Identify frustration or dissatisfaction indicators
- Check if lease renewal was discussed if approaching
- Evaluate if retention-building actions taken
- Determine churn risk level`,
        outputFields: [
          { id: 'satisfactionLevel', name: 'Satisfaction Level', type: 'enum', enumValues: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'], description: 'Tenant satisfaction' },
          { id: 'churnRisk', name: 'Churn Risk', type: 'enum', enumValues: ['Low', 'Medium', 'High', 'Critical'], description: 'Risk of not renewing' },
          { id: 'renewalDiscussed', name: 'Renewal Discussed', type: 'boolean', description: 'Whether lease renewal mentioned' },
          { id: 'retentionNotes', name: 'Retention Notes', type: 'text', description: 'Retention assessment' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Professional Greeting',
      definition: 'Agent must identify themselves and property management company',
      evaluationCriteria: 'Agent states name, company, and purpose',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Good morning, this is Sarah from ABC Property Management. How can I assist you today?'],
    },
    {
      type: 'Must Do',
      name: 'Tenant Verification',
      definition: 'Agent must verify tenant identity and unit',
      evaluationCriteria: 'Agent confirms tenant name and unit number',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you please confirm your unit number and the name on the lease?'],
    },
    {
      type: 'Must Do',
      name: 'Emergency Classification',
      definition: 'Agent must properly classify emergency vs. routine maintenance',
      evaluationCriteria: 'Agent asks qualifying questions to determine urgency',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Is this affecting your safety or causing property damage? Is water actively leaking?'],
    },
    {
      type: 'Must Do',
      name: 'Immediate Emergency Dispatch',
      definition: 'For emergencies, agent must dispatch immediately',
      evaluationCriteria: 'Emergency work order created or technician dispatched within call',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['I am dispatching an emergency plumber right now. They should arrive within 2 hours'],
    },
    {
      type: 'Must Do',
      name: 'Safety Instructions',
      definition: 'For safety hazards, agent must provide immediate safety guidance',
      evaluationCriteria: 'Agent gives specific safety instructions relevant to the issue',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Please turn off the water main valve under your sink and move any valuables away from the leak'],
    },
    {
      type: 'Must Do',
      name: 'Timeline Communication',
      definition: 'Agent must provide clear timeline for resolution',
      evaluationCriteria: 'Agent gives specific timeframe for service or follow-up',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['A technician will contact you within 24 hours to schedule the repair'],
    },
    {
      type: 'Must Do',
      name: 'Work Order Confirmation',
      definition: 'Agent must provide work order number and details',
      evaluationCriteria: 'Agent states work order number and summarizes request',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your work order number is WO-12345 for HVAC repair. You will receive a confirmation email'],
    },
    {
      type: 'Must Not Do',
      name: 'No Discriminatory Language',
      definition: 'Agent must not use discriminatory language or practices',
      evaluationCriteria: 'No references to protected classes or discriminatory statements',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Avoid any references to race, religion, family status, disability, etc.'],
    },
    {
      type: 'Must Do',
      name: 'Tenant Entry Authorization',
      definition: 'Agent must obtain proper authorization for unit entry',
      evaluationCriteria: 'Agent explains entry procedure and obtains tenant consent or provides notice',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['The technician will need to enter your unit. Will you be home tomorrow between 9-12, or shall we provide 24-hour notice for entry?'],
    },
    {
      type: 'Must Do',
      name: 'Follow-up Process',
      definition: 'Agent must explain follow-up and how to check status',
      evaluationCriteria: 'Agent provides contact method and follow-up timeline',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['You can check the status in your tenant portal or call us anytime. We will also send you updates via text'],
    },
  ],
};

// ============================================================================
// AUTOMOTIVE SERVICE & WARRANTY TEMPLATE
// ============================================================================
export const AUTOMOTIVE_TEMPLATE: SchemaTemplate = {
  id: 'automotive',
  name: 'Automotive Service & Warranty',
  icon: '🚗',
  description: 'For roadside assistance, warranty claims, and vehicle service coordination',
  previewDescription: 'Complete template for automotive support including roadside assistance dispatch, warranty claim processing, recall coordination, service appointment scheduling, and customer safety prioritization.',
  version: '1.0.0',
  industry: 'automotive',
  schema: {
    name: 'Automotive Service',
    version: '1.0.0',
    businessContext: 'Automotive service center focused on vehicle owner support, emergency roadside assistance, warranty claim validation, recall management, and service appointment coordination.',
    fields: [
      {
        id: 'vin',
        name: 'vin',
        displayName: 'VIN',
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
        displayName: 'Service Agent',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Service Agent',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'mileage',
        name: 'mileage',
        displayName: 'Mileage',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'warranty_status',
        name: 'warranty_status',
        displayName: 'Warranty Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Under Warranty', 'Warranty Expired', 'Extended Warranty', 'Recall Coverage', 'Out of Coverage'],
        cardinalityHint: 'low',
      },
      {
        id: 'service_type',
        name: 'service_type',
        displayName: 'Service Type',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Roadside Assistance', 'Warranty Claim', 'Recall Service', 'Routine Maintenance', 'Repair Inquiry', 'Appointment Scheduling'],
        cardinalityHint: 'low',
      },
      {
        id: 'assistance_category',
        name: 'assistance_category',
        displayName: 'Assistance Category',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Tow', 'Tire Change', 'Jump Start', 'Fuel Delivery', 'Lockout', 'Winch Out'],
        cardinalityHint: 'low',
      },
      {
        id: 'repair_authorization_amount',
        name: 'repair_authorization_amount',
        displayName: 'Repair Authorization Amount',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'high',
      },
      {
        id: 'dealer_location',
        name: 'dealer_location',
        displayName: 'Dealer Location',
        type: 'string',
        semanticRole: 'dimension',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'recall_id',
        name: 'recall_id',
        displayName: 'Recall ID',
        type: 'string',
        semanticRole: 'identifier',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'low',
      },
      {
        id: 'safety_concern',
        name: 'safety_concern',
        displayName: 'Safety Concern',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'urgency_level',
        type: 'complex',
        description: 'Service urgency based on type and safety concern',
        formula: 'const isSafety = metadata.safety_concern === true ? 100 : 0; const typeScore = {\"Roadside Assistance\": 90, \"Recall Service\": 70, \"Warranty Claim\": 50, \"Repair Inquiry\": 30}[metadata.service_type] || 40; return Math.max(isSafety, typeScore);',
        involvedFields: ['service_type', 'safety_concern'],
        displayName: 'Urgency Level',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'roadside-emergency',
        name: 'Roadside Emergency',
        description: 'Breakdown, stranded, need immediate assistance',
        keywords: ['stranded', 'breakdown', 'stuck', 'won\'t start', 'emergency', 'tow'],
        color: '#ef4444',
      },
      {
        id: 'warranty-coverage',
        name: 'Warranty Coverage',
        description: 'Warranty claims and coverage verification',
        keywords: ['warranty', 'covered', 'claim', 'free repair', 'under warranty'],
        color: '#3b82f6',
      },
      {
        id: 'recall-campaign',
        name: 'Recall Campaign',
        description: 'Recall notifications and service scheduling',
        keywords: ['recall', 'safety notice', 'campaign', 'manufacturer notice'],
        color: '#f59e0b',
      },
      {
        id: 'service-appointment',
        name: 'Service Appointment',
        description: 'Scheduling routine maintenance or repairs',
        keywords: ['appointment', 'schedule', 'book', 'service', 'maintenance'],
        color: '#10b981',
      },
      {
        id: 'safety-issue',
        name: 'Safety Issue',
        description: 'Safety-critical vehicle issues',
        keywords: ['safety', 'danger', 'unsafe', 'brakes', 'airbag', 'steering'],
        color: '#ef4444',
      },
    ],
    insightCategories: [
      {
        id: 'safety-prioritization',
        name: 'Safety Prioritization',
        description: 'Assess how agent handled safety-critical situations',
        icon: '🛡️',
        color: '#ef4444',
        promptInstructions: `Evaluate safety prioritization during the call:
- Check if safety concerns were identified and escalated
- Assess if customer was advised not to drive if unsafe
- Verify appropriate urgency applied to safety issues
- Evaluate if recall safety information communicated clearly
- Determine if alternative transportation offered for safety issues`,
        outputFields: [
          { id: 'safetyHandling', name: 'Safety Handling', type: 'enum', enumValues: ['Poor', 'Adequate', 'Good', 'Exemplary'], description: 'How safety was handled' },
          { id: 'drivingAdviceGiven', name: 'Driving Advice Given', type: 'boolean', description: 'Whether safe driving advice provided' },
          { id: 'urgencyAppropriate', name: 'Urgency Appropriate', type: 'boolean', description: 'Whether urgency matched safety risk' },
          { id: 'safetyNotes', name: 'Safety Notes', type: 'text', description: 'Safety handling assessment' },
        ],
        enabled: true,
      },
      {
        id: 'roadside-response-time',
        name: 'Roadside Response Time',
        description: 'Evaluate dispatch efficiency and ETA communication',
        icon: '⏱️',
        color: '#f59e0b',
        promptInstructions: `Assess roadside assistance response quality:
- Check if location captured accurately
- Verify ETA provided and realistic
- Evaluate if dispatch confirmed within call
- Assess customer safety instructions while waiting
- Determine if status updates process explained`,
        outputFields: [
          { id: 'dispatchSpeed', name: 'Dispatch Speed', type: 'enum', enumValues: ['Slow', 'Adequate', 'Fast', 'Immediate'], description: 'Speed of dispatch' },
          { id: 'etaProvided', name: 'ETA Provided', type: 'boolean', description: 'Whether ETA communicated' },
          { id: 'waitingInstructions', name: 'Waiting Instructions', type: 'boolean', description: 'Safety while waiting discussed' },
          { id: 'responseNotes', name: 'Response Notes', type: 'text', description: 'Response time assessment' },
        ],
        enabled: true,
      },
      {
        id: 'warranty-verification',
        name: 'Warranty Verification',
        description: 'Assess warranty validation and communication',
        icon: '✅',
        color: '#3b82f6',
        promptInstructions: `Evaluate warranty coverage verification:
- Check if warranty status accurately determined
- Verify mileage and coverage limits explained
- Assess if exclusions or limitations communicated
- Evaluate authorization process clarity
- Determine if customer understands out-of-pocket costs`,
        outputFields: [
          { id: 'verificationAccuracy', name: 'Verification Accuracy', type: 'enum', enumValues: ['Incorrect', 'Unclear', 'Accurate', 'Thorough'], description: 'Warranty verification quality' },
          { id: 'costsExplained', name: 'Costs Explained', type: 'boolean', description: 'Whether costs clearly communicated' },
          { id: 'exclusionsMentioned', name: 'Exclusions Mentioned', type: 'boolean', description: 'Whether limitations discussed' },
          { id: 'warrantyNotes', name: 'Warranty Notes', type: 'text', description: 'Warranty verification details' },
        ],
        enabled: true,
      },
      {
        id: 'dealer-coordination',
        name: 'Dealer Coordination',
        description: 'Assess dealer coordination and appointment facilitation',
        icon: '🔧',
        color: '#10b981',
        promptInstructions: `Evaluate dealer coordination effectiveness:
- Check if appropriate dealer identified and contacted
- Verify appointment scheduled or process explained
- Assess if dealer contact information provided
- Evaluate if rental car or loaner discussed
- Determine if follow-up process clear`,
        outputFields: [
          { id: 'coordinationQuality', name: 'Coordination Quality', type: 'enum', enumValues: ['Poor', 'Basic', 'Good', 'Excellent'], description: 'Dealer coordination effectiveness' },
          { id: 'appointmentScheduled', name: 'Appointment Scheduled', type: 'boolean', description: 'Whether appointment confirmed' },
          { id: 'alternativesOffered', name: 'Alternatives Offered', type: 'tags', description: 'Loaner, rental, shuttle options' },
          { id: 'coordinationNotes', name: 'Coordination Notes', type: 'text', description: 'Dealer coordination details' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Professional Greeting',
      definition: 'Agent must identify themselves and automotive service center',
      evaluationCriteria: 'Agent states name, company, and department',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Good morning, this is Tom from AutoCare Roadside Assistance. How can I help you?'],
    },
    {
      type: 'Must Do',
      name: 'VIN Collection',
      definition: 'Agent must collect VIN for vehicle identification',
      evaluationCriteria: 'Agent asks for and records VIN number',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Can you provide your Vehicle Identification Number? It is on your registration or dashboard'],
    },
    {
      type: 'Must Do',
      name: 'Safety Assessment',
      definition: 'Agent must assess if vehicle is safe to drive',
      evaluationCriteria: 'Agent asks about safety indicators and advises appropriately',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Are you seeing any warning lights? Do the brakes feel normal? If you are unsure, it is safer not to drive'],
    },
    {
      type: 'Must Do',
      name: 'Location Capture',
      definition: 'For roadside assistance, agent must capture precise location',
      evaluationCriteria: 'Agent gets address, cross streets, or landmarks',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['What is your exact address or closest cross street? Are there any landmarks nearby?'],
    },
    {
      type: 'Must Do',
      name: 'ETA Communication',
      definition: 'Agent must provide estimated arrival time for assistance',
      evaluationCriteria: 'Agent gives specific ETA for service provider',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['A tow truck will arrive within 45 minutes. I will text you the driver\'s name and number'],
    },
    {
      type: 'Must Do',
      name: 'Warranty Coverage Explanation',
      definition: 'Agent must clearly explain what is covered under warranty',
      evaluationCriteria: 'Agent states coverage status and any customer costs',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['This repair is covered under your powertrain warranty. You will not have any out-of-pocket costs'],
    },
    {
      type: 'Must Do',
      name: 'Recall Information',
      definition: 'If recall exists, agent must explain the issue and urgency',
      evaluationCriteria: 'Agent describes recall issue, safety implications, and no-cost repair',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['There is a safety recall for your airbag sensor. This is repaired at no cost. We recommend scheduling as soon as possible'],
    },
    {
      type: 'Must Do',
      name: 'Customer Safety Instructions',
      definition: 'Agent must provide safety instructions while customer waits',
      evaluationCriteria: 'Agent advises on safe waiting location and precautions',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Please wait in your vehicle with doors locked if you feel safe, or move to a safe location away from traffic'],
    },
    {
      type: 'Must Do',
      name: 'Dealer Coordination',
      definition: 'Agent must coordinate with dealer and provide appointment details',
      evaluationCriteria: 'Agent provides dealer name, address, appointment time, and contact',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['I have scheduled you at Smith Toyota, 123 Main Street, tomorrow at 10 AM. Their number is 555-1234'],
    },
    {
      type: 'Must Do',
      name: 'Follow-up & Reference Number',
      definition: 'Agent must provide case/claim number and follow-up method',
      evaluationCriteria: 'Agent gives reference number and explains how to check status',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your service request number is RS-789456. You will receive text updates, or you can call us anytime with that number'],
    },
  ],
};

// ============================================================================
// GOVERNMENT & PUBLIC SERVICES TEMPLATE
// ============================================================================
export const GOVERNMENT_TEMPLATE: SchemaTemplate = {
  id: 'government',
  name: 'Government & Public Services',
  icon: '🏛️',
  description: 'For government agencies, benefits enrollment, permits, and public services',
  previewDescription: 'Complete template for government call centers including benefits enrollment, license renewals, permit applications, eligibility verification, document processing, and regulatory compliance with accessibility requirements.',
  version: '1.0.0',
  industry: 'government',
  schema: {
    name: 'Government Services',
    version: '1.0.0',
    businessContext: 'Government call center focused on citizen service, benefits administration, regulatory compliance, accessibility accommodations, plain language communication, and privacy protection.',
    fields: [
      {
        id: 'case_id',
        name: 'case_id',
        displayName: 'Case ID',
        type: 'string',
        semanticRole: 'identifier',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'citizen_name',
        name: 'citizen_name',
        displayName: 'Citizen Name',
        type: 'string',
        semanticRole: 'participant_2',
        participantLabel: 'Citizen',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
      {
        id: 'agent_name',
        name: 'agent_name',
        displayName: 'Service Representative',
        type: 'string',
        semanticRole: 'participant_1',
        participantLabel: 'Service Representative',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'medium',
      },
      {
        id: 'benefit_type',
        name: 'benefit_type',
        displayName: 'Benefit/Service Type',
        type: 'select',
        semanticRole: 'classification',
        required: true,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Unemployment Benefits', 'Healthcare Enrollment', 'Food Assistance', 'Housing Assistance', 'License Renewal', 'Permit Application', 'Social Security', 'Tax Assistance'],
        cardinalityHint: 'low',
      },
      {
        id: 'eligibility_status',
        name: 'eligibility_status',
        displayName: 'Eligibility Status',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Eligible', 'Pending Verification', 'Ineligible', 'Requires Documentation', 'Under Review'],
        cardinalityHint: 'low',
      },
      {
        id: 'document_checklist',
        name: 'document_checklist',
        displayName: 'Document Checklist',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: false,
        cardinalityHint: 'medium',
      },
      {
        id: 'processing_time_days',
        name: 'processing_time_days',
        displayName: 'Processing Time (Days)',
        type: 'number',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        cardinalityHint: 'low',
      },
      {
        id: 'language_preference',
        name: 'language_preference',
        displayName: 'Language Preference',
        type: 'select',
        semanticRole: 'dimension',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['English', 'Spanish', 'Chinese', 'Vietnamese', 'Korean', 'Russian', 'Arabic', 'Other'],
        cardinalityHint: 'low',
      },
      {
        id: 'accommodation_needed',
        name: 'accommodation_needed',
        displayName: 'Accommodation Needed',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'privacy_sensitive',
        name: 'privacy_sensitive',
        displayName: 'Privacy Sensitive',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: false,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: false,
        cardinalityHint: 'low',
      },
      {
        id: 'resolution_type',
        name: 'resolution_type',
        displayName: 'Resolution Type',
        type: 'select',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Application Submitted', 'Documents Requested', 'Eligibility Confirmed', 'Benefits Approved', 'Appeal Filed', 'Referred to Specialist', 'Information Provided'],
        cardinalityHint: 'low',
      },
    ],
    relationships: [
      {
        id: 'complexity_score',
        type: 'complex',
        description: 'Case complexity based on benefit type and accommodations',
        formula: 'const complexityMap = {\"Unemployment Benefits\": 50, \"Healthcare Enrollment\": 70, \"Food Assistance\": 40, \"Social Security\": 80}[metadata.benefit_type] || 50; const accommodationBoost = metadata.accommodation_needed ? 20 : 0; return Math.min(100, complexityMap + accommodationBoost);',
        involvedFields: ['benefit_type', 'accommodation_needed'],
        displayName: 'Case Complexity',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'number',
      },
    ],
    topicTaxonomy: [
      {
        id: 'eligibility-verification',
        name: 'Eligibility Verification',
        description: 'Verifying eligibility requirements and criteria',
        keywords: ['eligible', 'qualify', 'requirements', 'criteria', 'qualify for'],
        color: '#3b82f6',
      },
      {
        id: 'document-submission',
        name: 'Document Submission',
        description: 'Required documents and submission process',
        keywords: ['documents', 'proof', 'submit', 'verification', 'paperwork'],
        color: '#8b5cf6',
      },
      {
        id: 'benefits-enrollment',
        name: 'Benefits Enrollment',
        description: 'Enrolling in benefits programs',
        keywords: ['enroll', 'apply', 'sign up', 'register', 'application'],
        color: '#10b981',
      },
      {
        id: 'appeals-complaints',
        name: 'Appeals & Complaints',
        description: 'Filing appeals or complaints about decisions',
        keywords: ['appeal', 'complaint', 'disagree', 'denied', 'unfair'],
        color: '#f59e0b',
      },
      {
        id: 'status-inquiry',
        name: 'Status Inquiry',
        description: 'Checking application or case status',
        keywords: ['status', 'where is my', 'processing', 'how long', 'update'],
        color: '#3b82f6',
      },
    ],
    insightCategories: [
      {
        id: 'plain-language',
        name: 'Plain Language Usage',
        description: 'Assess use of clear, accessible language',
        icon: '📖',
        color: '#3b82f6',
        promptInstructions: `Evaluate plain language communication:
- Check if agent avoided jargon and bureaucratic language
- Assess clarity of explanations for complex processes
- Verify that citizen understanding was confirmed
- Evaluate if technical terms were explained simply
- Determine if agent adapted language to citizen level`,
        outputFields: [
          { id: 'languageClarity', name: 'Language Clarity', type: 'enum', enumValues: ['Poor', 'Fair', 'Good', 'Excellent'], description: 'Clarity of language used' },
          { id: 'jargonUsed', name: 'Jargon Used', type: 'tags', description: 'Unexplained jargon or technical terms' },
          { id: 'understandingConfirmed', name: 'Understanding Confirmed', type: 'boolean', description: 'Whether agent verified comprehension' },
          { id: 'languageNotes', name: 'Language Notes', type: 'text', description: 'Plain language assessment' },
        ],
        enabled: true,
      },
      {
        id: 'regulatory-accuracy',
        name: 'Regulatory Accuracy',
        description: 'Verify accuracy of regulatory information provided',
        icon: '⚖️',
        color: '#8b5cf6',
        promptInstructions: `Assess accuracy of regulatory and policy information:
- Check if eligibility criteria stated correctly
- Verify processing timeframes match regulations
- Assess if appeal rights mentioned when applicable
- Evaluate accuracy of benefit amounts or requirements
- Flag any incorrect policy statements`,
        outputFields: [
          { id: 'informationAccurate', name: 'Information Accurate', type: 'boolean', description: 'Whether all information was correct' },
          { id: 'inaccuracies', name: 'Inaccuracies', type: 'tags', description: 'Any incorrect information provided' },
          { id: 'appealRightsMentioned', name: 'Appeal Rights Mentioned', type: 'boolean', description: 'Whether appeal process explained if relevant' },
          { id: 'accuracyNotes', name: 'Accuracy Notes', type: 'text', description: 'Regulatory accuracy assessment' },
        ],
        enabled: true,
      },
      {
        id: 'accessibility-compliance',
        name: 'Accessibility & Accommodation',
        description: 'Assess accommodation of accessibility needs',
        icon: '♿',
        color: '#10b981',
        promptInstructions: `Evaluate accommodation of accessibility needs:
- Check if accommodation needs were identified
- Verify appropriate services offered (interpreter, alternative formats)
- Assess if agent was patient and accommodating
- Evaluate if accessible alternatives provided
- Determine compliance with ADA and accessibility standards`,
        outputFields: [
          { id: 'accommodationsOffered', name: 'Accommodations Offered', type: 'tags', description: 'Accommodations provided or offered' },
          { id: 'accessibilityCompliance', name: 'Accessibility Compliance', type: 'boolean', description: 'Whether needs were accommodated' },
          { id: 'patienceLevel', name: 'Patience Level', type: 'enum', enumValues: ['Impatient', 'Adequate', 'Patient', 'Very Patient'], description: 'Agent patience level' },
          { id: 'accessibilityNotes', name: 'Accessibility Notes', type: 'text', description: 'Accessibility assessment' },
        ],
        enabled: true,
      },
      {
        id: 'privacy-protection',
        name: 'Privacy & Data Protection',
        description: 'Verify HIPAA/privacy compliance',
        icon: '🔒',
        color: '#ef4444',
        promptInstructions: `Assess privacy and data protection compliance:
- Check if proper identity verification performed
- Verify sensitive information not over-disclosed
- Assess if HIPAA requirements followed for health data
- Evaluate if privacy notices provided when required
- Flag any privacy violations or concerns`,
        outputFields: [
          { id: 'privacyCompliant', name: 'Privacy Compliant', type: 'boolean', description: 'Whether privacy standards met' },
          { id: 'verificationPerformed', name: 'Verification Performed', type: 'boolean', description: 'Whether identity verified' },
          { id: 'privacyViolations', name: 'Privacy Violations', type: 'tags', description: 'Any privacy concerns identified' },
          { id: 'privacyNotes', name: 'Privacy Notes', type: 'text', description: 'Privacy protection assessment' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    {
      type: 'Must Do',
      name: 'Professional Introduction',
      definition: 'Agent must identify themselves, agency, and department',
      evaluationCriteria: 'Agent states name, agency name, and department clearly',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Good morning, this is Maria from the Department of Social Services, Benefits Division. How may I help you?'],
    },
    {
      type: 'Must Do',
      name: 'Identity Verification',
      definition: 'Agent must verify caller identity before discussing case details',
      evaluationCriteria: 'Agent verifies at least 2 pieces of identifying information',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['For your privacy, can you verify your date of birth and case number?'],
    },
    {
      type: 'Must Do',
      name: 'Plain Language Communication',
      definition: 'Agent must use clear, jargon-free language',
      evaluationCriteria: 'Agent avoids bureaucratic terms and explains concepts simply',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['You will need to provide proof of income. This can be recent pay stubs or a letter from your employer'],
    },
    {
      type: 'Must Do',
      name: 'Eligibility Criteria Explanation',
      definition: 'Agent must clearly explain eligibility requirements',
      evaluationCriteria: 'Agent lists specific requirements and explains how to meet them',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['To qualify for unemployment benefits, you must have lost your job through no fault of your own and have earned at least $3,000 in the last 12 months'],
    },
    {
      type: 'Must Do',
      name: 'Document Checklist',
      definition: 'Agent must provide complete list of required documents',
      evaluationCriteria: 'Agent lists all required documents and explains where to submit',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['You will need: 1) proof of identity like a driver\'s license, 2) proof of address like a utility bill, and 3) proof of income. You can upload these on our website or mail them to...'],
    },
    {
      type: 'Must Do',
      name: 'Processing Timeline',
      definition: 'Agent must provide realistic processing timeframe',
      evaluationCriteria: 'Agent gives specific timeframe for application processing',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Applications typically take 15-20 business days to process once we receive all documents'],
    },
    {
      type: 'Must Do',
      name: 'Appeal Rights Notice',
      definition: 'For denials or negative decisions, agent must explain appeal rights',
      evaluationCriteria: 'Agent informs of right to appeal, deadline, and process',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['You have the right to appeal this decision within 30 days. You can request an appeal by filling out form A-123 or calling this number'],
    },
    {
      type: 'Must Do',
      name: 'Accommodation Inquiry',
      definition: 'Agent must ask if any accommodations are needed',
      evaluationCriteria: 'Agent inquires about language, disability, or other accommodation needs',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Do you need any assistance such as a language interpreter or documents in an alternative format?'],
    },
    {
      type: 'Must Do',
      name: 'Reference Number Provision',
      definition: 'Agent must provide case or reference number',
      evaluationCriteria: 'Agent gives specific reference number and explains how to use it',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Your case number is CS-789012. Please reference this number in all future communications'],
    },
    {
      type: 'Must Do',
      name: 'Follow-up Instructions',
      definition: 'Agent must provide clear next steps and contact information',
      evaluationCriteria: 'Agent explains what happens next and how to get help',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['You will receive a letter in the mail within 10 days. If you have questions, you can call us at 1-800-555-0123 Monday through Friday, 8 AM to 5 PM'],
    },
  ],
};

// ============================================================================
// VODAFONE CALL CENTER TEMPLATE
// ============================================================================
export const VODAFONE_TEMPLATE: SchemaTemplate = {
  id: 'vodafone',
  name: 'Vodafone Call Center',
  icon: '📞',
  description: 'Vodafone call center quality evaluation with CONNECT-DISCOVER-EXCITE-CONFIRM-DELIVER methodology',
  previewDescription: 'Complete template for Vodafone call center operations following the CONNECT > DISCOVER > EXCITE > CONFIRM > DELIVER framework, including soft skills evaluation, TNPS promotion, MVA/self-care guidance, and comprehensive quality scoring.',
  version: '1.0.0',
  industry: 'telecom',
  schema: {
    name: 'Vodafone Call Center',
    version: '1.0.0',
    businessContext: 'Vodafone call center focused on customer service excellence using the CONNECT-DISCOVER-EXCITE-CONFIRM-DELIVER methodology, emphasizing proper greeting scripts, security verification, customer need identification, solution presentation, self-care promotion, and professional call closure with TNPS survey promotion.',
    fields: [
      {
        id: 'call_id',
        name: 'call_id',
        displayName: 'Call ID',
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
        participantLabel: 'Vodafone Agent',
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
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['Billing Inquiry', 'Technical Support', 'Account Management', 'Plan Change', 'Complaint', 'General Inquiry', 'Roaming', 'Device Support', 'Network Issues', 'Other'],
        cardinalityHint: 'low',
      },
      {
        id: 'tht',
        name: 'tht',
        displayName: 'Total Handling Time',
        type: 'select',
        semanticRole: 'metric',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        selectOptions: ['0 to 3 mins', '3 to 5 mins', '5 to 10 mins', '10+ mins'],
        cardinalityHint: 'low',
      },
      {
        id: 'fcr',
        name: 'fcr',
        displayName: 'First Call Resolution',
        type: 'boolean',
        semanticRole: 'classification',
        required: false,
        showInTable: true,
        useInPrompt: true,
        enableAnalytics: true,
        defaultValue: true,
        cardinalityHint: 'low',
      },
      {
        id: 'call_drop',
        name: 'call_drop',
        displayName: 'Call Drop',
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
        selectOptions: ['Supervisor Request', 'Technical Complexity', 'Billing Dispute', 'Complaint', 'Policy Exception', 'VIP Customer', 'Other'],
        cardinalityHint: 'low',
        dependsOn: {
          fieldId: 'escalated',
          operator: 'equals',
          value: true,
        },
        dependsOnBehavior: 'show',
      },
      {
        id: 'tnps_promoted',
        name: 'tnps_promoted',
        displayName: 'TNPS Promoted',
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
        id: 'mva_promoted',
        name: 'mva_promoted',
        displayName: 'MVA/Self-Care Promoted',
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
        id: 'audio_file_name',
        name: 'audio_file_name',
        displayName: 'Audio File Name',
        type: 'string',
        semanticRole: 'freeform',
        required: false,
        showInTable: false,
        useInPrompt: false,
        enableAnalytics: false,
        cardinalityHint: 'high',
      },
    ],
    relationships: [
      {
        id: 'quality_score',
        type: 'complex',
        description: 'Overall quality score based on all evaluation criteria',
        formula: 'return "Calculated from evaluation rules";',
        involvedFields: ['fcr', 'call_drop', 'tht'],
        displayName: 'Quality Score',
        displayInTable: true,
        enableAnalytics: true,
        outputType: 'string',
      },
    ],
    topicTaxonomy: [
      {
        id: 'billing-payment',
        name: 'Billing & Payment',
        description: 'Questions about bills, charges, payments, and account balance',
        keywords: ['bill', 'charge', 'payment', 'balance', 'invoice', 'credit', 'debit'],
        color: '#3b82f6',
      },
      {
        id: 'network-coverage',
        name: 'Network & Coverage',
        description: 'Issues related to network signal, coverage, and connectivity',
        keywords: ['signal', 'coverage', 'network', 'connection', '4G', '5G', 'no service', 'dropped call'],
        color: '#ef4444',
      },
      {
        id: 'plan-services',
        name: 'Plans & Services',
        description: 'Questions about plans, packages, add-ons, and services',
        keywords: ['plan', 'package', 'upgrade', 'downgrade', 'data', 'minutes', 'SMS', 'bundle'],
        color: '#10b981',
      },
      {
        id: 'device-support',
        name: 'Device Support',
        description: 'Help with device setup, configuration, and troubleshooting',
        keywords: ['phone', 'device', 'SIM', 'settings', 'configuration', 'setup', 'eSIM'],
        color: '#8b5cf6',
      },
      {
        id: 'roaming-international',
        name: 'Roaming & International',
        description: 'International roaming, travel passes, and international calls',
        keywords: ['roaming', 'travel', 'abroad', 'international', 'overseas', 'passport'],
        color: '#f59e0b',
      },
      {
        id: 'account-management',
        name: 'Account Management',
        description: 'Account changes, ownership, and profile updates',
        keywords: ['account', 'profile', 'password', 'login', 'ownership', 'transfer'],
        color: '#06b6d4',
      },
    ],
    insightCategories: [
      {
        id: 'connect-phase',
        name: 'CONNECT Phase Analysis',
        description: 'Evaluate the opening phase - welcoming and security verification',
        icon: '👋',
        color: '#3b82f6',
        promptInstructions: `Analyze the CONNECT phase of the call:

WELCOMING EVALUATION:
- Check if agent welcomed with Vodafone branding ("Welcome to Vodafone, my name is...")
- Evaluate clear pronunciation of agent's name and Vodafone branding
- Assess tone quality - should be clear and welcoming, NOT lethargic or rushed
- Check if reason for call was acknowledged where applicable

SECURITY QUESTIONS EVALUATION:
Security questions (Full Name + Qatar ID) ARE REQUIRED for:
- Plan upgrades/downgrades, Number migration/disconnection, Primary number change
- Add/remove Addons, Park number, Request call details, Email ID update
- Notification number change, DOB/Caller Tunes, Bar & Unbar
- Promise to pay, Bill explanation/dispute

Security questions are NOT REQUIRED (score as N/A) for:
- Balance enquiry (unless billing dispute), Payment/recharge status
- Adjustment status, Campaign offers, Troubleshooting without account info
- Throttling enquiry, Call transfers, TT status/follow up, Account status
- General addon benefits enquiry, General inquiries (plans, stores, Metrash)
- PYN/MNP/TON/Migration order status

Rate the overall CONNECT phase quality.`,
        outputFields: [
          { id: 'welcomingScore', name: 'Welcoming Score', type: 'number', description: 'Score for welcoming (0-1): branding, pronunciation, tone, reason for call' },
          { id: 'securityScore', name: 'Security Questions Score', type: 'number', description: 'Score for security verification (0-1, or N/A if not required)' },
          { id: 'securityRequired', name: 'Security Was Required', type: 'boolean', description: 'Whether security questions were required for this call type' },
          { id: 'openingScriptFollowed', name: 'Opening Script Followed', type: 'boolean', description: 'Whether opening script was followed with branding' },
          { id: 'agentIdentified', name: 'Agent Identified Self', type: 'boolean', description: 'Agent stated name and Vodafone branding clearly' },
          { id: 'toneQuality', name: 'Tone Quality', type: 'enum', enumValues: ['Excellent', 'Good', 'Lethargic', 'Rushed', 'Unprofessional'], description: 'Quality of agent tone during opening' },
          { id: 'connectNotes', name: 'Connect Phase Notes', type: 'text', description: 'Detailed observations about the connect phase' },
        ],
        enabled: true,
      },
      {
        id: 'discover-phase',
        name: 'DISCOVER Phase Analysis',
        description: 'Evaluate need identification through probing and questioning',
        icon: '🔍',
        color: '#8b5cf6',
        promptInstructions: `Analyze the DISCOVER phase of the call:

PROBING EVALUATION PRINCIPLES:
1. Probing = Questions needed to understand customer needs or issues
2. For SIMPLE issues (balance inquiry, account status, general info) - Score as PASSED if addressed
3. Check the WHOLE conversation - probing may happen at different stages
4. Don't focus on rigid structure - if customer's issue is well addressed or understood, score as PASSED

SIMPLE ISSUES (Automatic HIGH/PASSED if addressed):
- Balance inquiry
- Account status check
- General information requests
- Store locations/timings
- Plan information

COMPLEX ISSUES (Evaluate probing quality):
- Technical troubleshooting - need to ask about symptoms, timing, affected devices
- Billing disputes - need to understand specific charges questioned
- Service complaints - need to understand full context
- Multiple issues in one call - need to address each issue

KEY: If the customer's issue was well understood and addressed, probing should score HIGH regardless of how many questions were asked.`,
        outputFields: [
          { id: 'probingScore', name: 'Probing Score', type: 'number', description: 'Score for probing technique (0-1): higher for well-understood issues' },
          { id: 'needIdentificationScore', name: 'Need Identification Score', type: 'number', description: 'Score for identifying customer need (0-1)' },
          { id: 'issueComplexity', name: 'Issue Complexity', type: 'enum', enumValues: ['Simple', 'Moderate', 'Complex'], description: 'Complexity of customer issue' },
          { id: 'directQuestioning', name: 'Used Direct Questioning', type: 'boolean', description: 'Whether direct questioning was used effectively' },
          { id: 'needCorrectlyIdentified', name: 'Need Correctly Identified', type: 'boolean', description: 'Whether customer need was correctly identified' },
          { id: 'discoverNotes', name: 'Discover Phase Notes', type: 'text', description: 'Detailed observations about the discover phase' },
        ],
        enabled: true,
      },
      {
        id: 'excite-phase',
        name: 'EXCITE Phase Analysis',
        description: 'Evaluate solution identification and self-care promotion',
        icon: '💡',
        color: '#10b981',
        promptInstructions: `Analyze the EXCITE phase of the call:
- Evaluate if the correct solution was identified
- Check if accurate process SLA was provided
- Assess if self-service channels (MVA) were promoted
- Note any troubleshooting steps provided
- Rate the overall solution presentation quality`,
        outputFields: [
          { id: 'solutionScore', name: 'Solution Identification Score', type: 'number', description: 'Score for solution identification (0-1)' },
          { id: 'selfCareScore', name: 'Self-Care Promotion Score', type: 'number', description: 'Score for MVA/self-care promotion (0-1)' },
          { id: 'mvaPromoted', name: 'MVA Promoted', type: 'boolean', description: 'Whether My Vodafone App was promoted' },
          { id: 'accurateSLAProvided', name: 'Accurate SLA Provided', type: 'boolean', description: 'Whether accurate process SLA was given' },
          { id: 'exciteNotes', name: 'Excite Phase Notes', type: 'text', description: 'Detailed observations about the excite phase' },
        ],
        enabled: true,
      },
      {
        id: 'confirm-deliver-phase',
        name: 'CONFIRM & DELIVER Phase Analysis',
        description: 'Evaluate agreement gaining, closing script, and TNPS promotion',
        icon: '✅',
        color: '#f59e0b',
        promptInstructions: `Analyze the CONFIRM and DELIVER phases of the call:
- Evaluate if customer agreement was gained
- Check if the closing script was followed correctly
- Assess if TNPS (Transactional Net Promoter Score) survey was promoted
- Note if follow-up commitments were made and communicated
- Rate the overall closing quality`,
        outputFields: [
          { id: 'agreementScore', name: 'Customer Agreement Score', type: 'number', description: 'Score for gaining agreement (0-1)' },
          { id: 'closingScore', name: 'Closing Score', type: 'number', description: 'Score for closing the conversation (0-1)' },
          { id: 'tnpsPromoted', name: 'TNPS Promoted', type: 'boolean', description: 'Whether TNPS survey was promoted' },
          { id: 'closingScriptFollowed', name: 'Closing Script Followed', type: 'boolean', description: 'Whether closing script was followed' },
          { id: 'confirmDeliverNotes', name: 'Confirm/Deliver Notes', type: 'text', description: 'Detailed observations about confirm and deliver phases' },
        ],
        enabled: true,
      },
      {
        id: 'soft-skills',
        name: 'Soft Skills Analysis',
        description: 'Evaluate agent soft skills including empathy, tone, listening, and politeness',
        icon: '💬',
        color: '#ec4899',
        promptInstructions: `Analyze the agent's soft skills throughout the call:
- Evaluate empathy displayed towards the customer
- Assess tone and speed of communication
- Check pronunciation clarity
- Evaluate active listening (not interrupting, acknowledging)
- Assess proper hold/mute usage
- Rate overall politeness and professionalism
- Note if agent sounded lethargic or unwelcoming`,
        outputFields: [
          { id: 'empathyScore', name: 'Empathy Score', type: 'number', description: 'Score for empathy (0-1)' },
          { id: 'toneSpeedScore', name: 'Tone & Speed Score', type: 'number', description: 'Score for tone and speed (0-1)' },
          { id: 'pronunciationScore', name: 'Pronunciation Score', type: 'number', description: 'Score for pronunciation clarity (0-1)' },
          { id: 'activeListeningScore', name: 'Active Listening Score', type: 'number', description: 'Score for active listening (0-1)' },
          { id: 'holdMuteScore', name: 'Hold/Mute Score', type: 'number', description: 'Score for proper hold/mute usage (0-1)' },
          { id: 'politenessScore', name: 'Politeness Score', type: 'number', description: 'Score for politeness (0-1)' },
          { id: 'softSkillsNotes', name: 'Soft Skills Notes', type: 'text', description: 'Detailed soft skills observations' },
        ],
        enabled: true,
      },
    ],
  },
  evaluationRules: [
    // ==================== CONNECT PHASE ====================
    {
      type: 'Must Do',
      name: 'Welcoming - Opening Script',
      definition: 'Agent must welcome the customer with proper Vodafone branding, clear pronunciation of name and branding, welcoming tone, and acknowledge the reason for call when applicable',
      evaluationCriteria: `Evaluate ALL of the following criteria:
1. BRANDING: Agent welcomes with "Welcome to Vodafone, my name is [Name]..." or similar branding
2. PRONUNCIATION: Agent clearly pronounces their name and the Vodafone branding
3. TONE: Agent uses a clear, welcoming voice (not lethargic, rushed, or monotone)
4. REASON FOR CALL: Agent acknowledges or asks for the reason for the call where applicable

Scoring:
- PASSED (10): All criteria met - proper branding, clear pronunciation, welcoming tone, reason for call addressed
- PARTIAL (5): Most criteria met but minor issues (e.g., slightly rushed, unclear pronunciation, or missed reason for call)
- FAILED (0): Missing branding, unclear/no name mentioned, unwelcoming tone, or completely skipped opening`,
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'PASSED: "Welcome to Vodafone, my name is Ahmed. How may I assist you today?" (clear, welcoming tone)',
        'PASSED: "Good morning, welcome to Vodafone! I am Sara, and I will be happy to help you with your inquiry today."',
        'PARTIAL: Agent says greeting but rushes through it, or sounds lethargic/unwelcoming',
        'PARTIAL: Agent greets but does not clearly state their name or Vodafone branding',
        'FAILED: Agent does not mention Vodafone branding at all',
        'FAILED: Agent skips the opening script entirely or sounds very unprofessional'
      ],
    },
    {
      type: 'Must Do',
      name: 'Security Questions Verification',
      definition: 'Agent must verify customer identity using Full Name and Qatar ID/Identification Number for sensitive account operations. Security questions are NOT required (score as N/A) for general inquiries.',
      evaluationCriteria: `SECURITY QUESTIONS REQUIRED (Full Name + Qatar ID/Identification Number) for these scenarios:
- Plan upgrade or downgrade
- Number migration
- Number disconnection
- Primary number change
- Add or remove any Addons
- Park number
- Request call details
- Email ID update
- Notification number change
- DOB / Caller Tunes changes
- Bar & Unbar services
- Promise to pay arrangements
- Bill explanation / Bill dispute

SECURITY QUESTIONS NOT REQUIRED (Return N/A) for these scenarios:
- Balance enquiry (unless billing/balance dispute)
- Total outstanding bill enquiry (unless billing/balance dispute)
- Status of payment/recharge
- Adjustment status
- Campaign offers sent
- Troubleshooting without providing account information
- Throttling enquiry (internet is slow)
- Transferring the call to another team
- TT status / TT follow up
- Account status (active-inactive-barred-suspended)
- General addon benefits enquiry
- General Inquiry - For plans or products/add-ons; Metrash, stores locations and timings
- General Inquiry on PYN, MNP, TON, Migration orders (order status)

Scoring:
- PASSED (10): Security questions asked when required, OR correctly identified as N/A when not required
- PARTIAL (5): Only partial verification done when full verification was required
- FAILED (0): Security questions skipped when they were required
- N/A: Security questions not applicable for the call type`,
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'PASSED (Required): "Before I can process your plan upgrade, may I verify your full name and Qatar ID number?"',
        'PASSED (Required): "For security purposes, I need to verify your identity. Can you provide your full name and identification number?"',
        'PASSED (N/A): Customer asks "What is my current balance?" - No security questions needed, agent proceeds directly',
        'PASSED (N/A): Customer asks about store locations - No security questions needed',
        'PARTIAL: Agent asks for name but forgets to ask for Qatar ID when processing a plan change',
        'FAILED: Agent proceeds with number disconnection without any identity verification',
        'N/A: Customer calls for general inquiry about plan features - security not required'
      ],
    },
    // ==================== DISCOVER PHASE ====================
    {
      type: 'Must Do',
      name: 'Probing Technique',
      definition: 'Agent must ask questions needed to understand customer needs or issues. For simple issues like balance inquiry, this should automatically score as High/Passed.',
      evaluationCriteria: `Evaluate probing based on issue complexity and customer understanding:

KEY PRINCIPLES:
1. Questions should be asked to understand customer needs or issues
2. For SIMPLE issues (balance inquiry, account status, general info) - Score as PASSED if issue is addressed
3. Check the WHOLE conversation - probing may happen at different stages, not just at the beginning
4. Don't focus on rigid structure - if customer's issue is well addressed or understood, score as PASSED

SIMPLE ISSUES (Automatic PASSED if addressed):
- Balance inquiry
- Account status check
- General information requests
- Store locations/timings
- Plan information

COMPLEX ISSUES (Evaluate probing quality):
- Technical troubleshooting
- Billing disputes
- Service complaints
- Multiple issues in one call

Scoring:
- PASSED (10): Customer's issue is well understood and addressed, OR simple inquiry handled directly
- PARTIAL (5): Some probing done but missed important details that affected resolution
- FAILED (0): No probing done for complex issue, leading to misunderstanding customer's need`,
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'PASSED (Simple): Customer asks "What is my balance?" - Agent provides balance directly without extensive probing',
        'PASSED (Complex): "I see you are having internet issues. When did this start? Is it affecting all devices or just one? Are you at home or traveling?"',
        'PASSED: Agent asks clarifying questions at any point in the conversation to understand the issue better',
        'PARTIAL: Agent asks some questions but misses key details (e.g., does not ask about error messages for technical issue)',
        'FAILED: Customer has a complex billing dispute but agent does not ask any clarifying questions'
      ],
    },
    {
      type: 'Must Do',
      name: 'Identify Customer Need',
      definition: 'Agent must correctly identify and confirm the customer primary need or issue',
      evaluationCriteria: 'Agent demonstrates clear understanding of the customer need by summarizing or confirming the issue before proceeding to solution.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'So if I understand correctly, you are unable to access mobile data since yesterday despite having an active plan?',
        'Let me confirm - you would like to change your postpaid plan to include more international minutes?'
      ],
    },
    // ==================== EXCITE PHASE ====================
    {
      type: 'Must Do',
      name: 'Identify Solution',
      definition: 'Agent must identify and present the appropriate solution for the customer need, including accurate process SLA when applicable',
      evaluationCriteria: 'Agent provides the correct solution or takes necessary action to fulfill the customer need. Must provide accurate process SLA/timeline when relevant.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'I have reset your data connection. Please restart your phone and it should work within 5 minutes.',
        'I have raised a request for your plan change. This will be effective within 24 hours.',
        'Partial: Agent provides solution but does not mention the process SLA or timeline'
      ],
    },
    {
      type: 'Must Do',
      name: 'Self-Care/MVA Promotion',
      definition: 'Agent must promote self-service channels including My Vodafone App (MVA) for future similar requests',
      evaluationCriteria: 'Agent educates customer about self-service options and promotes MVA for tasks that can be done independently.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'For future reference, you can easily check your balance and change plans using the My Vodafone App.',
        'Did you know you can track your data usage in real-time on our MVA? I can help you download it if needed.',
        'Fail: Agent resolves issue but does not mention any self-service channels'
      ],
    },
    // ==================== CONFIRM PHASE ====================
    {
      type: 'Must Do',
      name: 'Gain Customer Agreement',
      definition: 'Agent must confirm that the customer agrees with the solution provided and understands the next steps',
      evaluationCriteria: 'Agent seeks confirmation that the customer is satisfied with the solution and understands what was done or what will happen next.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'Is there anything else I can help you with regarding this issue?',
        'Are you satisfied with this solution? Do you have any other questions?',
        'I have explained the process. Does this work for you?'
      ],
    },
    // ==================== DELIVER PHASE ====================
    {
      type: 'Must Do',
      name: 'Close the Conversation',
      definition: 'Agent must follow the closing script correctly, thanking the customer and providing proper farewell',
      evaluationCriteria: 'Agent follows the standard closing script, thanks the customer for calling Vodafone, and provides a professional farewell.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'Thank you for calling Vodafone. Is there anything else I can help you with today? Have a great day!',
        'Partial: Agent thanks customer but rushes through closing or skips parts of the script',
        'Fail: Agent ends call abruptly without proper closing'
      ],
    },
    {
      type: 'Must Do',
      name: 'TNPS Promotion',
      definition: 'Agent must promote the Transactional Net Promoter Score (TNPS) survey at the end of the call',
      evaluationCriteria: 'Agent informs customer about the TNPS survey and encourages participation before ending the call.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'You may receive a short survey about your experience today. Your feedback helps us improve our service.',
        'After this call, you might receive an SMS survey. We would appreciate if you could take a moment to rate your experience.',
        'Fail: Call ends without any mention of TNPS or customer feedback survey'
      ],
    },
    {
      type: 'Must Do',
      name: 'Follow-up on Commitment',
      definition: 'Agent must clearly communicate any follow-up actions or commitments made during the call',
      evaluationCriteria: 'If any callback or follow-up was promised, agent must clearly state when and how the follow-up will occur.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'I have scheduled a callback for tomorrow between 2-4 PM to confirm your issue is resolved.',
        'Our technical team will call you within 24 hours to follow up on this matter.',
        'N/A if no follow-up commitment was made during the call'
      ],
    },
    // ==================== SOFT SKILLS ====================
    {
      type: 'Must Do',
      name: 'Empathy',
      definition: 'Agent must display empathy and understanding towards the customer situation and concerns',
      evaluationCriteria: 'Agent acknowledges customer feelings, shows understanding of frustration or concern, and responds with appropriate care.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'I understand how frustrating it must be to have this issue with your service.',
        'I am sorry to hear about the inconvenience this has caused you.',
        'I can see why this would be concerning, let me help you resolve this right away.'
      ],
    },
    {
      type: 'Must Do',
      name: 'Tone and Speed',
      definition: 'Agent must maintain appropriate tone and speaking speed throughout the call',
      evaluationCriteria: 'Agent speaks clearly, at an appropriate pace (not too fast, not too slow), with a professional and welcoming tone. Should not sound lethargic or unwelcoming.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'Agent maintains consistent, professional tone throughout the call',
        'Partial: Agent sounds lethargic or voice is not welcoming',
        'Fail: Agent speaks too fast making it hard to understand, or tone is unprofessional'
      ],
    },
    {
      type: 'Must Do',
      name: 'Pronunciation',
      definition: 'Agent must have clear pronunciation and articulation',
      evaluationCriteria: 'Agent pronounces words clearly and is easily understood. Technical terms and numbers are articulated properly.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'Agent clearly pronounces plan names, amounts, and technical terms',
        'Agent spells out reference numbers and confirms spelling when needed'
      ],
    },
    {
      type: 'Must Do',
      name: 'Active Listening',
      definition: 'Agent must demonstrate active listening by not interrupting and acknowledging customer statements',
      evaluationCriteria: 'Agent listens without interrupting, acknowledges what the customer says, and responds appropriately to show they understood.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'Agent lets customer complete their explanation before responding',
        'Agent uses acknowledgments like "I understand" or "I see" appropriately',
        'Fail: Agent frequently interrupts the customer'
      ],
    },
    {
      type: 'Must Do',
      name: 'Hold/Mute Usage',
      definition: 'Agent must use hold and mute functions appropriately and professionally',
      evaluationCriteria: 'Agent asks permission before placing on hold, provides reason, thanks customer for waiting. Mute is not used inappropriately (no extended silence at call start).',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'May I place you on hold for a moment while I check this information?',
        'Thank you for holding, I appreciate your patience.',
        'Partial: Call was on mute for extended time (e.g., first 20 seconds)'
      ],
    },
    {
      type: 'Must Do',
      name: 'Politeness',
      definition: 'Agent must be polite and respectful throughout the entire call',
      evaluationCriteria: 'Agent uses polite language, says please and thank you, addresses customer respectfully, and maintains professionalism even when dealing with difficult situations.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'Agent consistently uses "please", "thank you", and "you are welcome"',
        'Agent addresses customer by name respectfully',
        'Agent maintains composure and politeness even with frustrated customers'
      ],
    },
    // ==================== OPERATIONAL METRICS ====================
    {
      type: 'Must Not Do',
      name: 'Call Drop Prevention',
      definition: 'Agent must not disconnect the call inappropriately or allow preventable call drops',
      evaluationCriteria: 'Call should be completed properly without agent-caused disconnection. Technical drops should be followed up.',
      scoringStandard: { passed: 10, failed: 0 },
      examples: [
        'Agent maintains connection until customer confirms they have no more questions',
        'If technical drop occurs, agent follows callback procedure',
        'Fail: Agent disconnects call while customer is still speaking or without proper closing'
      ],
    },
    {
      type: 'Must Do',
      name: 'Activity Documentation',
      definition: 'Agent must properly document the call activity and actions taken',
      evaluationCriteria: 'Agent creates appropriate case notes or activity records for the interaction.',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: [
        'Agent confirms case/ticket has been created for tracking',
        'Agent provides reference number to customer when applicable'
      ],
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
  'vodafone': VODAFONE_TEMPLATE,
  'insurance-claims': INSURANCE_CLAIMS_TEMPLATE,
  'banking-support': BANKING_SUPPORT_TEMPLATE,
  'ecommerce-support': ECOMMERCE_SUPPORT_TEMPLATE,
  'it-helpdesk': IT_HELPDESK_TEMPLATE,
  'utilities': UTILITIES_TEMPLATE,
  'hospitality': HOSPITALITY_TEMPLATE,
  'real-estate': REAL_ESTATE_TEMPLATE,
  'automotive': AUTOMOTIVE_TEMPLATE,
  'government': GOVERNMENT_TEMPLATE,
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
