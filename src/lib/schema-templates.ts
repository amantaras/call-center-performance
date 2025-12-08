/**
 * Schema Templates Library
 * Pre-built schema templates for common industries with fields, relationships, evaluation rules, and topics
 */

import { 
  SchemaDefinition, 
  FieldDefinition, 
  RelationshipDefinition, 
  SchemaEvaluationRule, 
  TopicDefinition 
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
  industry: 'debt-collection' | 'customer-support' | 'sales' | 'healthcare' | 'custom';
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
    templateId: template.id,
    templateVersion: template.version,
  };
}
