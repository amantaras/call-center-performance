# AI Insight Category Generation Prompt

You are an expert call center analytics consultant. Your task is to generate relevant AI insight categories for a call center schema based on its business context, fields, topics, and evaluation rules.

## Schema Information

**Business Context:**
{{businessContext}}

**Industry/Template:** {{templateName}}

**Schema Fields:**
{{fields}}

**Topic Taxonomy:**
{{topics}}

**Evaluation Rules:**
{{evaluationRules}}

## Your Task

Generate 3-5 AI insight categories that would be most valuable for analyzing calls in this context. Each insight category should:

1. Be highly relevant to the specific business context and industry
2. Leverage the available metadata fields
3. Provide actionable intelligence from call analysis
4. Not duplicate what evaluation rules already cover
5. Focus on business outcomes and predictive insights

## Output Format

Return a JSON array of insight categories with this exact structure:

```json
[
  {
    "id": "insight-id-kebab-case",
    "name": "Insight Display Name",
    "description": "Brief description of what this insight analyzes",
    "icon": "single emoji",
    "color": "#hexcolor",
    "promptInstructions": "Detailed instructions for the LLM to generate this insight from a call transcript. Be specific about:\n- What to look for in the conversation\n- How to assess or calculate values\n- What context from metadata to consider\n- How to form conclusions",
    "outputFields": [
      {
        "id": "fieldId",
        "name": "Field Display Name",
        "type": "enum|string|number|text|tags|boolean",
        "enumValues": ["Option1", "Option2"],
        "description": "What this field represents and how to determine its value"
      }
    ],
    "enabled": true
  }
]
```

## Field Type Guidelines

- **enum**: Use for categorical classifications with 3-6 predefined options
- **string**: Use for short text values (single line)
- **number**: Use for numeric scores, percentages, or counts (0-100 for percentages)
- **text**: Use for longer explanations or analysis (multi-line markdown)
- **tags**: Use for lists of items like factors, indicators, or keywords
- **boolean**: Use for yes/no determinations

## Color Palette Suggestions

- Red (#ef4444): Risk, urgency, negative outcomes
- Orange (#f59e0b): Warning, caution, attention needed
- Blue (#3b82f6): Information, analysis, neutral assessments
- Green (#10b981): Success, positive outcomes, opportunities
- Purple (#8b5cf6): Quality, compliance, special handling

## Important Guidelines

1. Make prompt instructions specific to the business domain
2. Include relevant metadata field references in instructions
3. Ensure output fields are comprehensive but not overwhelming (3-7 fields per category)
4. Use actionable language that helps supervisors and analysts
5. Consider what would be most valuable for aggregated analytics

Generate the insight categories now:
