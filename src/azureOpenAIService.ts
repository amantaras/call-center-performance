import * as vscode from "vscode";
import { ConfigManager, AzureOpenAIConfig } from "./configManager";
import { PromptLoader } from "./promptLoader";
import { LLMCaller, ChatMessage as LLMChatMessage } from "./llmCaller";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface RandomAgentDefinition {
  agentName: string;
  emoji: string;
  mission: string;
  keyCapabilities: string[];
  inputFormat: string[];
  outputFormat: string[];
  exampleScenario: string;
  guardrails: string[];
  ensuresHumanInLoop?: boolean;
  operatingDomain?: string;
}

export class AzureOpenAIService {
  private promptLoader: PromptLoader;
  private llmCaller: LLMCaller;
  private maxRetries: number;

  constructor(
    private configManager: ConfigManager,
    extensionUri: vscode.Uri
  ) {
    this.promptLoader = new PromptLoader(extensionUri);
    this.llmCaller = new LLMCaller(configManager);
    // Initialize maxRetries from VS Code setting
    this.maxRetries = this.configManager.getMaxRetries();
    console.log(`🔄 AzureOpenAIService initialized with maxRetries: ${this.maxRetries}`);
  }

  /**
   * Set the maximum number of retry attempts for JSON validation
   */
  setMaxRetries(retries: number): void {
    this.maxRetries = Math.max(1, Math.min(10, retries)); // Clamp between 1-10 (matches VS Code setting)
    console.log(`🔄 Set max retries to: ${this.maxRetries}`);
  }

  /**
   * Validate and retry JSON generation with proper error handling
   */
  private async validateAndRetry<T>(
    generateFn: () => Promise<string>,
    parseFn: (text: string) => T,
    dataType: string
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        console.log(`Attempt ${attempt}/${this.maxRetries} to generate ${dataType}...`);
        const response = await generateFn();
        const result = parseFn(response);
        
        if (attempt > 1) {
          console.log(`✓ Successfully generated valid ${dataType} on attempt ${attempt}`);
        }
        
        return result;
      } catch (error: any) {
        lastError = error;
        console.warn(`⚠ Attempt ${attempt}/${this.maxRetries} failed for ${dataType}: ${error.message}`);
        
        if (attempt < this.maxRetries) {
          console.log(`↻ Retrying ${dataType} generation...`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }
    
    throw new Error(`Failed to generate valid ${dataType} after ${this.maxRetries} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * Call Azure OpenAI Chat Completion API
   * @param messages - Array of chat messages
   * @param useJsonMode - Enable JSON mode for structured outputs (requires system message to request JSON)
   */
  async chatCompletion(messages: ChatMessage[], useJsonMode: boolean = false): Promise<ChatCompletionResponse> {
    const config = await this.configManager.getConfig();
    
    if (!config) {
      throw new Error("Azure OpenAI is not configured. Please run 'AI Citadel Agent Factory: Configure Azure OpenAI' command.");
    }

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

    // Use the modern Responses API
    const url = `${config.endpoint}/openai/v1/responses`;

    // Convert messages to Responses API input format (array of message objects)
    const input = messages.map(msg => ({
      role: msg.role,
      content: [{ type: "input_text", text: msg.content }]
    }));
    
    // If JSON mode requested, ensure system message requests JSON format
    if (useJsonMode && messages[0]?.role === 'system') {
      if (!messages[0].content.toLowerCase().includes('json')) {
        console.log('JSON mode enabled - ensuring system message requests JSON output');
        input[0].content[0].text += '\n\nIMPORTANT: You must respond with ONLY valid JSON. Do not include any explanatory text, markdown formatting, or code blocks. Output pure JSON only.';
      }
    }

    try {
      const response = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: config.deploymentName,
          input: input,
          max_output_tokens: 4000, // Responses API uses max_output_tokens, not max_completion_tokens
          // Note: temperature defaults to 1.0 and some models don't support other values
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Azure OpenAI API error (${response.status}): ${errorText}`);
      }

      const data = await response.json();
      
      // Parse Responses API output format
      // The output is an array of message objects
      let content = "";
      if (data.output && Array.isArray(data.output)) {
        // Find the assistant message in the output
        const assistantMsg = data.output.find((item: any) => item.role === "assistant");
        if (assistantMsg && assistantMsg.content && Array.isArray(assistantMsg.content)) {
          // Extract text from content array
          const textContent = assistantMsg.content.find((c: any) => c.type === "output_text");
          content = textContent?.text || "";
        }
      }
      
      // Fallback: use output_text property if available
      if (!content && data.output_text) {
        content = data.output_text;
      }
      
      return {
        content: content,
        usage: data.usage,
      };
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to call Azure OpenAI: ${error.message}`);
      }
      throw error;
    }
  }

  /**
   * Generate agents based on process description and available MCP tools
   */
  async generateAgents(processDescription: string, mcpTools: any[]): Promise<any> {
    // Format tools for prompt - show tool names and descriptions clearly
    const toolsList = mcpTools && mcpTools.length > 0
      ? mcpTools.map(tool => `- ${tool.name}: ${tool.description || 'No description'}`).join('\n')
      : 'No MCP tools available';
    
    const prompts = await this.promptLoader.loadPromptPair(
      "generate-agents-system.txt",
      "generate-agents-user.txt",
      {
        processDescription,
        mcps: toolsList,
      }
    );

    const result = await this.llmCaller.callWithJsonValidation([
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user },
    ], {
      maxRetries: this.maxRetries,
      useJsonMode: false
      // No maxTokens - let model return all agents
    });

    let agents = result.parsed;
    
    // Debug: Log what we received IMMEDIATELY after parsing
    console.log(`[AGENTS DEBUG] Raw parsed result type: ${Array.isArray(agents) ? 'array' : typeof agents}`);
    if (Array.isArray(agents)) {
      console.log(`[AGENTS DEBUG] Array length: ${agents.length}`);
      console.log(`[AGENTS DEBUG] Agent names:`, agents.map((a: any) => a.name));
    } else {
      console.log(`[AGENTS DEBUG] Single object with name:`, agents?.name);
      console.log(`[AGENTS DEBUG] Full object keys:`, Object.keys(agents || {}));
    }
    
    // Validate or auto-wrap array response
    if (!Array.isArray(agents)) {
      // Check if it's a valid agent object that can be wrapped
      if (typeof agents === 'object' && agents !== null && 'name' in agents) {
        console.warn('[FALLBACK] LLM returned single agent object instead of array. Auto-wrapping.');
        agents = [agents];
      } else {
        console.error('[ERROR] LLM returned invalid response for agents');
        throw new Error('Response is not an array of agents. Please regenerate.');
      }
    }
    
    console.log(`Generated agents count: ${agents.length}`);
    if (agents.length === 1) {
      console.warn('[WARNING] Only 1 agent generated. Workflow may benefit from multiple specialized agents.');
    }
    
    return agents;
  }

  /**
   * Generate MCP tools based on process description
   */
  async generateConnectors(processDescription: string, mcps: string[], agents: any[]): Promise<any> {
    const prompts = await this.promptLoader.loadPromptPair(
      "generate-mcp-tools-system.txt",
      "generate-mcp-tools-user.txt",
      {
        processDescription,
        mcps: mcps.join(", "),
        agents: JSON.stringify(agents.map(a => ({ name: a.name, type: a.type }))),
      }
    );

    const result = await this.llmCaller.callWithJsonValidation([
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user },
    ], {
      maxRetries: this.maxRetries,
      useJsonMode: false
      // No maxTokens - let model return complete MCP tool definitions
    });

    let mcpTools = result.parsed;
    
    // Smart fallback: If LLM returned a single object instead of array, wrap it
    if (!Array.isArray(mcpTools)) {
      console.warn('[FALLBACK] LLM returned bare object instead of array. Auto-wrapping in array.');
      // Check if it's a valid MCP tool object
      if (typeof mcpTools === 'object' && mcpTools !== null && 'name' in mcpTools && 'tools' in mcpTools) {
        mcpTools = [mcpTools];
        console.log('[FALLBACK] Successfully wrapped single MCP tool object in array');
      } else {
        throw new Error('Response is not an array of MCP tools and cannot be auto-wrapped (invalid object structure)');
      }
    }
    
    return mcpTools;
  }

  /**
   * Generate mock implementations for MCP tools using LLM
   */
  async generateMCPToolMocks(
    processDescription: string, 
    mcpServerName: string, 
    tools: any[],
    workflow?: { nodes: any[], edges: any[] },
    agents?: any[]
  ): Promise<any> {
    console.log(`\n🔧 Generating mock data for ${tools.length} tools (1 LLM call per tool)...`);
    
    // Determine if we should use workflow-aware generation
    const useWorkflowContext = workflow && workflow.edges && workflow.edges.length > 0;
    
    if (useWorkflowContext) {
      console.log(`   🔗 Using workflow-aware generation (sequential with data flow context)`);
      return this.generateMocksWithWorkflowContext(processDescription, mcpServerName, tools, workflow!, agents);
    } else {
      console.log(`   ⚡ Using independent generation (no workflow context available)`);
      return this.generateMocksIndependent(processDescription, mcpServerName, tools);
    }
  }

  /**
   * Generate mocks independently (when no workflow context available)
   */
  private async generateMocksIndependent(processDescription: string, mcpServerName: string, tools: any[]): Promise<any> {
    const allMocks: any = {};
    const maxAttemptsPerTool = 3;
    
    for (let i = 0; i < tools.length; i++) {
      const tool = tools[i];
      const toolName = typeof tool === 'string' ? tool : tool.name;
      console.log(`\n[Tool ${i + 1}/${tools.length}] Generating mock for: ${toolName}`);
      
      const mockData = await this.generateSingleToolMock(
        processDescription,
        mcpServerName,
        tool,
        toolName,
        null, // No previous context
        maxAttemptsPerTool
      );
      
      allMocks[toolName] = mockData;
    }

    console.log(`\n✅ Successfully generated realistic mock data for all ${tools.length} tools`);
    return allMocks;
  }

  /**
   * Generate mocks with workflow context - uses execution order and previous outputs
   */
  private async generateMocksWithWorkflowContext(
    processDescription: string,
    mcpServerName: string,
    tools: any[],
    workflow: { nodes: any[], edges: any[] },
    agents?: any[]
  ): Promise<any> {
    const allMocks: any = {};
    const maxAttemptsPerTool = 3;
    
    // Build execution order from workflow edges
    const executionOrder = this.buildExecutionOrder(workflow, tools, agents);
    console.log(`   📊 Execution order: ${executionOrder.map((t: any) => t.name).join(' → ')}`);
    
    // Generate mocks in execution order, passing previous context
    for (let i = 0; i < executionOrder.length; i++) {
      const tool = executionOrder[i];
      const toolName = tool.name;
      console.log(`\n[Tool ${i + 1}/${executionOrder.length}] Generating mock for: ${toolName} (in workflow order)`);
      
      // Build context from previously generated mocks
      const previousContext = this.buildPreviousContext(allMocks, executionOrder, i);
      
      const mockData = await this.generateSingleToolMock(
        processDescription,
        mcpServerName,
        tool,
        toolName,
        previousContext,
        maxAttemptsPerTool
      );
      
      allMocks[toolName] = mockData;
    }

    console.log(`\n✅ Successfully generated workflow-aligned mock data for all ${executionOrder.length} tools`);
    return allMocks;
  }

  /**
   * Build execution order from workflow structure
   */
  private buildExecutionOrder(workflow: { nodes: any[], edges: any[] }, tools: any[], agents?: any[]): any[] {
    const toolMap = new Map<string, any>();
    tools.forEach(t => {
      const name = typeof t === 'string' ? t : t.name;
      toolMap.set(name, t);
    });

    // Build adjacency map from edges (agent1 → agent2 → agent3)
    const agentToolMap = new Map<string, Set<string>>(); // agent -> tools used
    const toolSequence: string[] = [];
    
    if (agents) {
      agents.forEach(agent => {
        const agentTools = agent.tools || [];
        agentToolMap.set(agent.id, new Set(agentTools));
      });
    }

    // Follow workflow edges to determine tool order
    const visited = new Set<string>();
    const edges = workflow.edges || [];
    
    // Find start node
    const startNode = workflow.nodes?.find((n: any) => {
      return !edges.some((e: any) => e.to === n.id);
    });

    if (startNode && agents) {
      const queue = [startNode.id];
      
      while (queue.length > 0) {
        const nodeId = queue.shift()!;
        if (visited.has(nodeId)) continue;
        visited.add(nodeId);
        
        // Get tools for this agent node
        const agentTools = agentToolMap.get(nodeId) || new Set();
        agentTools.forEach(toolName => {
          if (!toolSequence.includes(toolName)) {
            toolSequence.push(toolName);
          }
        });
        
        // Add connected nodes
        edges
          .filter((e: any) => e.from === nodeId)
          .forEach((e: any) => queue.push(e.to));
      }
    }

    // Return tools in execution order, add any missing tools at end
    const orderedTools: any[] = [];
    toolSequence.forEach(toolName => {
      const tool = toolMap.get(toolName);
      if (tool) orderedTools.push(tool);
    });

    // Add any tools not in workflow at the end
    tools.forEach(t => {
      const name = typeof t === 'string' ? t : t.name;
      if (!toolSequence.includes(name)) {
        orderedTools.push(t);
      }
    });

    return orderedTools;
  }

  /**
   * Build context from previously generated mocks
   */
  private buildPreviousContext(allMocks: any, executionOrder: any[], currentIndex: number): string | null {
    if (currentIndex === 0) return null;
    
    const previousMocks: any = {};
    for (let i = 0; i < currentIndex; i++) {
      const prevTool = executionOrder[i];
      const prevToolName = prevTool.name;
      if (allMocks[prevToolName]) {
        previousMocks[prevToolName] = allMocks[prevToolName];
      }
    }
    
    if (Object.keys(previousMocks).length === 0) return null;
    
    return `CONTEXT FROM PREVIOUS TOOLS IN WORKFLOW:\n${JSON.stringify(previousMocks, null, 2)}\n\nUse consistent IDs, references, and data values that align with the above tools.`;
  }

  /**
   * Build structured output schema for MCP mock generation
   */
  private buildMockStructuredOutputSchema(toolNames: string[]) {
    const mockProperties: Record<string, any> = {};
    toolNames.forEach(name => {
      mockProperties[name] = {
        type: "object",
        additionalProperties: false,
        required: ["mockResponse"],
        properties: {
          mockResponse: this.getMockResponseValueSchema()
        }
      };
    });

    const schemaName = `mcp_mock_${this.sanitizeSchemaName(toolNames[0] || 'tool')}`;

    return {
      name: schemaName.substring(0, 60) || 'mcp_mock_schema',
      strict: true,
      schema: {
        type: "object",
        additionalProperties: false,
        required: toolNames,
        properties: mockProperties
      }
    };
  }

  /**
   * Require mockResponse to be returned as a JSON string for schema compliance
   */
  private getMockResponseValueSchema() {
    return {
      description: "JSON string representation of the realistic mock output that the MCP tool would return",
      type: "string"
    };
  }

  private sanitizeSchemaName(name: string): string {
    const cleaned = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .substring(0, 60);
    return cleaned || 'mcp_mock_schema';
  }

  private appendMockResponseStringInstruction(basePrompt: string): string {
    return `${basePrompt}\n\nSTRICT JSON STRING REQUIREMENT:\n- For each tool key, set \"mockResponse\" to a JSON STRING (double-quoted) that contains the full realistic response object.\n- Escape quotes and control characters so the string is valid JSON.\n- Do NOT embed raw objects directly; always provide an escaped JSON string.`;
  }

