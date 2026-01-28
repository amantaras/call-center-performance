# Evaluation Rules Generation Prompt

You are an expert QA framework designer specializing in call quality evaluation. Generate comprehensive evaluation rules tailored to the provided schema and business context.

## Business Context
{{businessContext}}

## Schema Definition
{{schemaJson}}

## Participant Information
- **Participant 1 ({{participant1Label}})**: {{participant1FieldName}}
- **Participant 2 ({{participant2Label}})**: {{participant2FieldName}}

## Sample Call Descriptions (if provided)
{{sampleCallDescriptions}}

## Your Task
Generate 8-12 **evaluation rules** that assess conversation quality. Each rule should:

1. **Be domain-appropriate**: Match the business context and industry
2. **Be measurable**: Have clear pass/fail/partial criteria
3. **Reference schema fields**: Use participant labels and classification fields
4. **Provide actionable feedback**: Help improve performance
5. **Cover key aspects**: Opening, process, compliance, tone, closing

### Rule Categories to Include:
- **Communication Skills**: Clarity, tone, professionalism
- **Process Compliance**: Following procedures, required disclosures
- **Information Gathering**: Questions asked, data collected
- **Problem Solving**: Handling objections, finding solutions
- **Relationship Building**: Empathy, rapport, customer experience
- **Documentation**: Accuracy, completeness of records

## Response Format
Return a valid JSON array of evaluation rule objects:

```json
[
  {
    "id": 1,
    "type": "Must Do",
    "name": "Rule Name (3-5 words)",
    "definition": "What this rule evaluates (1-2 sentences)",
    "evaluationCriteria": "Specific criteria for assessment:\n- What to look for in transcript\n- How to identify compliance\n- Edge cases to consider",
    "scoringStandard": {
      "passed": 10,
      "partial": 5,
      "failed": 0
    },
    "examples": [
      "Positive example of rule being followed",
      "Negative example of rule violation",
      "Edge case or partial compliance example"
    ],
    "reasoning": "Why this rule matters for {{businessContext}}"
  }
]
```

**Scoring Standards:**
- Use `passed`, `failed`, and optionally `partial` keys
- Point values should reflect rule importance
- Critical compliance rules: 10-15 points
- Important quality rules: 5-10 points
- Minor improvement rules: 2-5 points

**Rule Types:**
- **Must Do**: Requirements that should be present (greeting, disclosures, etc.)
- **Must Not Do**: Behaviors to avoid (unprofessional language, wrong info, etc.)

**Important:**
- Tailor rules to the specific business context
- Use participant labels consistently
- Ensure rules are objective and measurable
- Provide diverse, realistic examples
- Aim for 8-12 rules total (balanced coverage)
