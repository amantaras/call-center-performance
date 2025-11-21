import { ConfigManager } from './configManager';

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCallOptions {
  /** Enable JSON mode - ensures system message requests JSON output */
  useJsonMode?: boolean;
  /** JSON Schema for structured outputs (Azure OpenAI Structured Outputs) */
  structuredOutputSchema?: {
    name: string;
    strict: boolean;
    schema: object;
  };
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Delay between retries in milliseconds (default: 1000) */
  retryDelay?: number;
  /** Maximum tokens in response (default: no limit - let model return full output) */
  maxTokens?: number;
  /** Reasoning effort for reasoning models (o1, o3, gpt-5) - minimal, low, medium, high */
  reasoningEffort?: 'minimal' | 'low' | 'medium' | 'high';
}

export interface ParsedResponse<T> {
  content: string;
  parsed: T;
}

/**
 * Unified LLM caller with retry logic, JSON validation, and error handling.
 * 
 * This class provides a single, reliable interface for calling Azure OpenAI Responses API
 * with automatic retries, JSON extraction, and validation.
 */
export class LLMCaller {
  private readonly DEFAULT_MAX_RETRIES = 3;
  private readonly DEFAULT_RETRY_DELAY = 1000;

  constructor(private configManager: ConfigManager) {}

  /**
   * Check if a deployment name corresponds to a reasoning model
   * Reasoning models: o1, o1-mini, o3, o3-mini, o3-pro, o4-mini, gpt-5 series, codex-mini
   */
  private isReasoningModel(deploymentName: string): boolean {
    const lowerName = deploymentName.toLowerCase();
    return lowerName.startsWith('o1') ||
           lowerName.startsWith('o3') ||
           lowerName.startsWith('o4') ||
           lowerName.startsWith('gpt-5') ||
           lowerName.startsWith('codex-mini');
  }

  /**
   * Check if deployment supports 'minimal' reasoning effort
   * Only GPT-5 series models support 'minimal', except gpt-5-codex
   */
  private supportsMinimalEffort(deploymentName: string): boolean {
    const lowerName = deploymentName.toLowerCase();
    return lowerName.startsWith('gpt-5') && !lowerName.includes('codex');
  }

  /**
   * Call Azure OpenAI with automatic retry and JSON validation
   * 
   * @param messages - Chat messages to send
   * @param options - Call options including retry config
   * @returns Raw text response
   */
  async call(messages: ChatMessage[], options: LLMCallOptions = {}): Promise<string> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelay ?? this.DEFAULT_RETRY_DELAY;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`LLM call attempt ${attempt}/${maxRetries}...`);
        const response = await this.executeCall(messages, options);
        
        if (attempt > 1) {
          console.log(`✓ LLM call succeeded on attempt ${attempt}`);
        }
        
        return response;
      } catch (error: any) {
        // Extract only the message to avoid circular references in error objects
        lastError = new Error(error?.message || String(error));
        console.warn(`⚠ LLM call attempt ${attempt}/${maxRetries} failed: ${lastError.message}`);
        
        if (attempt < maxRetries) {
          console.log(`↻ Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (lastError?.message?.includes('[RBAC_ERROR]')) {
      throw lastError;
    }

    throw new Error(`LLM call failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Call Azure OpenAI and parse JSON response with automatic retry and validation
   * 
   * @param messages - Chat messages to send
   * @param options - Call options including retry config
   * @returns Parsed JSON response
   */
  async callWithJsonValidation<T = any>(
    messages: ChatMessage[],
    options: LLMCallOptions = {}
  ): Promise<ParsedResponse<T>> {
    const maxRetries = options.maxRetries ?? this.DEFAULT_MAX_RETRIES;
    const retryDelay = options.retryDelay ?? this.DEFAULT_RETRY_DELAY;
    let lastError: Error | null = null;

    // Respect caller preference for JSON mode; default to DISABLED when not specified
    // JSON mode causes parse errors with control characters - rely on prompt engineering instead
    const callOptions: LLMCallOptions = { ...options };
    if (callOptions.useJsonMode === undefined) {
      callOptions.useJsonMode = false;
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`LLM JSON call attempt ${attempt}/${maxRetries}...`);
        const content = await this.executeCall(messages, callOptions);
        
        // Log raw content for debugging
        console.log(`[DEBUG] Raw LLM response (first 500 chars):`, content.substring(0, 500));
        console.log(`[DEBUG] Raw LLM response (last 200 chars):`, content.substring(Math.max(0, content.length - 200)));
        
        // When using structured outputs with strict schema, the response is already valid JSON
        // Parse directly without any manipulation to avoid breaking control characters
        let parsed: T;
        if (options.structuredOutputSchema) {
          console.log('[PARSE] Using structured outputs - parsing JSON directly without extraction');
          parsed = JSON.parse(content);
        } else {
          // For non-structured outputs, use extraction logic
          parsed = this.extractAndParseJson<T>(content);
        }
        
        if (attempt > 1) {
          console.log(`✓ LLM JSON call succeeded on attempt ${attempt}`);
        }
        
        return { content, parsed };
      } catch (error: any) {
        // Extract only the message and responseExcerpt to avoid circular references
        const errorMsg = error?.message || String(error);
        const excerpt = error?.responseExcerpt || 'N/A';
        lastError = new Error(errorMsg);
        (lastError as any).responseExcerpt = excerpt;
        
        console.warn(`⚠ LLM JSON call attempt ${attempt}/${maxRetries} failed: ${errorMsg}`);
        console.warn(`  Response excerpt: ${excerpt}`);
        
        if (attempt < maxRetries) {
          console.log(`↻ Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        }
      }
    }

    if (lastError?.message?.includes('[RBAC_ERROR]')) {
      throw lastError;
    }

    throw new Error(`LLM JSON call failed after ${maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Execute a single LLM call (internal method)
   */
  private async executeCall(messages: ChatMessage[], options: LLMCallOptions): Promise<string> {
    const config = await this.configManager.getConfig();
    
    if (!config) {
      throw new Error("Azure OpenAI is not configured. Please run 'AI Citadel Agent Factory: Configure Azure OpenAI' command.");
    }

    const apiVersion = config.apiVersion || "2024-12-01-preview";
    console.log(`🤖 Using model: ${config.deploymentName} (endpoint: ${config.endpoint}, api-version: ${apiVersion})`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authentication
    if (config.authType === "apiKey") {
      if (!config.apiKey) {
        throw new Error("API key is not configured.");
      }
      headers["api-key"] = config.apiKey;
    } else {
      // Entra ID auth
      const token = await this.configManager.getEntraIdToken(config.tenantId);
      if (!token) {
        throw new Error("Failed to get Entra ID token.");
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    // Use the modern Responses API (no api-version query parameter needed)
    const url = `${config.endpoint}/openai/v1/responses`;
    console.log(`🌐 Calling URL: ${url}`);

    // Convert messages to Responses API input format
    const input = messages.map(msg => ({
      role: msg.role,
      content: [{ type: "input_text", text: msg.content }]
    }));
    
    // If JSON mode requested, ensure system message requests JSON format
    if (options.useJsonMode && messages[0]?.role === 'system') {
      if (!messages[0].content.toLowerCase().includes('json')) {
        console.log('JSON mode enabled - ensuring system message requests JSON output');
        input[0].content[0].text += '\n\nIMPORTANT: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Output pure JSON only.';
      }
    }

    const requestBody: any = {
      model: config.deploymentName,
      input: input,
    };
    
    // ✅ Azure OpenAI Structured Outputs (when schema provided)
    // Uses text.format with json_schema type for guaranteed schema compliance
    // See: https://platform.openai.com/docs/guides/structured-outputs
    if (options.structuredOutputSchema) {
      const schema = options.structuredOutputSchema;
      requestBody.text = {
        format: {
          type: "json_schema",
          name: schema.name,
          strict: schema.strict,
          schema: schema.schema
        }
      };
      console.log(`✅ Structured outputs enabled with schema: ${schema.name}`);
      console.log(`   Strict mode: ${schema.strict}`);
    }
    // ✅ Azure OpenAI Responses API uses text.format parameter with nested structure
    // Error message says: "this parameter has moved to 'text.format'"
    // Documentation shows: text: { format: { type: "json_object" } }
    // See: https://platform.openai.com/docs/api-reference/responses/create
    else if (options.useJsonMode) {
      requestBody.text = {
        format: {
          type: "json_object"  // Nested structure ensures valid JSON
        }
      };
      console.log('✅ JSON mode enabled with text.format.type: json_object');
    }
    
    // ⚠️ NEVER set max_output_tokens - let model return complete output
    // Setting this truncates mock data and causes incomplete JSON
    if (options.maxTokens !== undefined) {
      console.warn(`⚠️ WARNING: maxTokens parameter ignored - removes output truncation risk`);
    }
    
    // ✅ Reasoning effort for reasoning models (o1, o3, gpt-5)
    // Use config value or caller override, default to 'low'
    if (this.isReasoningModel(config.deploymentName)) {
      let effort = options.reasoningEffort || config.reasoningEffort || 'low';
      
      // Validate: gpt-5-codex doesn't support 'minimal', gpt-5-pro only supports 'high'
      if (effort === 'minimal' && !this.supportsMinimalEffort(config.deploymentName)) {
        console.warn(`⚠️ Model ${config.deploymentName} doesn't support 'minimal' effort, using 'low'`);
        effort = 'low';
      }
      
      if (config.deploymentName.toLowerCase().includes('gpt-5-pro')) {
        effort = 'high'; // gpt-5-pro only supports 'high'
        console.log(`✅ gpt-5-pro detected, forcing reasoning effort to 'high'`);
      }
      
      requestBody.reasoning = {
        effort: effort
      };
      console.log(`✅ Reasoning model detected (${config.deploymentName}), effort: ${effort}`);
    }
    
    console.log(`📤 Request body size: ${JSON.stringify(requestBody).length} bytes`);
    
    let response;
    try {
      response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
      });
    } catch (fetchError: any) {
      console.error(`❌ Fetch failed: ${fetchError.message}`);
      console.error(`   URL: ${url}`);
      console.error(`   Error type: ${fetchError.constructor.name}`);
      console.error(`   Stack: ${fetchError.stack}`);
      throw new Error(`Network error calling Azure OpenAI: ${fetchError.message}. Check your endpoint configuration and network connection.`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      
      // Enhanced error handling for 401 Unauthorized with EntraID
      if (response.status === 401) {
        const config = await this.configManager.getConfig();
        
        // Check if using EntraID authentication
        if (config?.authType === 'entraId') {
          // Log the actual error for debugging
          console.error(`🔍 Azure 401 Error Details: ${errorText}`);
          
          const endpoint = config.endpoint || '';
          const isAIFoundry = endpoint.includes('ai.azure.com') || errorText.includes('ai.azure.com') || errorText.includes('audience is incorrect');
          
          // Use special marker so extension.ts can detect and offer help
          const errorPrefix = '[RBAC_ERROR]';
          const shortMessage = isAIFoundry
            ? `${errorPrefix} Current user does not have proper RBAC permissions to use this Azure AI Foundry deployment with EntraID authentication. Azure error: ${errorText}`
            : `${errorPrefix} Current user does not have proper RBAC permissions to use this Azure OpenAI deployment with EntraID authentication. Azure error: ${errorText}`;
          
          throw new Error(shortMessage);
        }
      }
      
      throw new Error(`Azure OpenAI API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    // Debug: Log response structure when JSON mode is enabled
    if (options.useJsonMode) {
      console.log('[DEBUG] JSON mode response structure:', {
        hasOutputText: !!data.output_text,
        hasOutput: !!data.output,
        outputLength: data.output?.length,
        firstOutputType: data.output?.[0]?.type
      });
    }
    
    // Parse Responses API output format
    let content = '';
    if (data.output_text) {
      content = data.output_text;
    } else if (data.output && Array.isArray(data.output)) {
      const assistantMsg = data.output.find((item: any) => item.role === "assistant");
      if (assistantMsg && assistantMsg.content && Array.isArray(assistantMsg.content)) {
        // Check for refusal (safety/policy violations) when using structured outputs
        if (options.structuredOutputSchema) {
          const refusalContent = assistantMsg.content.find((c: any) => c.type === "refusal");
          if (refusalContent) {
            throw new Error(`Model refused to respond: ${refusalContent.refusal || 'Safety policy violation'}`);
          }
        }
        
        const textContent = assistantMsg.content.find((c: any) => c.type === "output_text");
        content = textContent?.text || '';
      }
    }

    if (!content) {
      console.error('[DEBUG] Full API response:', JSON.stringify(data, null, 2).substring(0, 1000));
      throw new Error('No content in API response');
    }
    
    // Debug: Log first 200 chars of content when JSON mode is enabled
    if (options.useJsonMode) {
      console.log('[DEBUG] Response content preview:', content.substring(0, 200));
    }

    return content;
  }

  /**
   * Extract and parse JSON from LLM response
   * Handles markdown code blocks, extra text, and common JSON errors
   */
  private extractAndParseJson<T>(text: string): T {
    try {
      console.log('[EXTRACT] Starting JSON extraction...');
      console.log('[EXTRACT] Original text length:', text.length);
      
      let jsonText = text.trim();
      console.log('[EXTRACT] After trim, length:', jsonText.length);
      
      // Remove markdown code blocks if present
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      console.log('[EXTRACT] After removing markdown, length:', jsonText.length);

      // Try to find JSON object or array
      const jsonMatch = jsonText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        jsonText = jsonMatch[0];
        console.log('[EXTRACT] Found JSON match, length:', jsonText.length);
      } else {
        console.log('[EXTRACT] No JSON structure found!');
      }

      console.log('[EXTRACT] JSON text to parse (first 200 chars):', jsonText.substring(0, 200));
      console.log('[EXTRACT] JSON text to parse (last 200 chars):', jsonText.substring(Math.max(0, jsonText.length - 200)));
      
      // Clean up common JSON formatting issues
      // Remove trailing commas before closing brackets/braces
      jsonText = jsonText.replace(/,(\s*[}\]])/g, '$1');
      
      // Remove comments (single-line and multi-line)
      jsonText = jsonText.replace(/\/\/.*$/gm, '');
      jsonText = jsonText.replace(/\/\*[\s\S]*?\*\//g, '');
      
      // Note: DO NOT escape literal newlines/tabs in JSON structure
      // JSON spec allows literal whitespace characters outside of strings
      // Only escape control characters INSIDE string values
      
      console.log('[EXTRACT] About to parse JSON...');
      // Attempt to parse
      const parsed = JSON.parse(jsonText);
      console.log('[EXTRACT] ✅ Successfully parsed JSON. Type:', Array.isArray(parsed) ? 'array' : typeof parsed);
      if (Array.isArray(parsed)) {
        console.log('[EXTRACT] Array length:', parsed.length);
      }
      
      return parsed as T;
    } catch (error: any) {
      console.error('[EXTRACT] ❌ JSON parse failed:', error.message);
      console.error('[EXTRACT] Error at position:', error.message.match(/position (\d+)/)?.[1]);
      
      // Attach response excerpt for debugging
      const excerpt = text.length > 200 ? text.substring(0, 200) + '...' : text;
      const enhancedError: any = new Error(`JSON parse error: ${error.message}`);
      enhancedError.responseExcerpt = excerpt;
      throw enhancedError;
    }
  }
}