  private parseMockResponseString(value: string, toolName: string): any {
    const directParse = this.tryParseJson(value);
    if (directParse.success) {
      return directParse.data;
    }

    // Handle double-escaped strings (e.g., contains literal \" sequences)
    const reencoded = this.encodeAsJsonStringLiteral(value);
    const decoded = this.tryParseJson(reencoded);
    if (decoded.success && typeof decoded.data === 'string') {
      const secondPass = this.tryParseJson(decoded.data);
      if (secondPass.success) {
        return secondPass.data;
      }
      throw new Error(`mockResponse for ${toolName} is not valid JSON string: ${secondPass.error}`);
    }

    const firstError = directParse.success ? 'Unknown parsing error' : directParse.error;
    const fallbackError = decoded.success ? 'Unable to decode double-escaped JSON string' : decoded.error;
    throw new Error(`mockResponse for ${toolName} is not valid JSON string: ${fallbackError || firstError}`);
  }

  private tryParseJson(input: string): { success: true; data: any } | { success: false; error: string } {
    try {
      return { success: true, data: JSON.parse(input) };
    } catch (error: any) {
      return { success: false, error: error?.message || String(error) };
    }
  }

  private encodeAsJsonStringLiteral(value: string): string {
    return `"${value
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"')
      .replace(/\r/g, '\\r')
      .replace(/\n/g, '\\n')
      .replace(/\t/g, '\\t')}"`;
  }

