# SierraChart Data Transformation Architecture

## Overview

This document outlines a robust, scalable data transformation architecture for handling high-frequency market data from SierraChart through the DTC protocol. The system is designed to process multiple data formats (binary, JSON, TOON) with sub-100ms latency while supporting 1000+ concurrent symbols and 99.9% uptime requirements.

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Data Ingestion Layer                         │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   DTC       │  │   File      │  │   REST      │              │
│  │   Protocol  │  │   Scanner   │  │   APIs      │              │
│  │   Handler   │  │   Service   │  │   Gateway   │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                 │                 │                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Message Router Core                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Binary    │  │   JSON      │  │   TOON      │              │
│  │   Parser    │  │   Parser    │  │   Parser    │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                 │                 │                   │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐              │
│  │   Message   │  │   Message   │  │   Message   │              │
│  │   Validator │  │   Validator │  │   Validator │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                 │                 │                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                Transformation Engine                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Format    │  │   Data      │  │   Value     │              │
│  │   Converter │  │   Enricher  │  │   Normalizer│              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                 │                 │                   │
│  ┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼──────┐              │
│  │   OHLC      │  │   Tick      │  │   DOM       │              │
│  │   Processor │  │   Processor │  │   Processor │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                 │                 │                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                Caching & Storage Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   Redis     │  │   Timescale │  │   Memory    │              │
│  │   Cache     │  │   DB        │  │   Pool      │              │
│  │   (L1)      │  │   (L2)      │  │   (L0)      │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                 │                 │                   │
└─────────┼─────────────────┼─────────────────┼───────────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Distribution Layer                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │   WebSocket │  │   Agent     │  │   Discord   │              │
│  │   Stream    │  │   Feed      │  │   Bot       │              │
│  │   Gateway   │  │   API       │  │   Bridge    │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────┘
```

## 2. Data Flow and Transformation Pipelines

### 2.1 Ingestion Pipeline

```typescript
// Core Message Router
interface MessageRouter {
  route(message: DTCMessage): Promise<TransformedData>;
}

interface DTCMessage {
  type: 'h' | 'j' | 'bj'; // text | JSON | binary JSON
  symbol: string;
  exchange: string;
  timestamp: number;
  payload: Buffer | string;
  dataType: 'OHLC' | 'TICK' | 'DOM' | 'NEWS';
}

// Format-Specific Parsers
interface MessageParser {
  canHandle(message: DTCMessage): boolean;
  parse(message: DTCMessage): Promise<RawMarketData>;
}

class BinaryMessageParser implements MessageParser {
  canHandle(message: DTCMessage): boolean {
    return message.type === 'bj';
  }

  async parse(message: DTCMessage): Promise<RawMarketData> {
    // Binary parsing for maximum performance
    const buffer = message.payload as Buffer;
    const data = this.parseBinaryDTC(buffer);
    return {
      ...data,
      messageType: message.dataType,
      format: 'binary'
    };
  }
}
```

### 2.2 Transformation Pipeline

```typescript
// Unified Market Data Interface
interface MarketData {
  symbol: string;
  exchange: string;
  timestamp: number;
  dataType: 'OHLC' | 'TICK' | 'DOM' | 'NEWS';
  data: OHLCData | TickData | DOMData | NewsData;
  metadata: DataMetadata;
}

interface OHLCData {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  interval: number;
  isComplete: boolean;
}

interface TickData {
  price: number;
  size: number;
  bid?: number;
  ask?: number;
  bidSize?: number;
  askSize?: number;
  tradeId?: string;
}

interface DOMData {
  bids: [price: number, size: number][];
  asks: [price: number, size: number][];
  sequence: number;
}

// Transformation Engine
class TransformationEngine {
  private parsers: Map<string, MessageParser> = new Map();
  private processors: Map<string, DataProcessor> = new Map();
  private enrichers: DataEnricher[] = [];

  async transform(message: DTCMessage): Promise<TransformedData> {
    // 1. Parse based on format
    const parser = this.findParser(message);
    const rawData = await parser.parse(message);

    // 2. Validate
    await this.validate(rawData);

    // 3. Process based on data type
    const processor = this.processors.get(rawData.dataType);
    const processedData = await processor.process(rawData);

    // 4. Enrich
    const enrichedData = await this.enrich(processedData);

    // 5. Normalize
    return this.normalize(enrichedData);
  }
}
```

### 2.3 Format Converters

```typescript
// High-Performance Format Conversion
class FormatConverter {
  // Binary → TOON (Most Efficient)
  toToON(data: MarketData): string {
    const toonBuilder = new ToonBuilder();

    switch (data.dataType) {
      case 'OHLC':
        return toonBuilder.array('ohlc', [data.data])
          .columns('symbol,timeframe,open,high,low,close,volume')
          .row(data.symbol, data.metadata.interval,
               data.data.open, data.data.high, data.data.low,
               data.data.close, data.data.volume)
          .build();

      case 'TICK':
        return toonBuilder.array('ticks', [data.data])
          .columns('symbol,price,size,bid,ask')
          .row(data.symbol, data.data.price, data.data.size,
               data.data.bid, data.data.ask)
          .build();
    }
  }

  // TOON → JSON (For API consumers)
  toJSON(toonData: string): MarketData {
    return ToonParser.parse(toonData);
  }

  // Binary → JSON (For debugging/analysis)
  toJSONDirect(data: MarketData): object {
    return {
      symbol: data.symbol,
      timestamp: new Date(data.timestamp).toISOString(),
      type: data.dataType,
      payload: data.data
    };
  }
}
```

## 3. Caching Strategy

### 3.1 Multi-Level Cache Architecture

```typescript
// L0 Cache - In-Memory (Hot Data)
class L0Cache {
  private cache = new Map<string, CacheEntry>();
  private maxSize = 10000; // symbols
  private ttl = 5_000; // 5 seconds

  async get(key: string): Promise<MarketData | null> {
    const entry = this.cache.get(key);
    if (!entry || Date.now() > entry.expires) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  async set(key: string, data: MarketData): Promise<void> {
    if (this.cache.size >= this.maxSize) {
      // LRU eviction
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      expires: Date.now() + this.ttl
    });
  }
}

// L1 Cache - Redis (Warm Data)
class L1Cache {
  private redis: Redis;

  async getLatest(symbol: string, dataType: string): Promise<MarketData | null> {
    const key = `latest:${symbol}:${dataType}`;
    const data = await this.redis.get(key);
    return data ? JSON.parse(data) : null;
  }

  async getHistory(symbol: string, from: number, to: number): Promise<MarketData[]> {
    const key = `history:${symbol}:${from}:${to}`;
    const data = await this.redis.lrange(key, 0, -1);
    return data.map(item => JSON.parse(item));
  }

  async push(data: MarketData): Promise<void> {
    // Store latest
    const latestKey = `latest:${data.symbol}:${data.dataType}`;
    await this.redis.setex(latestKey, 300, JSON.stringify(data)); // 5min TTL

    // Store in time series
    const tsKey = `ts:${data.symbol}:${data.dataType}`;
    await this.redis.zadd(tsKey, data.timestamp, JSON.stringify(data));

    // Cleanup old data (keep 24h)
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    await this.redis.zremrangebyscore(tsKey, 0, cutoff);
  }
}

// L2 Cache - TimescaleDB (Cold/Historical Data)
class L2Cache {
  private pool: Pool;

  async storeBatch(data: MarketData[]): Promise<void> {
    const query = `
      INSERT INTO market_data (symbol, exchange, timestamp, data_type, data)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (symbol, timestamp, data_type) DO UPDATE
      SET data = EXCLUDED.data
    `;

    const values = data.map(d => [
      d.symbol,
      d.exchange,
      new Date(d.timestamp),
      d.dataType,
      JSON.stringify(d.data)
    ]);

    await this.pool.query(query, values.flat());
  }

  async queryRange(symbol: string, from: Date, to: Date): Promise<MarketData[]> {
    const query = `
      SELECT * FROM market_data
      WHERE symbol = $1
        AND timestamp BETWEEN $2 AND $3
      ORDER BY timestamp
    `;

    const result = await this.pool.query(query, [symbol, from, to]);
    return result.rows.map(row => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  }
}
```

### 3.2 Cache Key Strategy

```typescript
class CacheKeyBuilder {
  // Real-time data: rt:{symbol}:{type}
  // OHLC bars: ohlc:{symbol}:{interval}:{timestamp}
  // Tick data: tick:{symbol}:{batch}
  // DOM data: dom:{symbol}:{sequence}

  static realtime(symbol: string, type: string): string {
    return `rt:${symbol}:${type}`;
  }

  static ohlc(symbol: string, interval: number, timestamp: number): string {
    const bucket = Math.floor(timestamp / (interval * 60 * 1000));
    return `ohlc:${symbol}:${interval}:${bucket}`;
  }

  static tickBatch(symbol: string, timestamp: number): string {
    const bucket = Math.floor(timestamp / 1000); // 1-second buckets
    return `tick:${symbol}:${bucket}`;
  }
}
```

## 4. Error Handling and Recovery

### 4.1 Circuit Breaker Pattern

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private threshold = 5,
    private timeout = 60000,
    private monitor = new HealthMonitor()
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();

      if (this.state === 'HALF_OPEN') {
        this.state = 'CLOSED';
        this.failures = 0;
      }

      this.monitor.recordSuccess();
      return result;

    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.threshold) {
        this.state = 'OPEN';
        this.monitor.alert('Circuit breaker OPENED', {
          failures: this.failures,
          error: error.message
        });
      }

      this.monitor.recordFailure();
      throw error;
    }
  }
}
```

### 4.2 Message Replay and Recovery

```typescript
class MessageRecoveryService {
  private messageLog = new CircularBuffer<MessageLogEntry>(100000);
  private checkpointService: CheckpointService;

  async logMessage(message: DTCMessage): Promise<void> {
    const entry: MessageLogEntry = {
      id: generateId(),
      message,
      timestamp: Date.now(),
      processed: false
    };

    this.messageLog.push(entry);

    // Periodic checkpoint
    if (entry.id % 1000 === 0) {
      await this.checkpointService.save(entry);
    }
  }

  async recover(fromTimestamp?: number): Promise<void> {
    const messages = fromTimestamp
      ? this.messageLog.since(fromTimestamp)
      : this.messageLog.all();

    for (const entry of messages.filter(m => !m.processed)) {
      try {
        await this.processMessage(entry.message);
        entry.processed = true;
      } catch (error) {
        console.error(`Failed to replay message ${entry.id}:`, error);
      }
    }
  }
}
```

### 4.3 Graceful Degradation

```typescript
class DegradationManager {
  private healthChecks = new Map<string, HealthCheck>();

  async handleServiceFailure(service: string, error: Error): Promise<void> {
    const check = this.healthChecks.get(service);

    if (check && check.consecutiveFailures > 3) {
      // Fallback to alternative data source
      switch (service) {
        case 'sierra-chart-dtc':
          await this.switchToFileBasedData();
          break;
        case 'redis-cache':
          await this.switchToMemoryCache();
          break;
        case 'timescale-db':
          await this.switchToBufferedWrites();
          break;
      }
    }
  }

  private async switchToFileBasedData(): Promise<void> {
    console.log('Switching to file-based SierraChart data');
    const fileReader = new SierraChartFileReader();
    // Implement file-based reading logic
  }
}
```

## 5. Performance Optimization

### 5.1 Connection Pooling

```typescript
class DTCConnectionPool {
  private connections: DTCConnection[] = [];
  private readonly maxSize: number = 10;
  private readonly minSize: number = 2;

  constructor(private config: SierraChartConfig) {
    this.initializePool();
  }

  async acquire(): Promise<DTCConnection> {
    // Try to get existing connection
    const available = this.connections.find(c => c.isAvailable());
    if (available) {
      available.markInUse();
      return available;
    }

    // Create new connection if under limit
    if (this.connections.length < this.maxSize) {
      const conn = await this.createConnection();
      this.connections.push(conn);
      return conn;
    }

    // Wait for available connection
    return this.waitForAvailable();
  }

  private async createConnection(): Promise<DTCConnection> {
    const conn = new DTCConnection(this.config);
    await conn.connect();

    // Setup health monitoring
    conn.on('error', () => this.handleConnectionError(conn));
    conn.on('close', () => this.removeConnection(conn));

    return conn;
  }
}
```

### 5.2 Batch Processing

```typescript
class BatchProcessor {
  private batch = new Map<string, MarketData[]>();
  private readonly batchSize = 100;
  private readonly batchTimeout = 10; // ms

  async add(data: MarketData): Promise<void> {
    const key = `${data.symbol}:${data.dataType}`;

    if (!this.batch.has(key)) {
      this.batch.set(key, []);
      setTimeout(() => this.processBatch(key), this.batchTimeout);
    }

    const symbolBatch = this.batch.get(key)!;
    symbolBatch.push(data);

    if (symbolBatch.length >= this.batchSize) {
      await this.processBatch(key);
    }
  }

  private async processBatch(key: string): Promise<void> {
    const data = this.batch.get(key);
    if (!data || data.length === 0) return;

    this.batch.delete(key);

    // Process in parallel
    await Promise.all([
      this.cache.storeBatch(data),
      this.database.storeBatch(data),
      this.distributeBatch(data)
    ]);
  }
}
```

### 5.3 Memory Management

```typescript
class MemoryManager {
  private bufferPools = new Map<number, BufferPool>();

  getBuffer(size: number): Buffer {
    // Round up to nearest power of 2
    const poolSize = Math.pow(2, Math.ceil(Math.log2(size)));

    if (!this.bufferPools.has(poolSize)) {
      this.bufferPools.set(poolSize, new BufferPool(poolSize));
    }

    return this.bufferPools.get(poolSize)!.acquire();
  }

  releaseBuffer(buffer: Buffer): void {
    const poolSize = buffer.length;
    const pool = this.bufferPools.get(poolSize);

    if (pool) {
      buffer.fill(0); // Clear for security
      pool.release(buffer);
    }
  }
}

class BufferPool {
  private available: Buffer[] = [];
  private readonly maxSize = 100;

  constructor(private size: number) {}

  acquire(): Buffer {
    return this.available.pop() || Buffer.allocUnsafe(this.size);
  }

  release(buffer: Buffer): void {
    if (this.available.length < this.maxSize && buffer.length === this.size) {
      this.available.push(buffer);
    }
  }
}
```

## 6. Database Schema Considerations

### 6.1 TimescaleDB Tables

```sql
-- Market Data Hypertable
CREATE TABLE market_data (
    time TIMESTAMPTZ NOT NULL,
    symbol VARCHAR(50) NOT NULL,
    exchange VARCHAR(20) NOT NULL,
    data_type VARCHAR(20) NOT NULL,
    data JSONB NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Convert to hypertable
SELECT create_hypertable('market_data', 'time', 'symbol', 4);

-- Create continuous aggregates for different intervals
CREATE MATERIALIZED VIEW ohlc_1min
WITH (timescaledb.continuous) AS
SELECT
    time_bucket('1 minute', time) AS bucket,
    symbol,
    exchange,
    (data->>'open')::FLOAT as open,
    MAX((data->>'high')::FLOAT) as high,
    MIN((data->>'low')::FLOAT) as low,
    (data->>'close')::FLOAT as close,
    SUM((data->>'volume')::FLOAT) as volume
FROM market_data
WHERE data_type = 'OHLC'
GROUP BY bucket, symbol, exchange;

-- Add compression policy
ALTER TABLE market_data SET (
    timescaledb.compress,
    timescaledb.compress_segmentby = 'symbol',
    timescaledb.compress_orderby = 'time DESC'
);

-- Add data retention policy (keep 2 years)
SELECT add_retention_policy('market_data', INTERVAL '2 years');
```

### 6.2 Real-time Views

```sql
-- Latest tick data view
CREATE OR REPLACE VIEW latest_ticks AS
SELECT DISTINCT ON (symbol)
    symbol,
    exchange,
    time,
    data
FROM market_data
WHERE data_type = 'TICK'
ORDER BY symbol, time DESC;

-- OHLC aggregation view
CREATE OR REPLACE VIEW ohlc_summary AS
SELECT
    symbol,
    time_bucket('5 minutes', time) as interval,
    first(data, time) as open,
    MAX((data->>'high')::FLOAT) as high,
    MIN((data->>'low')::FLOAT) as low,
    last(data, time) as close,
    SUM((data->>'volume')::FLOAT) as volume
FROM market_data
WHERE data_type = 'OHLC'
GROUP BY symbol, interval
ORDER BY symbol, interval DESC;
```

### 6.3 Indexing Strategy

```sql
-- Composite indexes for common queries
CREATE INDEX idx_market_data_symbol_time_type
    ON market_data (symbol, time DESC, data_type);

-- GIN index for JSONB data
CREATE INDEX idx_market_data_gin
    ON market_data USING gin (data);

-- Partial indexes for active symbols
CREATE INDEX idx_market_data_active
    ON market_data (time DESC)
    WHERE time > NOW() - INTERVAL '1 day';

-- Hash index for symbol lookups
CREATE INDEX idx_market_data_symbol_hash
    ON market_data USING hash (symbol);
```

## 7. Implementation Roadmap

### Phase 1: Core Infrastructure (Weeks 1-2)
1. Message Router implementation
2. Basic format parsers (binary, JSON, TOON)
3. Connection pooling for DTC
4. L0 in-memory cache
5. Error handling foundation

### Phase 2: Data Processing (Weeks 3-4)
1. Transformation engine
2. Format converters
3. Data enrichment services
4. Validation framework
5. Batch processing system

### Phase 3: Caching & Storage (Weeks 5-6)
1. Redis L1 cache integration
2. TimescaleDB schema setup
3. Multi-level cache coordination
4. Continuous aggregates
5. Data compression

### Phase 4: Distribution (Weeks 7-8)
1. WebSocket gateway
2. Agent feed APIs
3. Discord bot integration
4. Real-time subscriptions
5. Load balancing

### Phase 5: Optimization & Monitoring (Weeks 9-10)
1. Performance tuning
2. Memory optimization
3. Health monitoring
4. Alerting system
5. Load testing

## 8. Monitoring and Metrics

### 8.1 Key Performance Indicators

```typescript
interface PerformanceMetrics {
  // Latency metrics
  avgTransformationTime: number; // ms
  p99TransformationTime: number; // ms
  endToEndLatency: number; // ms

  // Throughput metrics
  messagesPerSecond: number;
  symbolsPerSecond: number;
  dataVolumeMBps: number;

  // System health
  activeConnections: number;
  cacheHitRatio: number;
  queueDepth: number;
  errorRate: number;

  // Resource usage
  memoryUsageMB: number;
  cpuUsagePercent: number;
  diskIOOpsPerSecond: number;
}
```

### 8.2 Real-time Monitoring

```typescript
class MetricsCollector {
  private metrics = new Map<string, MetricValue>();
  private aggregations = new Map<string, Aggregation>();

  recordLatency(operation: string, duration: number): void {
    const key = `latency.${operation}`;
    this.updateMetric(key, duration);

    // Update aggregations
    if (!this.aggregations.has(key)) {
      this.aggregations.set(key, new Aggregation());
    }

    const agg = this.aggregations.get(key)!;
    agg.add(duration);
  }

  getMetrics(): PerformanceMetrics {
    return {
      avgTransformationTime: this.aggregations.get('latency.transformation')?.avg() || 0,
      p99TransformationTime: this.aggregations.get('latency.transformation')?.p99() || 0,
      endToEndLatency: this.aggregations.get('latency.endtoend')?.avg() || 0,
      messagesPerSecond: this.metrics.get('throughput.messages')?.rate() || 0,
      symbolsPerSecond: this.metrics.get('throughput.symbols')?.rate() || 0,
      dataVolumeMBps: this.metrics.get('throughput.volume')?.rate() / 1024 / 1024 || 0,
      activeConnections: this.metrics.get('connections.active')?.value() || 0,
      cacheHitRatio: this.metrics.get('cache.hits')?.ratio() || 0,
      queueDepth: this.metrics.get('queue.depth')?.value() || 0,
      errorRate: this.metrics.get('errors.count')?.rate() || 0,
      memoryUsageMB: process.memoryUsage().heapUsed / 1024 / 1024,
      cpuUsagePercent: process.cpuUsage().user / 1000000,
      diskIOOpsPerSecond: this.metrics.get('io.ops')?.rate() || 0
    };
  }
}
```

## 9. Security Considerations

1. **Authentication & Authorization**
   - OAuth 2.0 for API access
   - Role-based permissions for different data types
   - API key rotation policies

2. **Data Encryption**
   - TLS 1.3 for all network communications
   - At-rest encryption for sensitive data
   - Secure key management

3. **Rate Limiting**
   - Per-client rate limits
   - Symbol subscription limits
   - Burst capacity handling

4. **Audit Logging**
   - All data access logging
   - Modification tracking
   - Anomaly detection

## 10. Disaster Recovery

### 10.1 Backup Strategy

```typescript
class BackupService {
  async incrementalBackup(): Promise<void> {
    // 1. Snapshot current state
    const snapshot = await this.createSnapshot();

    // 2. Upload to cloud storage
    await this.uploadToCloud(snapshot);

    // 3. Update backup manifest
    await this.updateManifest(snapshot);
  }

  async restoreFromSnapshot(timestamp: number): Promise<void> {
    // 1. Download snapshot
    const snapshot = await this.downloadSnapshot(timestamp);

    // 2. Restore Redis cache
    await this.restoreCache(snapshot.cache);

    // 3. Restore database
    await this.restoreDatabase(snapshot.db);

    // 4. Replay missed messages
    await this.replayMessages(timestamp);
  }
}
```

### 10.2 High Availability

```typescript
class FailoverManager {
  private primaryNode: boolean;
  private backupNodes: string[] = [];

  async promoteToPrimary(): Promise<void> {
    // 1. Acquire distributed lock
    await this.acquireLeadership();

    // 2. Start accepting connections
    await this.startServices();

    // 3. Notify other nodes
    await this.notifyNodes('PRIMARY_PROMOTED');
  }

  async handlePrimaryFailure(): Promise<void> {
    // 1. Detect failure
    if (!await this.checkPrimaryHealth()) {
      // 2. Initiate election
      await this.initiateElection();

      // 3. Promote new primary
      if (await this.becomePrimary()) {
        await this.promoteToPrimary();
      }
    }
  }
}
```

## Conclusion

This architecture provides a robust, scalable foundation for handling SierraChart data transformation at scale. The multi-layered approach ensures:

- **Performance**: Sub-100ms transformation latency through optimized binary parsing and multi-level caching
- **Scalability**: Support for 1000+ symbols through horizontal scaling and efficient batching
- **Reliability**: 99.9% uptime through circuit breakers, graceful degradation, and comprehensive error handling
- **Flexibility**: Support for multiple data formats and easy extensibility for new requirements

The implementation should be done incrementally, starting with the core infrastructure and gradually adding features while maintaining stability throughout the process.