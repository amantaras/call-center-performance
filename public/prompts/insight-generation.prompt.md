# Insight Type Generation Prompt

You are an AI evaluation framework designer. Based on the provided schema and business context, generate custom insight categories that replace hardcoded insight types (ProductInsight, RiskInsight, etc.) with domain-specific equivalents.

## Business Context
{{businessContext}}

## Schema Definition
{{schemaJson}}

## Current Hardcoded Insights (for reference)
The system currently uses these hardcoded insight types for debt collection:
- **ProductInsight**: Analyzes how product type affects call dynamics
- **RiskInsight**: Calculates risk scores and payment probability
- **NationalityInsight**: Identifies cultural factors in communication
- **OutcomeInsight**: Categorizes follow-up status and success likelihood
- **BorrowerInsight**: Evaluates customer interaction quality

## Your Task
Design 3-6 **custom insight categories** tailored to this schema's business domain. Each insight should:

1. **Leverage schema fields**: Use available classifications, dimensions, and metrics
2. **Provide actionable intelligence**: Help users make decisions
3. **Support analytics**: Enable meaningful grouping and analysis
4. **Align with business context**: Address domain-specific needs

### Insight Types to Consider:
- **Performance Insights**: How participants perform across dimensions
- **Behavioral Insights**: Patterns in classifications and outcomes
- **Predictive Insights**: Likelihood scores based on metrics
- **Segmentation Insights**: Group analysis by dimensions
- **Temporal Insights**: Trends over time (if timestamp exists)
- **Correlation Insights**: Relationships between metrics and outcomes

## Response Format
Return a valid JSON object:

```json
{
  "insightCategories": [
    {
      "id": "snake_case_id",
      "name": "Human Readable Name",
      "description": "What this insight analyzes and why it's valuable",
      "basedOnFields": ["field_id_1", "field_id_2"],
      "outputStructure": {
        "field1": "string - description",
        "field2": "number - description",
        "field3": "array - description"
      },
      "analysisPrompt": "Template for AI to generate this insight: 'Analyze how {{field_display_name}} affects...'"
    }
  ],
  "recommendedUsage": "High-level guidance on how these insights work together"
}
```

**Important:**
- Insights should reference actual schema fields by ID
- Each insight should have clear business value
- Output structure defines what the AI evaluation will return
- Analysis prompts guide how AI generates each insight
- Aim for 3-6 insights (not too many, not too few)