  /**
   * Generate mock for a single tool with retry logic
   */
  private async generateSingleToolMock(
    processDescription: string,
    mcpServerName: string,
    tool: any,
    toolName: string,
    previousContext: string | null,
    maxAttempts: number
  ): Promise<any> {
    let toolMockGenerated = false;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        // Build user prompt with optional previous context
        let userPromptAddition = '';
        if (previousContext) {
          userPromptAddition = `\n\n${previousContext}`;
        }

        const prompts = await this.promptLoader.loadPromptPair(
          "generate-mcp-mocks-system.txt",
          "generate-mcp-mocks-user.txt",
          {
            processDescription,
            mcpServerName,
            tools: JSON.stringify([tool], null, 2),
          }
        );

        const schema = this.buildMockStructuredOutputSchema([toolName]);

        const userPrompt = this.appendMockResponseStringInstruction(prompts.user) + userPromptAddition;

        const result = await this.llmCaller.callWithJsonValidation([
          { role: "system", content: prompts.system },
          { role: "user", content: userPrompt },
        ], {
          maxRetries: this.maxRetries,
          structuredOutputSchema: schema
          // ⚠️ REMOVED maxTokens - allow full mock output without truncation
          // With structured outputs (response_format), we get valid JSON regardless of length
        });

        const mocks = result.parsed;
        const mockData = mocks[toolName];
        
        if (!mockData || !mockData.mockResponse) {
          throw new Error(`No mockResponse generated for ${toolName}`);
        }

        if (typeof mockData.mockResponse === 'string') {
          mockData.mockResponse = this.parseMockResponseString(mockData.mockResponse, toolName);
        } else if (typeof mockData.mockResponse !== 'object' || mockData.mockResponse === null) {
          throw new Error(`mockResponse for ${toolName} must be a JSON string or object`);
        }

        const mockStr = JSON.stringify(mockData.mockResponse);
        if (mockStr.includes('Mock response') || mockStr === '{}' || mockStr.includes('placeholder')) {
          throw new Error(`Generic/placeholder mock data for ${toolName}`);
        }

        console.log(`   ✅ Mock generated for ${toolName}`);
        return mockData;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        console.warn(`   ⚠️  Attempt ${attempt}/${maxAttempts} failed: ${lastError.message}`);
        
        if (attempt < maxAttempts) {
          console.log(`   ↻ Retrying ${toolName} in ${attempt}s...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw new Error(
      `Failed to generate realistic mock data for tool '${toolName}' after ${maxAttempts} attempts. ` +
      `Last error: ${lastError?.message || 'Unknown error'}.`
    );
  }

  /**
   * Generate workflow diagram based on agents and MCP tools
   */
  async generateWorkflow(processDescription: string, agents: any[], mcpTools: any[]): Promise<any> {
    const prompts = await this.promptLoader.loadPromptPair(
      "generate-workflow-system.txt",
      "generate-workflow-user.txt",
      {
        processDescription,
        agents: JSON.stringify(agents),
        mcpTools: JSON.stringify(mcpTools),
      }
    );

    const result = await this.llmCaller.callWithJsonValidation([
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user },
    ], {
      maxRetries: this.maxRetries
      // No maxTokens - allow full workflow output
    });

    const workflow = result.parsed;
    if (!workflow.nodes || !Array.isArray(workflow.nodes)) {
      throw new Error('Workflow missing nodes array');
    }
    if (!workflow.edges || !Array.isArray(workflow.edges)) {
      throw new Error('Workflow missing edges array');
    }
    return workflow;
  }

  /**
   * Generate Python executor function code for a workflow node
   */
  async generateExecutorCode(
    nodeId: string,
    nodeLabel: string,
    purpose: string,
    inputType: string = "str",
    outputType: string = "str",
    context: string = ""
  ): Promise<{ code: string; packages: string[] }> {
    const prompts = await this.promptLoader.loadPromptPair(
      "generate-executor-system.txt",
      "generate-executor-user.txt",
      {
        nodeId,
        nodeLabel,
        purpose,
        inputType,
        outputType,
        context,
      }
    );

    const result = await this.llmCaller.callWithJsonValidation<{ code: string; packages: string[] }>([
      { role: "system", content: prompts.system },
      { role: "user", content: prompts.user },
    ], {
      maxRetries: this.maxRetries
      // No maxTokens - allow full code output
    });

    const parsed = result.parsed;
    
    if (!parsed.code || typeof parsed.code !== 'string') {
      throw new Error('Executor response missing valid "code" field');
    }
    if (!Array.isArray(parsed.packages)) {
      throw new Error('Executor response missing valid "packages" array');
    }
    
    // Validate Python syntax doesn't have obvious bracket mismatches
    const code = parsed.code.trim();
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    const openParens = (code.match(/\(/g) || []).length;
    const closeParens = (code.match(/\)/g) || []).length;
    
    if (openBraces !== closeBraces) {
      throw new Error(`Mismatched braces in generated code: ${openBraces} open vs ${closeBraces} close`);
    }
    if (openParens !== closeParens) {
      throw new Error(`Mismatched parentheses in generated code: ${openParens} open vs ${closeParens} close`);
    }
    
    // Check for common Python syntax errors
    if (code.includes('..')) {
      throw new Error('Invalid Python syntax: double dots (..) found in code');
    }
    if (code.match(/\.\s*\./)) {
      throw new Error('Invalid Python syntax: consecutive dots with whitespace found');
    }
    
    return {
      code: code,
      packages: parsed.packages
    };
  }

  /**
   * Curated list of business domains for scenario rotation
   */
  private readonly BUSINESS_DOMAINS = [
    { id: 'finance', name: 'Finance & Accounting', triggers: ['invoice receipt', 'payment due', 'expense report', 'budget threshold'] },
    { id: 'sales', name: 'Sales & CRM', triggers: ['lead form', 'deal closure', 'opportunity stage change', 'sales target'] },
    { id: 'marketing', name: 'Marketing & Campaigns', triggers: ['campaign launch', 'engagement drop', 'content publish', 'A/B test result'] },
    { id: 'operations', name: 'Operations & Supply Chain', triggers: ['inventory reorder', 'shipment delay', 'quality check', 'production schedule'] },
    { id: 'hr', name: 'Human Resources', triggers: ['job application', 'onboarding start', 'performance review', 'leave request'] },
    { id: 'support', name: 'Customer Support', triggers: ['ticket creation', 'escalation threshold', 'SLA breach', 'customer feedback'] },
    { id: 'it', name: 'IT Operations', triggers: ['system alert', 'access request', 'deployment trigger', 'backup schedule'] },
    { id: 'legal', name: 'Legal & Compliance', triggers: ['contract submission', 'policy update', 'audit trigger', 'compliance check'] },
    { id: 'retail', name: 'Retail & E-commerce', triggers: ['order placement', 'return request', 'price change', 'stock update'] },
    { id: 'healthcare', name: 'Healthcare', triggers: ['patient admission', 'lab result', 'appointment schedule', 'prescription refill'] },
    { id: 'manufacturing', name: 'Manufacturing', triggers: ['production start', 'quality issue', 'maintenance schedule', 'material arrival'] },
    { id: 'logistics', name: 'Logistics & Delivery', triggers: ['shipment tracking', 'route optimization', 'delivery exception', 'warehouse capacity'] }
  ];

  /**
   * Select next domain ensuring variety by avoiding recently used domains
   */
  private selectNextDomain(recentDomains: string[]): { domain: { id: string; name: string; triggers: string[] }; trigger: string } {
    // Filter out recently used domains (last 5)
    const availableDomains = this.BUSINESS_DOMAINS.filter(
      d => !recentDomains.slice(-5).includes(d.id)
    );

    // If all domains used recently, use least recent
    const domainsToChoose = availableDomains.length > 0 
      ? availableDomains 
      : this.BUSINESS_DOMAINS.filter(d => d.id !== recentDomains[recentDomains.length - 1]);

    // Pick random domain from available
    const domain = domainsToChoose[Math.floor(Math.random() * domainsToChoose.length)];
    
    // Pick random trigger for that domain
    const trigger = domain.triggers[Math.floor(Math.random() * domain.triggers.length)];

    return { domain, trigger };
  }

  /**
   * Generate a random business process scenario with domain rotation
   */
  async generateScenario(
    currentScenario: string = "",
    domainHistory: string[] = [],
    forceHumanInLoop: boolean = false
  ): Promise<{ scenario: string; domain: string; trigger: string }> {
    try {
      // Select next domain with rotation logic
      const { domain, trigger } = this.selectNextDomain(domainHistory);
      
      console.log(`🎯 Selected domain: ${domain.name} (${domain.id}) with trigger: ${trigger}`);
      console.log(`📊 Domain history: [${domainHistory.slice(-5).join(', ')}]`);
      console.log(`🧑‍💼 Force HIL: ${forceHumanInLoop ? 'YES - Will generate approval/compliance scenario' : 'NO'}`);

      // Build recent domains list for prompt
      const recentDomainsText = domainHistory.length > 0
        ? domainHistory.slice(-5)
            .map(id => this.BUSINESS_DOMAINS.find(d => d.id === id)?.name || id)
            .join(', ')
        : 'None';

      // Load prompts with domain guidance
      const prompts = await this.promptLoader.loadPromptPair(
        "generate-scenario-system.txt",
        "generate-scenario-user.txt",
        {
          currentScenario: currentScenario,
          targetDomain: domain.name,
          targetDomainId: domain.id,
          targetTrigger: trigger,
          recentDomains: recentDomainsText,
          forceHumanInLoop: forceHumanInLoop ? 'true' : 'false'
        }
      );

      const response = await this.llmCaller.call([
        { role: "system", content: prompts.system },
        { role: "user", content: prompts.user }
      ], {
        maxRetries: this.maxRetries
        // No maxTokens - allow full scenario output
      });

      return {
        scenario: response.trim(),
        domain: domain.id,
        trigger: trigger
      };
    } catch (error: any) {
      console.error("Scenario generation failed:", error);
      throw new Error(`Failed to generate scenario: ${error.message}`);
    }
  }

  /**
   * Generate a realistic sample input message for testing the workflow
   */
  async generateSampleInput(
    processDescription: string, 
    mockDataSamples: string,
    workflowContext?: {
      agents?: Array<{ name: string; instructions: string; tools?: string[] }>;
      executors?: Array<{ name: string; purpose: string }>;
      workflowSteps?: Array<{ id: string; label: string; type: string }>;
    }
  ): Promise<string> {
    try {
      // Build enhanced context for better sample input generation
      let contextDescription = processDescription;
      
      if (workflowContext) {
        const agentSummary = workflowContext.agents?.map(a => 
          `- ${a.name}: ${a.instructions.substring(0, 100)}...`
        ).join('\n') || '';
        
        const executorSummary = workflowContext.executors?.map(e => 
          `- ${e.name}: ${e.purpose}`
        ).join('\n') || '';
        
        const workflowSummary = workflowContext.workflowSteps?.map(s => 
          `- ${s.label} (${s.type})`
        ).join(' → ') || '';
        
        contextDescription += `\n\nWorkflow Structure:\n${workflowSummary}`;
        
        if (agentSummary) {
          contextDescription += `\n\nAgents:\n${agentSummary}`;
        }
        
        if (executorSummary) {
          contextDescription += `\n\nExecutors:\n${executorSummary}`;
        }
      }
      
      // Load prompts
      const prompts = await this.promptLoader.loadPromptPair(
        "generate-sample-input-system.txt",
        "generate-sample-input-user.txt",
        {
          PROCESS_DESCRIPTION: contextDescription,
          MOCK_DATA_SAMPLES: mockDataSamples
        }
      );

      const response = await this.llmCaller.call([
        { role: "system", content: prompts.system },
        { role: "user", content: prompts.user }
      ], {
        maxRetries: this.maxRetries
        // No maxTokens - allow full input output
      });

      // Return the generated message, trimmed and cleaned
      return response.trim();
    } catch (error: any) {
      console.error("Sample input generation failed:", error);
      // Return a fallback message instead of throwing
      return "Start the workflow";
    }
  }

  /**
   * Generate a meaningful workflow name from process description using LLM
   * @param processDescription - User's description of the workflow process
   * @returns Azure-compatible workflow name (alphanumeric, hyphens, underscores only)
   */
  async generateWorkflowName(processDescription: string): Promise<{ name: string; reasoning?: string }> {
    try {
      console.log("🤖 Generating workflow name from description...");

      const prompts = await this.promptLoader.loadPromptPair(
        "generate-workflow-name-system.txt",
        "generate-workflow-name-user.txt",
        {
          PROCESS_DESCRIPTION: processDescription
        }
      );

      const response = await this.llmCaller.callWithJsonValidation<{ name: string; reasoning?: string }>(
        [
          { role: "system", content: prompts.system },
          { role: "user", content: prompts.user }
        ],
        {
          maxRetries: this.maxRetries,
          maxTokens: 200
        }
      );

      if (!response.parsed?.name) {
        throw new Error("LLM did not return a workflow name");
      }

      const generatedName = response.parsed.name.trim();

      // Validate Azure compatibility (alphanumeric, hyphens, underscores only)
      const azureNamePattern = /^[a-zA-Z0-9_-]+$/;
      if (!azureNamePattern.test(generatedName)) {
        console.warn(`⚠ Generated name "${generatedName}" contains invalid characters, sanitizing...`);
        const sanitized = generatedName
          .toLowerCase()
          .replace(/[^a-z0-9_-]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_+|_+$/g, '');
        return { name: sanitized, reasoning: response.parsed.reasoning };
      }

      console.log(`✓ Generated workflow name: "${generatedName}"`);
      if (response.parsed.reasoning) {
        console.log(`  Reasoning: ${response.parsed.reasoning}`);
      }

      return { name: generatedName, reasoning: response.parsed.reasoning };
    } catch (error: any) {
      console.error("❌ Workflow name generation failed:", error.message);
      // Return null to signal fallback should be used
      throw error;
    }
  }

  /**
   * Generate MCP server name from process description using LLM
   */
  async generateMCPServerName(processDescription: string): Promise<{ name: string; display: string; reasoning?: string }> {
    try {
      console.log("🤖 Generating MCP server name from description...");

      // Reuse workflow name prompts but adapt for MCP server context
      const systemPrompt = `You are an expert at naming MCP (Model Context Protocol) servers based on their purpose.

Generate a concise, descriptive name for an MCP server. The name should:
- Be lowercase with underscores (snake_case)
- End with "_mcp" suffix
- Capture the key domain/service (e.g., "sap_mcp", "intranet_filesystem_mcp", "aws_s3_mcp")
- Be 2-4 words maximum (including _mcp suffix)
- Focus on the main technology, service, or domain being integrated

Return JSON: {"name": "server_name_mcp", "display": "Display Name MCP Server", "reasoning": "why this name"}`;

      const userPrompt = `Process description: ${processDescription}

Generate the MCP server name:`;

      const response = await this.llmCaller.callWithJsonValidation<{ name: string; display: string; reasoning?: string }>(
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        {
          maxRetries: this.maxRetries,
          maxTokens: 200
        }
      );

      if (!response.parsed?.name || !response.parsed?.display) {
        throw new Error("LLM did not return complete MCP server name data");
      }

      // Sanitize the name
      let sanitizedName = response.parsed.name
        .toLowerCase()
        .replace(/[^a-z0-9_]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_+|_+$/g, '');
      
      // Ensure _mcp suffix
      if (!sanitizedName.endsWith('_mcp')) {
        sanitizedName = sanitizedName.replace(/_mcp$/, '') + '_mcp';
      }

      console.log(`✓ Generated MCP server name: "${sanitizedName}"`);
      if (response.parsed.reasoning) {
        console.log(`  Reasoning: ${response.parsed.reasoning}`);
      }

      return { 
        name: sanitizedName, 
        display: response.parsed.display,
        reasoning: response.parsed.reasoning 
      };
    } catch (error: any) {
      console.error("❌ MCP server name generation failed:", error.message);
      throw error;
    }
  }

  /**
   * Detect which database columns should have embeddings for semantic search
   */
  async detectEmbeddingColumns(
    scenarioDescription: string,
    databaseSchema: any
  ): Promise<Array<{ tableName: string; columnName: string; reasoning: string }>> {
    try {
      const schemaJson = JSON.stringify(databaseSchema, null, 2);
      
      const prompts = await this.promptLoader.loadPromptPair(
        "detect-embedding-columns-system.txt",
        "detect-embedding-columns-user.txt",
        {
          scenarioDescription,
          databaseSchema: schemaJson
        }
      );

      const response = await this.llmCaller.callWithJsonValidation<Array<{ tableName: string; columnName: string; reasoning: string }>>(
        [
          { role: "system", content: prompts.system },
          { role: "user", content: prompts.user }
        ],
        {
          maxRetries: this.maxRetries,
          maxTokens: 2000
        }
      );

      if (!Array.isArray(response.parsed)) {
        console.warn("⚠️ LLM did not return an array, wrapping in array");
        return [];
      }

      // Validate structure
      const validated = response.parsed.filter((col: any) => 
        col && typeof col.tableName === 'string' && 
        typeof col.columnName === 'string'
      );

      console.log(`✅ Detected ${validated.length} columns for embeddings`);
      validated.forEach(col => {
        console.log(`   - ${col.tableName}.${col.columnName}: ${col.reasoning || 'No reasoning provided'}`);
      });

      return validated;
    } catch (error: any) {
      console.error("❌ Failed to detect embedding columns:", error.message);
      return []; // Fallback to empty array
    }
  }

  /**
   * Test Azure OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const config = await this.configManager.getConfig();
      
      if (!config) {
        throw new Error("Azure OpenAI is not configured");
      }

      // Simple test with a minimal message
      await this.llmCaller.call([
        { role: "user", content: "Hello" }
      ], {
        maxRetries: 1,
        maxTokens: 100
      });

      // Validate embedding deployment when configured
      await this.verifyEmbeddingDeployment(config);

      return true;
    } catch (error: any) {
      console.error("Connection test failed:", error);
      throw error;
    }
  }

  /**
   * Ensure the configured embedding deployment exists and is accessible
   */
  private async verifyEmbeddingDeployment(config: AzureOpenAIConfig): Promise<void> {
    const embeddingModel = config.embeddingModelName?.trim();

    if (!embeddingModel) {
      console.log("ℹ️ No embedding deployment configured – skipping embedding validation");
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.authType === "apiKey") {
      if (!config.apiKey) {
        throw new Error("API key is not configured. Unable to validate embeddings deployment.");
      }
      headers["api-key"] = config.apiKey;
    } else {
      const token = await this.configManager.getEntraIdToken(config.tenantId);
      if (!token) {
        throw new Error("Failed to obtain Entra ID token for embedding validation.");
      }
      headers["Authorization"] = `Bearer ${token}`;
    }

    const apiVersion = config.apiVersion || "2024-02-15-preview";
    const url = `${config.endpoint}/openai/deployments/${embeddingModel}/embeddings?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify({
        input: ["connectivity check"],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const message = `Embedding deployment '${embeddingModel}' validation failed (${response.status}). ${errorText}`;
      console.error("❌", message);
      throw new Error(message);
    }

    console.log(`✅ Embedding deployment '${embeddingModel}' validated successfully`);
  }

  /**
   * Generate detailed instructions for a standalone agent based on description and template type
   */
  async generateStandaloneAgentInstructions(
    agentName: string,
    processDescription: string,
    templateType: string
  ): Promise<string> {
    const systemPrompt = `You are an AI agent instruction generator. Your task is to create comprehensive, detailed instructions for a standalone AI agent.

CRITICAL REQUIREMENTS:
1. Instructions must be HIGHLY DETAILED and SPECIFIC (minimum 200 words)
2. Include step-by-step operational procedures
3. Specify exact decision-making criteria
4. Define error handling approaches
5. List specific capabilities and limitations
6. Provide concrete examples of inputs/outputs
7. Include best practices and edge case handling

The instructions should enable the agent to operate AUTONOMOUSLY without additional guidance.`;

    const userPrompt = `Generate detailed instructions for this standalone agent:

AGENT NAME: ${agentName}
PURPOSE: ${processDescription}
TEMPLATE TYPE: ${templateType}

Generate comprehensive instructions that include:
1. **Core Responsibility**: What is the agent's primary function?
2. **Operational Steps**: Detailed step-by-step process the agent should follow
3. **Decision Criteria**: Exact conditions for making choices
4. **Input Processing**: How to handle and validate different input types
5. **Output Format**: Precise structure and content of responses
6. **Error Handling**: Specific strategies for common failure scenarios
7. **Autonomy Guidelines**: When to proceed independently vs. when to escalate
8. **Examples**: 2-3 concrete examples showing input → process → output
9. **Constraints**: Clear boundaries and limitations
10. **Best Practices**: Optimization tips and quality standards

Return ONLY the instruction text (200+ words), formatted as clear paragraphs. Do NOT include JSON structure, just the raw instruction text.`;

    try {
      const result = await this.llmCaller.callWithJsonValidation([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        maxRetries: this.maxRetries,
        useJsonMode: false,
        maxTokens: 2000  // Allow longer instructions
      });

      // Extract text from result - handle both string and object responses
      let instructions: string;
      if (typeof result.parsed === 'string') {
        instructions = result.parsed;
      } else if (result.parsed && typeof result.parsed === 'object') {
        // Try to extract from common response structures
        instructions = result.parsed.instructions || result.parsed.text || result.parsed.content || JSON.stringify(result.parsed);
      } else {
        instructions = String(result.parsed || '');
      }

      // Validate minimum length
      if (instructions.length < 100) {
        console.warn('⚠️  Generated instructions too short, using fallback with description');
        instructions = this.generateFallbackInstructions(agentName, processDescription, templateType);
      }

      console.log(`✅ Generated detailed instructions (${instructions.length} chars)`);
      return instructions;

    } catch (error) {
      console.error('❌ Failed to generate detailed instructions, using fallback:', error);
      return this.generateFallbackInstructions(agentName, processDescription, templateType);
    }
  }

  /**
   * Generate fallback instructions if LLM fails
   */
  private generateFallbackInstructions(agentName: string, processDescription: string, templateType: string): string {
    return `You are ${agentName}, a specialized AI agent designed for ${processDescription}.

CORE RESPONSIBILITIES:
Your primary function is to ${processDescription.toLowerCase()}. You operate autonomously within your defined scope and handle tasks related to this purpose.

OPERATIONAL APPROACH:
1. Analyze incoming requests to understand user intent and requirements
2. Validate input data and parameters for completeness and correctness
3. Execute your specialized function using best practices and efficient methods
4. Format responses clearly and comprehensively
5. Handle errors gracefully with informative feedback

DECISION-MAKING:
- Process requests that align with your core responsibility: ${processDescription}
- Validate all inputs before proceeding with operations
- Use context and historical information when available
- Apply domain-specific knowledge and best practices
- Escalate complex edge cases or out-of-scope requests

OUTPUT QUALITY:
- Provide accurate, relevant, and actionable responses
- Structure outputs in clear, user-friendly formats
- Include reasoning and supporting details when beneficial
- Maintain consistency across similar requests

ERROR HANDLING:
- Detect and report invalid inputs with specific guidance
- Gracefully handle service unavailability or timeouts
- Provide helpful error messages with recovery suggestions
- Log issues for debugging and improvement

CONSTRAINTS:
- Operate within the scope of: ${processDescription}
- Do not perform operations outside your specialized domain
- Respect data privacy and security requirements
- Follow established protocols and standards

You are built using the ${templateType} template and configured for autonomous operation within these guidelines.`;
  }

  /**
   * Identify required MCP tools based on agent capabilities
   */
  async identifyRequiredTools(
    agentName: string,
    mission: string,
    capabilities: string[],
    scenario: string
  ): Promise<{ tools: Array<{ name: string; description: string; parameters?: any }>; reasoning: string }> {
    const systemPrompt = `You are an expert MCP (Model Context Protocol) tool architect. Your task is to analyze agent requirements and design the MCP tools needed.

CRITICAL GUIDELINES:
1. Design MINIMAL, FOCUSED tools - each tool should do ONE thing well
2. Tool names should be clear, action-oriented (e.g., "send_email", "query_database", "search_web")
3. Each tool needs: name, description, and parameter schema
4. Be SPECIFIC - avoid generic tools like "process_data" or "handle_request"
5. Consider authentication, rate limits, and error handling needs
6. Only create tools for EXPLICIT capabilities mentioned

TOOL DESIGN PRINCIPLES:
- REST API integrations → one tool per endpoint group
- Database operations → separate read/write tools
- File operations → separate tools for read/write/delete
- Notifications → one tool per channel (email, slack, etc.)
- External services → one tool per service action

Return ONLY valid JSON, no other text.`;

    const userPrompt = `Design MCP tools for this agent:

AGENT: ${agentName}
MISSION: ${mission}

REQUIRED CAPABILITIES:
${capabilities.map((cap, i) => `${i + 1}. ${cap}`).join('\n')}

EXAMPLE SCENARIO:
${scenario}

For each capability, determine:
1. Does it need an MCP tool, or can the agent handle it with its base LLM capabilities?
2. If tool needed, design it with precise parameters

Return JSON:
{
  "tools": [
    {
      "name": "tool_name",
      "description": "What this tool does",
      "parameters": {
        "type": "object",
        "properties": {
          "param1": {"type": "string", "description": "..."}
        },
        "required": ["param1"]
      }
    }
  ],
  "reasoning": "Why these specific tools were designed"
}`;

    try {
      const result = await this.llmCaller.callWithJsonValidation<{
        tools: Array<{ name: string; description: string; parameters?: any }>;
        reasoning: string;
      }>([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        maxRetries: this.maxRetries,
        maxTokens: 2000
      });

      console.log(`✅ Identified ${result.parsed.tools.length} required tools`);
      console.log(`   Reasoning: ${result.parsed.reasoning}`);
      result.parsed.tools.forEach(tool => {
        console.log(`   - ${tool.name}: ${tool.description}`);
      });

      return result.parsed;

    } catch (error) {
      console.error('❌ Failed to identify required tools:', error);
      return { tools: [], reasoning: 'Failed to analyze tool requirements' };
    }
  }

  /**
   * Generate enhanced agent instructions from mission and scenario
   */
  async generateEnhancedInstructions(
    agentName: string,
    mission: string,
    scenario: string,
    tools: Array<{ name: string; description: string }>
  ): Promise<string> {
    const systemPrompt = `You are an expert AI agent instruction writer. Create comprehensive, detailed instructions that enable autonomous agent operation.

REQUIREMENTS:
1. Minimum 200 words of detailed, actionable instructions
2. Include step-by-step operational procedures
3. Specify exact decision-making criteria
4. Define error handling strategies
5. Provide concrete examples
6. Include tool usage guidelines if tools are available

STRUCTURE:
- Start with core responsibility overview
- Detail operational workflow
- Specify input validation requirements
- Define output formatting standards
- Include error handling approaches
- Add examples and edge cases

Return ONLY the instruction text, no JSON structure.`;

    const toolsSection = tools.length > 0
      ? `\n\nAVAILABLE TOOLS:\n${tools.map(t => `- ${t.name}: ${t.description}`).join('\n')}\n\nYou can use these tools by calling them with the correct parameters.`
      : '';

    const userPrompt = `Generate comprehensive instructions for this agent:

AGENT: ${agentName}
MISSION: ${mission}
${toolsSection}

EXAMPLE SCENARIO:
${scenario}

Based on this information, write detailed instructions (minimum 200 words) that cover:
1. Core responsibility and objectives
2. Step-by-step operational process
3. Decision criteria and logic
4. Input validation requirements
5. Output formatting standards
6. Error handling strategies
7. Tool usage guidelines (if tools available)
8. Concrete examples from the scenario
9. Edge cases and constraints

Write in clear, professional language suitable for an AI agent.`;

    try {
      const result = await this.llmCaller.callWithJsonValidation([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        maxRetries: this.maxRetries,
        useJsonMode: false,
        maxTokens: 2500
      });

      const instructions = typeof result.parsed === 'string' 
        ? result.parsed 
        : result.parsed?.instructions || result.parsed?.text || String(result.parsed);

      if (instructions.length < 100) {
        throw new Error('Generated instructions too short');
      }

      console.log(`✅ Generated enhanced instructions (${instructions.length} chars)`);
      return instructions;

    } catch (error) {
      console.error('❌ Failed to generate enhanced instructions:', error);
      return `You are ${agentName}. ${mission}\n\n${scenario}`;
    }
  }

  /**
   * Generate I/O validation schemas from format descriptions
   */
  async generateIOSchemas(
    inputFormat: string,
    outputFormat: string
  ): Promise<{ inputSchema: string; outputSchema: string; validationCode: string }> {
    const systemPrompt = `You are a Python code generator specializing in data validation and formatting.

Generate Pydantic models and validation functions for agent input/output handling.

CRITICAL REQUIREMENTS:
1. Return EXECUTABLE Python code ONLY - NO triple-quoted strings, NO comment blocks
2. Use Pydantic BaseModel for schemas with proper Python syntax
3. Include type hints and validation decorators
4. Add descriptive docstrings INSIDE the classes (not wrapping them)
5. Generate helper validation functions as actual Python functions
6. Handle common edge cases
7. Code must be directly executable when inserted into a Python file
8. NO semicolons at end of lines - this is Python, not JavaScript!
9. Use string type hints in validation functions (e.g., -> "InputModel") to avoid forward reference issues
10. Do NOT import from 'inputSchema' or 'outputSchema' modules - classes are defined in same file
11. All imports must be standard library or pydantic only
12. Place ALL imports at the TOP of each code section (inputSchema, outputSchema, validationCode)
13. Do NOT duplicate imports across sections - each section is independent
14. Keep code clean, well-formatted, and properly indented

FORBIDDEN PATTERNS:
❌ from outputSchema import AlertPayload
❌ from inputSchema import HL7LabInput
❌ field: str = Field(..., description="...");  (no semicolon!)
❌ """triple quoted code blocks"""
❌ Duplicate imports in multiple sections

Return valid JSON with EXECUTABLE code strings.`;

    const userPrompt = `Generate Python Pydantic schemas and validation code:

INPUT FORMAT:
${inputFormat}

OUTPUT FORMAT:
${outputFormat}

Return JSON with EXECUTABLE Python code (not wrapped in triple quotes or comments):
{
  "inputSchema": "# Pydantic model for input validation\\nfrom pydantic import BaseModel, Field, validator\\nfrom typing import Optional\\nfrom datetime import datetime\\n\\nclass InputModel(BaseModel):\\n    \\"\\"\\"Input validation model.\\"\\"\\"\\n    field1: str = Field(..., description=\\"Example field\\")\\n    field2: Optional[int] = Field(None, description=\\"Optional field\\")\\n    timestamp: str = Field(..., description=\\"ISO 8601 timestamp\\")\\n    \\n    @validator('timestamp')\\n    def validate_timestamp(cls, v: str) -> str:\\n        try:\\n            datetime.fromisoformat(v)\\n        except ValueError as e:\\n            raise ValueError(\\"Invalid timestamp format\\") from e\\n        return v",
  "outputSchema": "# Pydantic model for output formatting\\nfrom pydantic import BaseModel, Field\\nfrom typing import Optional\\n\\nclass OutputModel(BaseModel):\\n    \\"\\"\\"Output formatting model.\\"\\"\\"\\n    result: str = Field(..., description=\\"Result field\\")\\n    status: str = Field(..., description=\\"Status field\\")\\n    confidence: float = Field(..., ge=0.0, le=1.0, description=\\"Confidence score\\")",
  "validationCode": "# Helper validation functions\\nfrom typing import Dict, Any\\n\\ndef validate_input(data: Dict[str, Any]) -> \\"InputModel\\":\\n    \\"\\"\\"Validate and parse input data.\\"\\"\\"\\n    return InputModel(**data)\\n\\ndef format_output(input_data: \\"InputModel\\") -> \\"OutputModel\\":\\n    \\"\\"\\"Transform validated input into output format.\\"\\"\\"\\n    return OutputModel(\\n        result=\\"processed\\",\\n        status=\\"completed\\",\\n        confidence=0.95\\n    )"
}

CRITICAL VALIDATION RULES:
1. NO semicolons anywhere in the code
2. Use forward reference strings in type hints (e.g., -> "InputModel") to avoid NameError
3. Do NOT import the schema classes - they're defined in the same file
4. Only use imports: pydantic, typing (Dict, Any, Optional, List, Tuple), datetime, hashlib (if needed)
5. Use proper typing.Tuple for tuple return types: def func() -> Tuple[str, str]
6. Do NOT use bare tuple syntax: def func() -> (str, str) is INVALID
7. Keep validation functions simple - avoid complex try/except blocks
8. Use @staticmethod decorator correctly (on its own line)
9. Do NOT nest class definitions
10. Make sure all functions are properly indented and complete

IMPORTANT: Return ONLY executable Python code. Do NOT wrap in triple quotes or comment blocks.`;

    try {
      const result = await this.llmCaller.callWithJsonValidation<{
        inputSchema: string;
        outputSchema: string;
        validationCode: string;
      }>([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ], {
        maxRetries: this.maxRetries,
        maxTokens: 1500
      });

      console.log(`✅ Generated I/O schemas`);
      return result.parsed;

    } catch (error) {
      console.error('❌ Failed to generate I/O schemas:', error);
      return {
        inputSchema: '# Input schema generation failed',
        outputSchema: '# Output schema generation failed',
        validationCode: '# Validation code generation failed'
      };
    }
  }

  async generateRandomAgent(
    agentHistory: string[] = []
  ): Promise<{ agent: RandomAgentDefinition; domain: string; domainDisplay: string; trigger: string }> {
    try {
      const { domain, trigger } = this.selectNextDomain(agentHistory);

      const prompts = await this.promptLoader.loadPromptPair(
        "generate-random-agent-system.txt",
        "generate-random-agent-user.txt",
        {
          targetDomainName: domain.name,
          targetDomainId: domain.id,
          targetTrigger: trigger
        }
      );

      const result = await this.llmCaller.callWithJsonValidation<RandomAgentDefinition>(
        [
          { role: "system", content: prompts.system },
          { role: "user", content: prompts.user }
        ],
        {
          maxRetries: this.maxRetries,
          useJsonMode: false
        }
      );

      const agent = (result.parsed || {}) as RandomAgentDefinition;
      agent.ensuresHumanInLoop = agent.ensuresHumanInLoop ?? false;
      agent.keyCapabilities = Array.isArray(agent.keyCapabilities) ? agent.keyCapabilities : [];
      agent.inputFormat = Array.isArray(agent.inputFormat) ? agent.inputFormat : [];
      agent.outputFormat = Array.isArray(agent.outputFormat) ? agent.outputFormat : [];
      agent.guardrails = Array.isArray(agent.guardrails) ? agent.guardrails : [];

      if (!agent.agentName || agent.keyCapabilities.length === 0) {
        throw new Error("Random agent generation returned incomplete data");
      }

      return {
        agent,
        domain: domain.id,
        domainDisplay: domain.name,
        trigger
      };
    } catch (error: any) {
      console.error("Random agent generation failed:", error);
      throw new Error(`Failed to generate agent: ${error.message}`);
    }
  }
}
