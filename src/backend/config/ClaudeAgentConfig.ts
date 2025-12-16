/**
 * Configuration manager avancé pour ClaudeChatBotAgent
 * Validation, profils de configuration, et optimisation dynamique
 */

import { z } from 'zod';

// Schéma de validation avec Zod
const ClaudeAgentConfigSchema = z.object({
  // Timeouts et retry
  timeoutMs: z.number().min(1000).max(600000).default(300000),
  maxRetries: z.number().min(0).max(10).default(3),
  baseDelay: z.number().min(100).max(10000).default(1000),
  maxDelay: z.number().min(1000).max(300000).default(30000),

  // Rate limiting
  rateLimitMs: z.number().min(0).max(10000).default(100),

  // Buffer et performance
  maxBufferSize: z.number().min(1024).max(1024 * 1024 * 100).default(1024 * 1024 * 10),
  maxConcurrentRequests: z.number().min(1).max(100).default(10),

  // Circuit breaker
  circuitBreaker: z.object({
    failureThreshold: z.number().min(1).max(20).default(3),
    resetTimeoutMs: z.number().min(5000).max(600000).default(60000),
    halfOpenMaxTrials: z.number().min(1).max(10).default(1)
  }),

  // Logging et monitoring
  logLevel: z.enum(['DEBUG', 'INFO', 'WARN', 'ERROR']).default('INFO'),
  enableMetrics: z.boolean().default(true),
  enablePrometheus: z.boolean().default(false),

  // Sécurité
  maxMessageLength: z.number().min(100).max(100000).default(10000),
  sanitizeInput: z.boolean().default(true),
  enableContentFilter: z.boolean().default(true),

  // Performance tuning
  enableConnectionPooling: z.boolean().default(true),
  connectionPoolSize: z.number().min(1).max(50).default(5),
  keepAliveMs: z.number().min(1000).max(300000).default(60000),

  // Fallback
  fallbackEnabled: z.boolean().default(false),
  fallbackAgent: z.string().optional(),

  // Profiles
  profile: z.enum(['development', 'testing', 'staging', 'production']).default('development')
});

// Type inféré du schéma
export type ClaudeAgentConfig = z.infer<typeof ClaudeAgentConfigSchema>;

// Profils de configuration prédéfinis
export const ConfigProfiles: Record<string, Partial<ClaudeAgentConfig>> = {
  development: {
    logLevel: 'DEBUG',
    enableMetrics: true,
    timeoutMs: 60000,
    maxRetries: 2,
    baseDelay: 500,
    rateLimitMs: 50,
    profile: 'development'
  },

  testing: {
    logLevel: 'INFO',
    enableMetrics: true,
    timeoutMs: 5000,
    maxRetries: 1,
    baseDelay: 100,
    rateLimitMs: 10,
    circuitBreaker: {
      failureThreshold: 2,
      resetTimeoutMs: 5000,
      halfOpenMaxTrials: 1
    },
    profile: 'testing'
  },

  staging: {
    logLevel: 'INFO',
    enableMetrics: true,
    enablePrometheus: true,
    timeoutMs: 120000,
    maxRetries: 3,
    baseDelay: 1000,
    rateLimitMs: 100,
    circuitBreaker: {
      failureThreshold: 5,
      resetTimeoutMs: 120000,
      halfOpenMaxTrials: 3
    },
    profile: 'staging'
  },

  production: {
    logLevel: 'WARN',
    enableMetrics: true,
    enablePrometheus: true,
    timeoutMs: 300000,
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 30000,
    rateLimitMs: 100,
    maxBufferSize: 1024 * 1024 * 10,
    circuitBreaker: {
      failureThreshold: 3,
      resetTimeoutMs: 60000,
      halfOpenMaxTrials: 1
    },
    enableContentFilter: true,
    enableConnectionPooling: true,
    profile: 'production'
  }
};

interface ConfigValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  config?: ClaudeAgentConfig;
}

interface PerformanceProfile {
  name: string;
  description: string;
  metrics: {
    avgLatency: number;
    p95Latency: number;
    throughput: number;
    errorRate: number;
  };
  recommendedConfig: Partial<ClaudeAgentConfig>;
}

export class ClaudeAgentConfigManager {
  private config: ClaudeAgentConfig;
  private validationCache: Map<string, ConfigValidationResult> = new Map();

  constructor(config?: Partial<ClaudeAgentConfig>) {
    this.config = this.loadConfig(config);
  }

  /**
   * Charger et valider la configuration
   */
  private loadConfig(partial?: Partial<ClaudeAgentConfig>): ClaudeAgentConfig {
    // Commencer avec le profil par défaut
    const profile = partial?.profile || 'development';
    const profileConfig = ConfigProfiles[profile] || {};

    // Fusionner avec la configuration fournie
    const merged = {
      ...profileConfig,
      ...partial
    };

    // Valider avec le schéma
    const result = ClaudeAgentConfigSchema.safeParse(merged);

    if (!result.success) {
      throw new Error(`Configuration validation failed: ${result.error.message}`);
    }

    return result.data;
  }

