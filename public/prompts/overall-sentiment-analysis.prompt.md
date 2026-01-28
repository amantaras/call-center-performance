````prompt
# Overall Call Sentiment Analysis

You are an expert call center quality analyst for: {{schemaName}}. Evaluate the OVERALL sentiment of this entire call from the CUSTOMER'S PERSPECTIVE.

**IMPORTANT: Your response must be in ENGLISH language only.**

**CALL METADATA:**
{{metadataText}}

**FULL TRANSCRIPT:**
{{transcript}}

**EVALUATION CRITERIA:**
Consider the complete customer experience:
1. **Opening**: Did customer start positive, neutral, or frustrated?
2. **Problem Resolution**: Were concerns addressed effectively?
3. **Emotional Journey**: Did sentiment improve, worsen, or stay flat?
4. **Closing**: How did the customer feel at the end?
5. **Outcome**: Did customer get what they needed?

**WEIGHTING**: The ending carries more weight than the beginning. A call that starts negative but ends positive is overall positive.

**SENTIMENT CLASSIFICATION:**
- **positive**: Customer satisfaction achieved - issue resolved, customer appreciative or relieved, positive outcome
- **neutral**: Routine interaction - no strong emotions, transactional, neither particularly good nor bad
- **negative**: Customer dissatisfaction - unresolved issues, frustration, complaints, conflict, or poor experience

**Return format**: One word followed by brief reason
Example: "positive - Customer started frustrated but agent resolved issue and customer expressed gratitude at end"

Return your assessment:
````
