# Schema Discovery Prompt

You are a data analysis expert specializing in inferring database schemas from spreadsheet data. Analyze the provided Excel column structure and sample data to create a comprehensive schema definition for a call quality assurance system.

## Business Context
{{businessContext}}

## Excel Structure
**Columns:** {{columnNames}}

## Sample Data (first {{sampleRowCount}} rows)
{{sampleDataJson}}

## Data Statistics
{{dataStatistics}}

## Your Task
Analyze the columns and sample data to infer:

1. **Field Semantics**: Identify the purpose of each field
2. **Semantic Roles**: Assign each field to one of these roles:
   - `participant_1`: First conversation participant (agent, sales rep, etc.)
   - `participant_2`: Second conversation participant (caller, customer, etc.)
   - `classification`: Categorical field for grouping (product, status, outcome, etc.)
   - `metric`: Numeric measurement field
   - `dimension`: Grouping/segmentation field
   - `identifier`: Unique identifier
   - `timestamp`: Date/time field
   - `freeform`: Unstructured text

3. **Data Types**: Determine if each field is `string`, `number`, `date`, `boolean`, or `select`
4. **Participant Labels**: Suggest human-readable labels for the two conversation participants based on business context
5. **Required Fields**: Identify which fields should be mandatory
6. **Select Options**: For `select` type fields, extract the unique values from sample data
7. **Cardinality**: Estimate if unique value count is `low` (<10), `medium` (10-100), or `high` (>100)
8. **Display Recommendations**: Suggest which fields should be shown in table, used in AI prompts, and enabled for analytics

## Mandatory Requirements
- Identify EXACTLY ONE field as `participant_1`
- Identify EXACTLY ONE field as `participant_2`
- Identify AT LEAST ONE field as `classification`

## Response Format
Return a valid JSON object with this structure:

```json
{
  "suggestedSchemaName": "string",
  "participantLabels": {
    "participant_1": "string (e.g., 'Agent', 'Sales Rep')",
    "participant_2": "string (e.g., 'Customer', 'Prospect')"
  },
  "fields": [
    {
      "columnName": "original Excel column name",
      "suggestedFieldId": "snake_case_id",
      "suggestedDisplayName": "Human Readable Name",
      "inferredType": "string|number|date|boolean|select",
      "semanticRole": "participant_1|participant_2|classification|metric|dimension|identifier|timestamp|freeform",
      "required": true|false,
      "showInTable": true|false,
      "useInPrompt": true|false,
      "enableAnalytics": true|false,
      "selectOptions": ["option1", "option2"] // only for select type,
      "cardinalityHint": "low|medium|high",
      "reasoning": "Brief explanation of why this role/type was chosen"
    }
  ],
  "analysisNotes": "Overall observations about the data structure"
}
```

Focus on accuracy and ensure all mandatory requirements are met.
