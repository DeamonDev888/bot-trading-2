import { BaseAgentSimple, AgentRequest } from './BaseAgentSimple.js';
import * as fs from 'fs/promises';
import * as fsSync from 'fs';
import * as path from 'path';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { FileUploadData } from '../../discord_bot/DiscordFileUploader.js';

// Configuration robuste
interface ClaudeConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  timeoutMs: number;
  rateLimitMs: number;
  maxBufferSize: number;
}

interface CircuitBreakerState {
  failures: number;
  lastFailure: number;
  state: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
}

const execAsync = promisify(exec);

export class ClaudeChatBotAgentEnhanced extends BaseAgentSimple {
  private config: ClaudeConfig;
  private circuitBreaker: CircuitBreakerState;
  private lastRequestTime: number = 0;
  private messageQueue: Array<() => Promise<void>> = [];

  constructor(config?: Partial<ClaudeConfig>) {
    super('claude-chatbot-enhanced');

    this.config = {
      maxRetries: 3,
      baseDelay: 1000,
      maxDelay: 30000,
      timeoutMs: 300000,
      rateLimitMs: 100,
      maxBufferSize: 1024 * 1024 * 10, // 10MB
      ...config
    };

    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED'
    };

    this.startMessageQueueProcessor();
  }

  /**
   * Circuit Breaker Pattern - Protect against cascading failures
   */
  private canMakeRequest(): boolean {
    const now = Date.now();
    const failureWindow = 60000; // 1 minute

    if (this.circuitBreaker.state === 'OPEN') {
      if (now - this.circuitBreaker.lastFailure < this.config.maxDelay) {
        console.log(`[claude-enhanced] 🚫 Circuit breaker OPEN - rejecting request`);
        return false;
      } else {
        this.circuitBreaker.state = 'HALF_OPEN';
        console.log(`[claude-enhanced] 🔄 Circuit breaker HALF_OPEN - testing request`);
      }
    }

    if (this.circuitBreaker.state === 'HALF_OPEN') {
      // Only allow one test request in HALF_OPEN state
      if (this.circuitBreaker.failures > 0) {
        return false;
      }
    }

    return true;
  }

  private recordSuccess(): void {
    this.circuitBreaker.failures = 0;
    this.circuitBreaker.state = 'CLOSED';
    console.log(`[claude-enhanced] ✅ Circuit breaker CLOSED - reset failures`);
  }

  private recordFailure(): void {
    this.circuitBreaker.failures++;
    this.circuitBreaker.lastFailure = Date.now();

    if (this.circuitBreaker.failures >= 3) {
      this.circuitBreaker.state = 'OPEN';
      console.log(`[claude-enhanced] ❌ Circuit breaker OPENED - too many failures`);
    }
  }

  /**
   * Rate Limiting - Prevent API abuse
   */
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.config.rateLimitMs) {
      const waitTime = this.config.rateLimitMs - timeSinceLastRequest;
      console.log(`[claude-enhanced] ⏳ Rate limiting - waiting ${waitTime}ms`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }

    this.lastRequestTime = Date.now();
  }

  /**
   * Retry with Exponential Backoff
   */
  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    context: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        console.log(`[claude-enhanced] 🔄 Attempt ${attempt}/${this.config.maxRetries} for ${context}`);
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry certain errors
        if (this.isNonRetryableError(error)) {
          console.log(`[claude-enhanced] 🚫 Non-retryable error: ${lastError.message}`);
          throw error;
        }

        if (attempt === this.config.maxRetries) {
          console.log(`[claude-enhanced] ❌ Max retries reached for ${context}`);
          throw lastError;
        }

        // Calculate exponential backoff with jitter
        const delay = Math.min(
          this.config.baseDelay * Math.pow(2, attempt - 1),
          this.config.maxDelay
        );
        const jitter = Math.random() * 1000;
        const totalDelay = delay + jitter;

        console.log(`[claude-enhanced] ⏳ Retrying in ${Math.round(totalDelay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, totalDelay));
      }
    }

    throw lastError!;
  }

  private isNonRetryableError(error: unknown): boolean {
    if (error instanceof Error) {
      const message = error.message.toLowerCase();
      return (
        message.includes('rate limit') ||
        message.includes('unauthorized') ||
        message.includes('forbidden') ||
        message.includes('echo response') ||
        message.includes('claude process terminated')
      );
    }
    return false;
  }

  /**
   * Message Queue for Concurrent Request Management
   */
  private startMessageQueueProcessor(): void {
    setInterval(async () => {
      if (this.messageQueue.length > 0 && this.canMakeRequest()) {
        const processMessage = this.messageQueue.shift();
        if (processMessage) {
          try {
            await processMessage();
          } catch (error) {
            console.error(`[claude-enhanced] ❌ Message queue error:`, error);
          }
        }
      }
    }, 100);
  }

  /**
   * Execute with comprehensive error handling and monitoring
   */
  private async executeWithRobustness(
    message: string,
    context: string
  ): Promise<string> {
    return this.retryWithBackoff(async () => {
      await this.rateLimit();

      if (!this.canMakeRequest()) {
        throw new Error('Circuit breaker is OPEN - request rejected');
      }

      const startTime = Date.now();
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      try {
        console.log(`[claude-enhanced] 🚀 ${requestId} Starting execution: ${context}`);

        const result = await this.executeClaudeCommand(message, requestId, startTime);

        this.recordSuccess();
        console.log(`[claude-enhanced] ✅ ${requestId} Success in ${Date.now() - startTime}ms`);

        return result;
      } catch (error) {
        this.recordFailure();
        console.error(`[claude-enhanced] ❌ ${requestId} Failed:`, error);
        throw error;
      }
    }, context);
  }

  private async executeClaudeCommand(
    message: string,
    requestId: string,
    startTime: number
  ): Promise<string> {
    // Use echo pipe method like the original agent
    const escapedMessage = message.replace(/"/g, '\\"');
    const command = `echo "${escapedMessage}" | claude.cmd --dangerously-skip-permissions --print --output-format json`;

    console.log(`[claude-enhanced] 🔍 ${requestId} Command: ${command.substring(0, 100)}...`);

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        console.log(`[claude-enhanced] ⏰ ${requestId} Timeout after ${this.config.timeoutMs}ms`);
        child.kill('SIGTERM');
        reject(new Error(`Claude timeout after ${this.config.timeoutMs}ms`));
      }, this.config.timeoutMs);

      const child = spawn(command, {
        shell: true,
        stdio: ['pipe', 'pipe', 'pipe'],
        detached: false,
        env: { ...process.env }
      });

      let stdout = '';
      let stderr = '';
      let responseComplete = false;

      child.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();

        if (stdout.length > this.config.maxBufferSize) {
          clearTimeout(timeout);
          child.kill('SIGTERM');
          reject(new Error(`Buffer overflow: response exceeds ${this.config.maxBufferSize} bytes`));
          return;
        }

        // Enhanced echo detection
        const isEcho = this.detectEcho(stdout, message);

        if (!isEcho && stdout.includes('{"result"')) {
          responseComplete = true;
          clearTimeout(timeout);
          child.kill('SIGTERM');

          const cleanResponse = this.parseResponse(stdout);
          resolve(cleanResponse);
        }
      });

      child.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
        if (stderr.length > 1000) { // Limit stderr logging
          stderr = stderr.substring(0, 1000);
        }
      });

      child.on('close', (code: number) => {
        clearTimeout(timeout);

        if (!responseComplete) {
          if (stdout.trim()) {
            console.log(`[claude-enhanced] ⚠️ ${requestId} Partial response on close (code: ${code})`);
            const cleanResponse = this.parseResponse(stdout);
            resolve(cleanResponse);
          } else {
            reject(new Error(`Claude process closed with code ${code}: ${stderr}`));
          }
        }
      });

      child.on('error', (error: Error) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private detectEcho(output: string, originalMessage: string): boolean {
    const echoPatterns = [
      /peu tu recrie/i,
      /peu tu recrire/i,
      /echo\s+/i,
      new RegExp(originalMessage.substring(0, 20).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
    ];

    return echoPatterns.some(pattern => pattern.test(output)) ||
           (output.length < 100 && output.includes('"'));
  }

  private parseResponse(output: string): string {
    try {
      // Enhanced JSON parsing
      const cleanOutput = output.replace(/[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g, '');

      if (cleanOutput.trim().startsWith('{')) {
        const event = JSON.parse(cleanOutput.trim());
        if (event.result && typeof event.result === 'string') {
          return event.result;
        }
        if (event.content && typeof event.content === 'string') {
          return event.content;
        }
      }

      // Fallback: extract JSON from text
      const jsonMatch = cleanOutput.match(/(\{[\s\S]*?\})/);
      if (jsonMatch) {
        const event = JSON.parse(jsonMatch[1]);
        return event.result || event.content || event.text || cleanOutput.trim();
      }

      return cleanOutput.trim();
    } catch (error) {
      console.warn(`[claude-enhanced] ⚠️ Parse error:`, error);
      return output.trim();
    }
  }

  /**
   * Public interface with request queuing
   */
  async chat(message: string): Promise<string>;
  async chat(request: ChatRequest): Promise<ChatResponse>;
  async chat(requestOrMessage: string | ChatRequest): Promise<string | ChatResponse> {
    return new Promise((resolve, reject) => {
      this.messageQueue.push(async () => {
        try {
          // Handle both string and ChatRequest
          let message: string;
          if (typeof requestOrMessage === 'string') {
            message = requestOrMessage;
          } else {
            // Build message from ChatRequest
            const { message: msg, username, userId, attachmentContent } = requestOrMessage;
            message = `${username ? `[${username}] ` : ''}${msg}${attachmentContent ? `\n\nAttachment: ${attachmentContent}` : ''}`;
          }

          const response = await this.executeWithRobustness(message, 'chat');

          // If called with ChatRequest, return structured response
          if (typeof requestOrMessage !== 'string') {
            const chatResponse: ChatResponse = {
              messages: [response],
              discordMessage: {
                type: 'message_enrichi',
                content: response
              }
            };
            resolve(chatResponse);
          } else {
            resolve(response);
          }
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Health check endpoint
   */
  getHealthStatus(): {
    circuitBreaker: CircuitBreakerState;
    queueLength: number;
    config: ClaudeConfig;
    uptime: number;
  } {
    return {
      circuitBreaker: { ...this.circuitBreaker },
      queueLength: this.messageQueue.length,
      config: { ...this.config },
      uptime: Date.now() - this.lastRequestTime
    };
  }

  /**
   * Reset circuit breaker (for testing)
   */
  resetCircuitBreaker(): void {
    this.circuitBreaker = {
      failures: 0,
      lastFailure: 0,
      state: 'CLOSED'
    };
    console.log(`[claude-enhanced] 🔄 Circuit breaker reset`);
  }
}

// === TYPES FOR DISCORD INTEGRATION ===
export interface ChatRequest {
  message: string;
  userId?: string;
  username?: string;
  channelId?: string;
  attachmentContent?: string;
}

export interface PollOption {
  text: string;
  emoji?: string;
}

export interface PollData {
  question: string;
  options: PollOption[];
  duration: number;
  allowMultiselect: boolean;
  channelId?: string;
}

export interface DiscordEmbedOptions {
  title?: string;
  description?: string;
  color?: number | string;
  url?: string;
  timestamp?: boolean | Date;
}

export interface DiscordButtonOptions {
  label: string;
  style?: 'Primary' | 'Secondary' | 'Success' | 'Danger' | 'Link';
  customId?: string;
  url?: string;
  emoji?: string;
}

export interface DiscordMessageData {
  type: 'poll' | 'message_enrichi';
  content?: string;
  poll?: PollData;
  embed?: DiscordEmbedOptions;
  buttons?: DiscordButtonOptions[];
}

export interface ChatResponse {
  messages: string[];
  poll?: PollData;
  discordMessage?: DiscordMessageData;
  fileUpload?: FileUploadData;
}
