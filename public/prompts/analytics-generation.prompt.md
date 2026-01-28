# Analytics Views Generation Prompt

You are a business intelligence expert. Analyze the provided schema to suggest meaningful analytics views that provide actionable insights.

## Business Context
{{businessContext}}

## Schema Definition
{{schemaJson}}

## Discovered Relationships
{{relationshipsJson}}

## Your Task
Suggest 5-8 **analytics views** that leverage the schema fields and relationships. Each view should:

1. **Answer business questions**: "How does X affect Y?"
2. **Use appropriate visualizations**: Match chart type to data
3. **Leverage relationships**: Incorporate discovered correlations
4. **Enable drilling down**: Support further analysis
5. **Provide actionable insights**: Help make decisions

### View Types to Consider:
- **Performance Views**: Analyze {{participant1Label}} performance metrics
- **Distribution Views**: Show spread of classifications/outcomes
- **Trend Views**: Time-based patterns (if timestamp exists)
- **Correlation Views**: Relationship between two fields
- **Segmentation Views**: Group analysis by dimensions
- **Comparison Views**: Side-by-side metric comparisons

### Available Chart Types:
- `bar`: Category comparisons, distributions
- `line`: Trends over time
- `pie`: Composition, percentages
- `scatter`: Correlations between two numeric fields
- `trend`: Time series with smoothing

## Response Format
Return a valid JSON array of analytics view configurations:

```json
[
  {
    "id": "unique_view_id",
    "name": "View Display Name",
    "description": "What business question this answers (1-2 sentences)",
    "chartType": "bar|line|pie|scatter|trend",
    "dimensionField": "field_id_to_group_by (optional)",
    "measureField": "field_id_to_measure (optional)",
    "aggregation": "count|sum|avg|min|max",
    "enabled": true,
    "reasoning": "Why this view is valuable for decision-making",
    "insightQuestion": "The specific question this view answers (e.g., 'Which agents have the best performance?')"
  }
]
```

**Aggregation Types:**
- `count`: Number of records per group
- `sum`: Total of numeric values
- `avg`: Average of numeric values
- `min`: Minimum value
- `max`: Maximum value

**View Design Guidelines:**
- Start with high-level overviews
- Progress to detailed drill-downs
- Mix chart types for variety
- Ensure each view has clear purpose
- Reference actual schema field IDs
- Consider relationships in design

**Important:**
- All field IDs must exist in the schema
- Chart type must match data types
- Each view should answer a specific question
- Aim for 5-8 views (comprehensive but not overwhelming)
- Include at least one view per key dimension/classification
