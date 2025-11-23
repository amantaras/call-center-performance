import { SchemaBundle } from '@/types/schema';

/**
 * Preset schema templates with complete bundles (schema + rules + analytics)
 * These provide starting points for common call center QA scenarios
 */

/**
 * Debt Collection Template
 * For collection agencies managing overdue accounts
 */
export const DEBT_COLLECTION_TEMPLATE: SchemaBundle = {
  schema: {
    id: 'debt-collection-template',
    name: 'Debt Collection',
    version: '1.0.0',
    description: 'Template for collection agencies managing overdue accounts with borrowers',
    businessContext: `This schema is designed for debt collection call centers that handle conversations between collection agents and borrowers regarding overdue payments. The business goals include:
- Maximizing payment collection rates while maintaining regulatory compliance
- Assessing borrower risk and payment probability
- Tracking follow-up outcomes and escalation needs
- Understanding cultural factors affecting collection success
- Optimizing collection strategies based on product type and borrower profiles`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [
      {
        id: 'agentName',
        displayName: 'Agent Name',
        dataType: 'string',
        semanticRole: 'participant_1',
        columnMapping: ['Agent name', 'AgentName', 'agent_name', 'Agent'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'borrowerName',
        displayName: 'Borrower Name',
        dataType: 'string',
        semanticRole: 'participant_2',
        columnMapping: ['Borrower name', 'BorrowerName', 'borrower_name', 'Borrower', 'Customer name'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'product',
        displayName: 'Product',
        dataType: 'string',
        semanticRole: 'classification',
        columnMapping: ['Product', 'product', 'Product Type'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'followUpStatus',
        displayName: 'Follow-up Status',
        dataType: 'string',
        semanticRole: 'classification',
        columnMapping: ['Follow up status', 'FollowUpStatus', 'follow_up_status', 'Status', 'Outcome'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'nationality',
        displayName: 'Nationality',
        dataType: 'string',
        semanticRole: 'dimension',
        columnMapping: ['Nationality', 'nationality', 'Country'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'daysPastDue',
        displayName: 'Days Past Due',
        dataType: 'number',
        semanticRole: 'metric',
        columnMapping: ['Days past due', 'DaysPastDue', 'days_past_due', 'DPD'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false,
        defaultValue: 0
      },
      {
        id: 'dueAmount',
        displayName: 'Due Amount',
        dataType: 'number',
        semanticRole: 'metric',
        columnMapping: ['Due amount', 'DueAmount', 'due_amount', 'Amount Due', 'Outstanding Balance'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false,
        defaultValue: 0
      },
      {
        id: 'customerType',
        displayName: 'Customer Type',
        dataType: 'string',
        semanticRole: 'dimension',
        columnMapping: ['Customer type', 'CustomerType', 'customer_type', 'Type'],
        useInPrompt: false,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'time',
        displayName: 'Call Time',
        dataType: 'date',
        semanticRole: 'timestamp',
        columnMapping: ['TITLE', 'Title', 'time', 'Call Time', 'Date'],
        useInPrompt: false,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'billId',
        displayName: 'Bill ID',
        dataType: 'string',
        semanticRole: 'identifier',
        columnMapping: ['BILLID', 'BillId', 'Bill ID', 'bill_id'],
        useInPrompt: false,
        showInTable: false,
        isRequired: false
      },
      {
        id: 'orderId',
        displayName: 'Order ID',
        dataType: 'string',
        semanticRole: 'identifier',
        columnMapping: ['ORDERID', 'OrderId', 'Order ID', 'order_id'],
        useInPrompt: false,
        showInTable: false,
        isRequired: false
      },
      {
        id: 'userId',
        displayName: 'User ID',
        dataType: 'string',
        semanticRole: 'identifier',
        columnMapping: ['User_id', 'UserId', 'User ID', 'user_id'],
        useInPrompt: false,
        showInTable: false,
        isRequired: false
      },
      {
        id: 'fileTag',
        displayName: 'File Tag',
        dataType: 'string',
        semanticRole: 'freeform',
        columnMapping: ['File_tag', 'File tag', 'file_tag', 'FileTag'],
        useInPrompt: false,
        showInTable: false,
        isRequired: false
      },
      {
        id: 'audioUrl',
        displayName: 'Audio URL',
        dataType: 'string',
        semanticRole: 'freeform',
        columnMapping: ['audioUrl', 'audio_url', 'Audio URL'],
        useInPrompt: false,
        showInTable: false,
        isRequired: false
      }
    ],
    relationships: [
      {
        type: 'simple',
        description: 'Higher days past due typically correlates with higher risk tier',
        involvedFields: ['daysPastDue']
      },
      {
        type: 'simple',
        description: 'Product type influences collection strategy and success rate',
        involvedFields: ['product', 'followUpStatus']
      },
      {
        type: 'simple',
        description: 'Nationality may affect communication approach and success factors',
        involvedFields: ['nationality', 'followUpStatus']
      }
    ]
  },
  evaluationRules: [
    {
      id: 1,
      type: 'Must Do',
      name: 'Proper Identification',
      definition: 'Agent must properly identify themselves and verify borrower identity at the start of the call',
      evaluationCriteria: 'Check if agent states their name, company, and purpose of call. Verify borrower identity through security questions.',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Agent: "This is John from ABC Collections. Am I speaking with Mr. Smith?"']
    },
    {
      id: 2,
      type: 'Must Do',
      name: 'Account Details Disclosure',
      definition: 'Agent must clearly state the outstanding amount and days past due',
      evaluationCriteria: 'Verify that agent mentions specific dollar amount and number of days overdue',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Agent: "Your account shows $500 overdue by 45 days"']
    },
    {
      id: 3,
      type: 'Must Do',
      name: 'Payment Options Offered',
      definition: 'Agent must present clear payment options and methods',
      evaluationCriteria: 'Check if agent offers multiple payment methods (online, phone, mail) and payment plans if applicable',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Agent: "You can pay online, over the phone, or set up a payment plan"']
    },
    {
      id: 4,
      type: 'Must Not Do',
      name: 'No Threats or Harassment',
      definition: 'Agent must not use threatening language or harassing tactics',
      evaluationCriteria: 'Ensure no threatening language, excessive calling frequency mentions, or intimidation tactics',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['VIOLATION: "If you don\'t pay, we\'ll ruin your credit forever"']
    },
    {
      id: 5,
      type: 'Must Do',
      name: 'Compliance with Regulations',
      definition: 'Agent must include required legal disclosures (mini-Miranda)',
      evaluationCriteria: 'Verify that agent includes debt validation notice and identifies as debt collector',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Agent: "This is an attempt to collect a debt. Any information obtained will be used for that purpose"']
    },
    {
      id: 6,
      type: 'Must Do',
      name: 'Active Listening',
      definition: 'Agent demonstrates active listening to borrower concerns',
      evaluationCriteria: 'Agent acknowledges borrower statements, asks clarifying questions, shows empathy',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Agent: "I understand this is a difficult situation. Can you tell me more about what happened?"']
    },
    {
      id: 7,
      type: 'Must Do',
      name: 'Clear Next Steps',
      definition: 'Agent clearly establishes next steps and follow-up',
      evaluationCriteria: 'Check if agent confirms payment commitment, callback date, or other specific action items',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Agent: "So you\'ll make a payment of $200 by Friday, and I\'ll call you next Monday to confirm"']
    },
    {
      id: 8,
      type: 'Must Not Do',
      name: 'No False Statements',
      definition: 'Agent must not make false or misleading statements',
      evaluationCriteria: 'Ensure agent does not misrepresent amount owed, legal consequences, or identity',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['VIOLATION: "This is the police department calling about your debt"']
    }
  ],
  analyticsViews: [
    {
      id: 'performance-by-agent',
      name: 'Performance by Agent',
      description: 'Agent performance comparison showing average scores',
      chartType: 'bar',
      dimensionField: 'agentName',
      aggregation: 'avg',
      enabled: true
    },
    {
      id: 'collection-by-product',
      name: 'Collection Success by Product',
      description: 'Success rates broken down by product type',
      chartType: 'bar',
      dimensionField: 'product',
      aggregation: 'count',
      enabled: true
    },
    {
      id: 'risk-by-days-overdue',
      name: 'Risk Distribution by Days Past Due',
      description: 'Distribution of accounts by overdue period',
      chartType: 'bar',
      dimensionField: 'daysPastDue',
      measureField: 'dueAmount',
      aggregation: 'sum',
      enabled: true
    },
    {
      id: 'outcome-by-nationality',
      name: 'Outcomes by Nationality',
      description: 'Follow-up status distribution across nationalities',
      chartType: 'bar',
      dimensionField: 'nationality',
      aggregation: 'count',
      enabled: true
    },
    {
      id: 'performance-trend',
      name: 'Performance Trend Over Time',
      description: 'Daily performance scores showing improvement trends',
      chartType: 'trend',
      dimensionField: 'time',
      aggregation: 'avg',
      enabled: true
    },
    {
      id: 'amount-vs-dpd-correlation',
      name: 'Due Amount vs Days Past Due',
      description: 'Scatter plot showing relationship between amount owed and overdue period',
      chartType: 'scatter',
      dimensionField: 'daysPastDue',
      measureField: 'dueAmount',
      aggregation: 'avg',
      enabled: true
    }
  ]
};

/**
 * Customer Support Template
 * For customer service centers handling support inquiries
 */
export const CUSTOMER_SUPPORT_TEMPLATE: SchemaBundle = {
  schema: {
    id: 'customer-support-template',
    name: 'Customer Support',
    version: '1.0.0',
    description: 'Template for customer service centers handling support and service inquiries',
    businessContext: `This schema is designed for customer support call centers managing service inquiries, troubleshooting, and customer satisfaction. Business goals include:
- Ensuring first-call resolution and customer satisfaction
- Tracking issue types and resolution effectiveness
- Optimizing support agent performance
- Identifying training needs and knowledge gaps
- Monitoring response times and service quality`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [
      {
        id: 'agentName',
        displayName: 'Agent Name',
        dataType: 'string',
        semanticRole: 'participant_1',
        columnMapping: ['Agent name', 'AgentName', 'agent', 'Representative'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'customerName',
        displayName: 'Customer Name',
        dataType: 'string',
        semanticRole: 'participant_2',
        columnMapping: ['Customer name', 'CustomerName', 'customer', 'Caller'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'issueType',
        displayName: 'Issue Type',
        dataType: 'string',
        semanticRole: 'classification',
        columnMapping: ['Issue Type', 'IssueType', 'issue', 'Category', 'Problem Type'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'resolutionStatus',
        displayName: 'Resolution Status',
        dataType: 'string',
        semanticRole: 'classification',
        columnMapping: ['Resolution Status', 'Status', 'Outcome', 'Result'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'priority',
        displayName: 'Priority Level',
        dataType: 'string',
        semanticRole: 'dimension',
        columnMapping: ['Priority', 'Level', 'Urgency'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'callDuration',
        displayName: 'Call Duration (seconds)',
        dataType: 'number',
        semanticRole: 'metric',
        columnMapping: ['Call Duration', 'Duration', 'call_duration', 'Time'],
        useInPrompt: false,
        showInTable: true,
        isRequired: false,
        defaultValue: 0
      },
      {
        id: 'ticketId',
        displayName: 'Ticket ID',
        dataType: 'string',
        semanticRole: 'identifier',
        columnMapping: ['Ticket ID', 'TicketId', 'ticket', 'Case Number'],
        useInPrompt: false,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'productService',
        displayName: 'Product/Service',
        dataType: 'string',
        semanticRole: 'dimension',
        columnMapping: ['Product', 'Service', 'Product/Service'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'callTime',
        displayName: 'Call Time',
        dataType: 'date',
        semanticRole: 'timestamp',
        columnMapping: ['Call Time', 'Timestamp', 'Date', 'time'],
        useInPrompt: false,
        showInTable: true,
        isRequired: false
      }
    ],
    relationships: [
      {
        type: 'simple',
        description: 'Issue type affects average resolution time and success rate',
        involvedFields: ['issueType', 'resolutionStatus']
      },
      {
        type: 'simple',
        description: 'Priority level correlates with expected resolution speed',
        involvedFields: ['priority', 'callDuration']
      }
    ]
  },
  evaluationRules: [
    {
      id: 1,
      type: 'Must Do',
      name: 'Professional Greeting',
      definition: 'Agent must greet customer professionally and introduce themselves',
      evaluationCriteria: 'Check if agent provides name, company, and offers assistance',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Agent: "Thank you for calling XYZ Support. This is Sarah. How can I help you today?"']
    },
    {
      id: 2,
      type: 'Must Do',
      name: 'Issue Understanding',
      definition: 'Agent must demonstrate clear understanding of the customer issue',
      evaluationCriteria: 'Verify agent asks clarifying questions and paraphrases problem',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Agent: "So if I understand correctly, your internet has been disconnected since yesterday?"']
    },
    {
      id: 3,
      type: 'Must Do',
      name: 'Solution Provided',
      definition: 'Agent must provide clear solution or next steps',
      evaluationCriteria: 'Check if agent explains resolution steps or timeline clearly',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Agent: "I\'ll reset your connection now. You should see service restored in 2-3 minutes"']
    },
    {
      id: 4,
      type: 'Must Do',
      name: 'Confirmation of Resolution',
      definition: 'Agent must verify issue is resolved before ending call',
      evaluationCriteria: 'Agent asks if customer is satisfied and if issue is fixed',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Agent: "Is everything working correctly now? Do you have any other questions?"']
    },
    {
      id: 5,
      type: 'Must Do',
      name: 'Empathy and Patience',
      definition: 'Agent shows empathy and patience with customer concerns',
      evaluationCriteria: 'Agent uses empathetic language and maintains patience',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Agent: "I understand how frustrating this must be. Let me help you resolve this right away"']
    },
    {
      id: 6,
      type: 'Must Not Do',
      name: 'No Blame or Dismissiveness',
      definition: 'Agent must not blame customer or dismiss concerns',
      evaluationCriteria: 'Ensure agent doesn\'t use dismissive language or blame customer',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['VIOLATION: "This is your fault for not reading the instructions"']
    }
  ],
  analyticsViews: [
    {
      id: 'performance-by-agent',
      name: 'Agent Performance',
      description: 'Support agent performance metrics',
      chartType: 'bar',
      dimensionField: 'agentName',
      aggregation: 'avg',
      enabled: true
    },
    {
      id: 'issues-by-type',
      name: 'Issues by Type',
      description: 'Distribution of support issues by category',
      chartType: 'pie',
      dimensionField: 'issueType',
      aggregation: 'count',
      enabled: true
    },
    {
      id: 'resolution-by-priority',
      name: 'Resolution Success by Priority',
      description: 'Resolution rates across priority levels',
      chartType: 'bar',
      dimensionField: 'priority',
      aggregation: 'count',
      enabled: true
    },
    {
      id: 'call-duration-trend',
      name: 'Average Call Duration Trend',
      description: 'Daily average call handling time',
      chartType: 'trend',
      dimensionField: 'callTime',
      measureField: 'callDuration',
      aggregation: 'avg',
      enabled: true
    }
  ]
};

/**
 * Sales QA Template
 * For sales call quality assurance and conversion tracking
 */
export const SALES_QA_TEMPLATE: SchemaBundle = {
  schema: {
    id: 'sales-qa-template',
    name: 'Sales QA',
    version: '1.0.0',
    description: 'Template for sales call quality assurance and conversion optimization',
    businessContext: `This schema is designed for sales teams tracking call quality, conversion rates, and sales performance. Business goals include:
- Maximizing conversion rates and deal closure
- Ensuring compliance with sales regulations
- Tracking sales methodology adherence
- Identifying high-performing sales techniques
- Optimizing pricing and objection handling`,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    fields: [
      {
        id: 'salesRep',
        displayName: 'Sales Representative',
        dataType: 'string',
        semanticRole: 'participant_1',
        columnMapping: ['Sales Rep', 'SalesRep', 'sales_rep', 'Agent', 'Representative'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'prospectName',
        displayName: 'Prospect Name',
        dataType: 'string',
        semanticRole: 'participant_2',
        columnMapping: ['Prospect Name', 'ProspectName', 'prospect', 'Lead', 'Customer'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'productOffered',
        displayName: 'Product Offered',
        dataType: 'string',
        semanticRole: 'classification',
        columnMapping: ['Product', 'Product Offered', 'Offering', 'Solution'],
        useInPrompt: true,
        showInTable: true,
        isRequired: true
      },
      {
        id: 'callOutcome',
        displayName: 'Call Outcome',
        dataType: 'string',
        semanticRole: 'classification',
        columnMapping: ['Outcome', 'Call Outcome', 'Result', 'Status'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'dealValue',
        displayName: 'Deal Value',
        dataType: 'number',
        semanticRole: 'metric',
        columnMapping: ['Deal Value', 'Value', 'Amount', 'Price'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false,
        defaultValue: 0
      },
      {
        id: 'leadSource',
        displayName: 'Lead Source',
        dataType: 'string',
        semanticRole: 'dimension',
        columnMapping: ['Lead Source', 'Source', 'Channel'],
        useInPrompt: false,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'industry',
        displayName: 'Industry',
        dataType: 'string',
        semanticRole: 'dimension',
        columnMapping: ['Industry', 'Sector', 'Vertical'],
        useInPrompt: true,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'callDate',
        displayName: 'Call Date',
        dataType: 'date',
        semanticRole: 'timestamp',
        columnMapping: ['Call Date', 'Date', 'Timestamp', 'time'],
        useInPrompt: false,
        showInTable: true,
        isRequired: false
      },
      {
        id: 'opportunityId',
        displayName: 'Opportunity ID',
        dataType: 'string',
        semanticRole: 'identifier',
        columnMapping: ['Opportunity ID', 'OpportunityId', 'Opp ID', 'Deal ID'],
        useInPrompt: false,
        showInTable: false,
        isRequired: false
      }
    ],
    relationships: [
      {
        type: 'simple',
        description: 'Product type affects deal value and conversion rate',
        involvedFields: ['productOffered', 'dealValue']
      },
      {
        type: 'simple',
        description: 'Lead source influences conversion probability',
        involvedFields: ['leadSource', 'callOutcome']
      },
      {
        type: 'simple',
        description: 'Industry vertical may affect sales approach effectiveness',
        involvedFields: ['industry', 'callOutcome']
      }
    ]
  },
  evaluationRules: [
    {
      id: 1,
      type: 'Must Do',
      name: 'Needs Discovery',
      definition: 'Sales rep must discover prospect needs through effective questioning',
      evaluationCriteria: 'Check if rep asks open-ended questions about pain points, goals, and challenges',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Rep: "What challenges are you currently facing with your current solution?"']
    },
    {
      id: 2,
      type: 'Must Do',
      name: 'Value Proposition',
      definition: 'Sales rep clearly articulates value proposition aligned with needs',
      evaluationCriteria: 'Verify rep connects product features to prospect\'s specific needs',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Rep: "Based on your need for automation, our platform can save you 10 hours per week"']
    },
    {
      id: 3,
      type: 'Must Do',
      name: 'Objection Handling',
      definition: 'Sales rep effectively addresses objections and concerns',
      evaluationCriteria: 'Rep acknowledges objections and provides thoughtful responses',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Rep: "I understand budget is a concern. Let me show you the ROI calculation"']
    },
    {
      id: 4,
      type: 'Must Do',
      name: 'Clear Call to Action',
      definition: 'Sales rep establishes clear next steps or asks for the sale',
      evaluationCriteria: 'Check if rep proposes specific next action (demo, meeting, purchase)',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['Rep: "Can we schedule a demo for next Tuesday at 2pm?"']
    },
    {
      id: 5,
      type: 'Must Not Do',
      name: 'No Misleading Claims',
      definition: 'Sales rep must not make false or exaggerated claims',
      evaluationCriteria: 'Ensure all product claims are accurate and substantiated',
      scoringStandard: { passed: 10, failed: 0 },
      examples: ['VIOLATION: "We\'re the #1 solution in the world with 100% success rate"']
    },
    {
      id: 6,
      type: 'Must Do',
      name: 'Active Listening',
      definition: 'Sales rep demonstrates active listening to prospect responses',
      evaluationCriteria: 'Rep acknowledges statements, asks follow-up questions, adapts pitch',
      scoringStandard: { passed: 10, failed: 0, partial: 5 },
      examples: ['Rep: "You mentioned scalability is important. Tell me more about your growth plans"']
    }
  ],
  analyticsViews: [
    {
      id: 'conversion-by-rep',
      name: 'Conversion Rate by Rep',
      description: 'Sales conversion performance by representative',
      chartType: 'bar',
      dimensionField: 'salesRep',
      aggregation: 'count',
      enabled: true
    },
    {
      id: 'revenue-by-product',
      name: 'Revenue by Product',
      description: 'Total deal value by product offered',
      chartType: 'bar',
      dimensionField: 'productOffered',
      measureField: 'dealValue',
      aggregation: 'sum',
      enabled: true
    },
    {
      id: 'outcomes-distribution',
      name: 'Call Outcomes Distribution',
      description: 'Distribution of call outcomes (won, lost, follow-up)',
      chartType: 'pie',
      dimensionField: 'callOutcome',
      aggregation: 'count',
      enabled: true
    },
    {
      id: 'conversion-by-source',
      name: 'Conversion by Lead Source',
      description: 'Conversion effectiveness across lead sources',
      chartType: 'bar',
      dimensionField: 'leadSource',
      aggregation: 'count',
      enabled: true
    },
    {
      id: 'revenue-trend',
      name: 'Revenue Trend',
      description: 'Daily revenue and deal closure trend',
      chartType: 'trend',
      dimensionField: 'callDate',
      measureField: 'dealValue',
      aggregation: 'sum',
      enabled: true
    }
  ]
};

/**
 * Get all available schema templates
 */
export function getAllTemplates(): SchemaBundle[] {
  return [
    DEBT_COLLECTION_TEMPLATE,
    CUSTOMER_SUPPORT_TEMPLATE,
    SALES_QA_TEMPLATE
  ];
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): SchemaBundle | null {
  const templates = getAllTemplates();
  return templates.find(t => t.schema.id === id) || null;
}

/**
 * Get template names for selection UI
 */
export function getTemplateNames(): Array<{ id: string; name: string; description: string }> {
  return getAllTemplates().map(t => ({
    id: t.schema.id,
    name: t.schema.name,
    description: t.schema.description
  }));
}
