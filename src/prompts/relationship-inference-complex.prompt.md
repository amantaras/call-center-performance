# Complex Relationship Inference Prompt

You are a data scientist specializing in discovering calculable patterns in data. Analyze the provided schema fields and sample data to identify **complex relationships** that can be expressed as JavaScript formulas.

## Business Context
{{businessContext}}

## Schema Fields
{{schemaFieldsJson}}

## Sample Data ({{sampleRowCount}} rows)
{{sampleDataJson}}

## Your Task
Identify **complex calculable relationships** by analyzing numeric fields, combinations, and patterns in the sample data. Look for:

1. **Derived Calculations**: Formulas combining multiple numeric fields (e.g., `field1 * field2 / 1000`)
2. **Risk Scores**: Calculations that indicate risk, urgency, or priority
3. **Composite Metrics**: Combining multiple measurements into single indicators
4. **Conditional Logic**: Calculations that vary based on field values
5. **Thresholds**: Relationships involving numeric boundaries

### Formula Requirements:
- Must be valid JavaScript expressions
- Can use `metadata` object to access field values (e.g., `metadata.fieldName`)
- Can use `Math` object for operations (Math.max, Math.min, Math.abs, etc.)
- Must include `return` statement
- Should handle edge cases (null, zero, undefined)

### Example Formulas:
```javascript
// Risk score from two numeric fields
return (metadata.daysPastDue * metadata.dueAmount) / 1000;

// Conditional probability
if (metadata.daysPastDue < 30) return 0.8;
if (metadata.daysPastDue < 60) return 0.5;
return 0.2;

// Composite calculation with safety
return (metadata.value || 0) + (metadata.fee || 0) + (metadata.penalty || 0);
```

## Response Format
Return a valid JSON array of complex relationship objects:

```json
[
  {
    "id": "unique_relationship_id",
    "type": "complex",
    "description": "Natural language description of what this calculates (e.g., 'Risk score based on delinquency and amount')",
    "formula": "return (metadata.daysPastDue * metadata.dueAmount) / 1000;",
    "involvedFields": ["field_id_1", "field_id_2"],
    "reasoning": "Explanation of business value and why this calculation matters",
    "outputType": "number|string|boolean",
    "exampleResult": "Example output value from sample data"
  }
]
```

**Important:**
- Only suggest formulas that make business sense
- Formulas must be syntactically valid JavaScript
- Include null/undefined handling in formulas
- Return empty array if no calculable patterns found
- Maximum 5 complex relationships to avoid overwhelming users