  /**
   * Valider la configuration
   */
  validate(config?: Partial<ClaudeAgentConfig>): ConfigValidationResult {
    const configToValidate = config || this.config;
    const cacheKey = JSON.stringify(configToValidate);

    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)!;
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Validations personnalisées
    if (configToValidate.timeoutMs && configToValidate.maxRetries) {
      const maxTotalTimeout = configToValidate.timeoutMs * (configToValidate.maxRetries + 1);
      if (maxTotalTimeout > 600000) { // 10 minutes
        warnings.push('Maximum total timeout exceeds 10 minutes');
      }
    }

    if (configToValidate.rateLimitMs && configToValidate.rateLimitMs < 10) {
      warnings.push('Very aggressive rate limiting may impact performance');
    }

    if (configToValidate.maxBufferSize && configToValidate.maxBufferSize < 1024 * 1024) {
      warnings.push('Small buffer size may cause issues with large responses');
    }

    // Validation avec Zod
    const zodResult = ClaudeAgentConfigSchema.safeParse(configToValidate);

    if (!zodResult.success) {
      errors.push(...zodResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`));
    }

    const result: ConfigValidationResult = {
      valid: errors.length === 0,
      errors,
      warnings,
      config: zodResult.success ? zodResult.data : undefined
    };

    this.validationCache.set(cacheKey, result);
    return result;
  }

  /**
   * Obtenir la configuration actuelle
   */
  getConfig(): Readonly<ClaudeAgentConfig> {
    return { ...this.config };
  }

  /**
   * Mettre à jour la configuration
   */
  updateConfig(updates: Partial<ClaudeAgentConfig>): ClaudeAgentConfig {
    const newConfig = { ...this.config, ...updates };
    const validation = this.validate(newConfig);

    if (!validation.valid) {
      throw new Error(`Invalid configuration update: ${validation.errors.join(', ')}`);
    }

    this.config = validation.config!;
    return this.config;
  }

  /**
   * Charger un profil prédéfini
   */
  loadProfile(profileName: string): ClaudeAgentConfig {
    if (!ConfigProfiles[profileName]) {
      throw new Error(`Unknown profile: ${profileName}`);
    }

    const profileConfig = ConfigProfiles[profileName];
    this.config = this.loadConfig(profileConfig);
    return this.config;
  }

  /**
   * Optimiser la configuration basée sur les métriques de performance
   */
  optimizeForPerformance(metrics: {
    avgLatency: number;
    errorRate: number;
    throughput: number;
    resourceUsage?: {
      cpu: number;
      memory: number;
    };
  }): Partial<ClaudeAgentConfig> {
    const optimizations: Partial<ClaudeAgentConfig> = {};

    // Optimisation des timeouts basée sur la latence
    if (metrics.avgLatency > 10000) { // > 10s
      optimizations.timeoutMs = Math.min(this.config.timeoutMs * 1.5, 600000);
      optimizations.maxRetries = Math.max(this.config.maxRetries - 1, 1);
    } else if (metrics.avgLatency < 2000) { // < 2s
      optimizations.timeoutMs = Math.max(this.config.timeoutMs * 0.8, 10000);
      optimizations.maxRetries = Math.min(this.config.maxRetries + 1, 5);
    }

    // Optimisation du rate limiting basée sur le throughput
    if (metrics.throughput > 100) { // > 100 req/min
      optimizations.rateLimitMs = Math.max(this.config.rateLimitMs * 1.5, 200);
    } else if (metrics.throughput < 10) { // < 10 req/min
      optimizations.rateLimitMs = Math.max(this.config.rateLimitMs * 0.5, 50);
    }

    // Optimisation du circuit breaker basée sur le taux d'erreur
    if (metrics.errorRate > 0.1) { // > 10%
      optimizations.circuitBreaker = {
        ...this.config.circuitBreaker,
        failureThreshold: Math.max(this.config.circuitBreaker.failureThreshold - 1, 1),
        resetTimeoutMs: Math.max(this.config.circuitBreaker.resetTimeoutMs * 1.5, 30000)
      };
    } else if (metrics.errorRate < 0.01) { // < 1%
      optimizations.circuitBreaker = {
        ...this.config.circuitBreaker,
        failureThreshold: Math.min(this.config.circuitBreaker.failureThreshold + 1, 10),
        resetTimeoutMs: Math.max(this.config.circuitBreaker.resetTimeoutMs * 0.8, 10000)
      };
    }

    // Optimisation de la pool de connexions
    if (metrics.resourceUsage) {
      if (metrics.resourceUsage.cpu > 80) {
        optimizations.maxConcurrentRequests = Math.max(this.config.maxConcurrentRequests - 2, 1);
      } else if (metrics.resourceUsage.cpu < 30) {
        optimizations.maxConcurrentRequests = Math.min(this.config.maxConcurrentRequests + 2, 20);
      }
    }

    return optimizations;
  }

  /**
   * Générer des profils de performance basés sur des tests
   */
  generatePerformanceProfiles(testResults: Array<{
    config: Partial<ClaudeAgentConfig>;
    metrics: {
      avgLatency: number;
      p95Latency: number;
      throughput: number;
      errorRate: number;
    };
  }>): PerformanceProfile[] {
    const profiles: PerformanceProfile[] = [];

    // Trier par score composite (latence + throughput - error rate)
    const scored = testResults.map(result => ({
      ...result,
      score: (1000 - result.metrics.avgLatency) + result.metrics.throughput - (result.metrics.errorRate * 100)
    })).sort((a, b) => b.score - a.score);

    // Créer des profils basés sur différents critères
    const bestLatency = scored.reduce((best, current) =>
      current.metrics.avgLatency < best.metrics.avgLatency ? current : best
    );
    profiles.push({
      name: 'low_latency',
      description: 'Optimisé pour la latence minimale',
      metrics: bestLatency.metrics,
      recommendedConfig: {
        ...bestLatency.config,
        score: bestLatency.score,
        metrics: bestLatency.metrics
      } as any
    });

    const bestThroughput = scored.reduce((best, current) =>
      current.metrics.throughput > best.metrics.throughput ? current : best
    );
    profiles.push({
      name: 'high_throughput',
      description: 'Optimisé pour le débit maximal',
      metrics: bestThroughput.metrics,
      recommendedConfig: {
        ...bestThroughput.config,
        score: bestThroughput.score,
        metrics: bestThroughput.metrics
      } as any
    });

    const balanced = scored.reduce((best, current) =>
      Math.abs(current.metrics.avgLatency - 5000) < Math.abs(best.metrics.avgLatency - 5000) &&
      Math.abs(current.metrics.throughput - 50) < Math.abs(best.metrics.throughput - 50)
        ? current : best
    );
    profiles.push({
      name: 'balanced',
      description: 'Équilibre entre latence et débit',
      metrics: balanced.metrics,
      recommendedConfig: {
        ...balanced.config,
        score: balanced.score,
        metrics: balanced.metrics
      } as any
    });

    return profiles;
  }

  /**
   * Exporter la configuration
   */
  exportConfig(): string {
    return JSON.stringify({
      config: this.config,
      profile: this.config.profile,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    }, null, 2);
  }

  /**
   * Importer la configuration
   */
  importConfig(configJson: string): ClaudeAgentConfig {
    try {
      const parsed = JSON.parse(configJson);
      const config = parsed.config || parsed;

      const validation = this.validate(config);
      if (!validation.valid) {
        throw new Error(`Invalid imported config: ${validation.errors.join(', ')}`);
      }

      this.config = validation.config!;
      return this.config;
    } catch (error) {
      throw new Error(`Failed to import config: ${error}`);
    }
  }

  /**
   * Valider la configuration du système
   */
  validateSystemRequirements(): {
    valid: boolean;
    checks: Array<{ name: string; status: 'PASS' | 'FAIL' | 'WARN'; message: string }>;
  } {
    const checks: Array<{ name: string; status: 'PASS' | 'FAIL' | 'WARN'; message: string }> = [];

    // Vérifier la mémoire disponible
    const memUsage = process.memoryUsage();
    const memAvailable = memUsage.heapTotal / (1024 * 1024); // MB
    checks.push({
      name: 'Memory Available',
      status: memAvailable > 100 ? 'PASS' : memAvailable > 50 ? 'WARN' : 'FAIL',
      message: `${memAvailable.toFixed(2)} MB heap allocated`
    });

    // Vérifier les variables d'environnement
    const requiredEnvVars = ['NODE_ENV'];
    const missingEnv = requiredEnvVars.filter(varName => !process.env[varName]);
    checks.push({
      name: 'Environment Variables',
      status: missingEnv.length === 0 ? 'PASS' : 'WARN',
      message: missingEnv.length === 0 ? 'All required env vars present' : `Missing: ${missingEnv.join(', ')}`
    });

    // Vérifier la configuration de timeout
    checks.push({
      name: 'Timeout Configuration',
      status: this.config.timeoutMs <= 300000 ? 'PASS' : 'WARN',
      message: `Timeout set to ${this.config.timeoutMs}ms`
    });

    // Vérifier la configuration de retry
    checks.push({
      name: 'Retry Configuration',
      status: this.config.maxRetries <= 5 ? 'PASS' : 'WARN',
      message: `Max retries: ${this.config.maxRetries}`
    });

    const valid = checks.every(check => check.status === 'PASS' || check.status === 'WARN');

    return { valid, checks };
  }
}

// Export des utilitaires
export const ConfigUtils = {
  /**
   * Créer une configuration pour un environnement spécifique
   */
  createForEnvironment: (env: string): Partial<ClaudeAgentConfig> => {
    const profile = ConfigProfiles[env] || ConfigProfiles.development;
    return profile;
  },

  /**
   * Merger plusieurs configurations
   */
  mergeConfigs: (...configs: Array<Partial<ClaudeAgentConfig>>): Partial<ClaudeAgentConfig> => {
    return configs.reduce((merged, config) => ({ ...merged, ...config }), {});
  },

  /**
   * Obtenir les clés de configuration
   */
  getConfigKeys: (): string[] => {
    return Object.keys(ClaudeAgentConfigSchema.shape);
  }
};
