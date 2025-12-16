# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Financial Analyst** - ES Futures Trading System with AI-powered market sentiment analysis, Discord bot integration, and real-time data processing. The system combines multiple data sources (news, market data) with KiloCode AI for financial analysis.

### Key Technologies
- **TypeScript** (ES2022 modules)
- **PostgreSQL** (primary database)
- **Discord.js** (Discord bot integration)
- **KiloCode CLI** (AI model: x-ai/grok-code-fast-1)
- **Playwright** (web scraping with stealth mode)
- **SierraChart** (professional trading data)

---

## Common Commands

### Build & Compilation
```bash
# Build the entire project (TypeScript + fix imports)
npm run build

# Development mode (watch mode with nodemon)
npm run dev
```

### Bot Operations
```bash
# Launch main Discord bot (Nova Financial Bot)
npm run bot

# Launch simple bot version (direct launch)
npm run bot:simple

# Launch enhanced bot with advanced features
npm run bot:enhanced

# Bot publication pipeline
npm run bot:publish

# Bot setup (new channels)
npm run bot:setup

# Welcome system initialization
npm run bot:welcome

# Clean KiloCode cache (remove persistent sessions)
npm run bot:clean
```

**Note on Bot Architecture:**
- The bot uses **persistent KiloCode sessions** to avoid resending the ~2000 character system prompt on each message
- This provides significant performance improvements and maintains conversation context
- A single KiloCode process is maintained throughout the bot lifecycle

### CLI Operations (run.ts)
```bash
# Run market sentiment analysis
npm run analyze

# Show system status
npm run status

# Refresh data from sources
npm run refresh

# Display help
npm run help
```

### Testing & Quality
```bash
# Run all tests
npm test

# Run linter
npm run lint

# Fix linting issues
npm run lint:fix

# Format code
npm run format

# Check formatting
npm run format:check
```

### Data & Scraping
```bash
# Test scrapers
npm run scraper:test

# Ingest OPML feeds
npm run ingest:opml
```

### Development Utilities
```bash
# Test specific scrapers
ts-node --esm src/backend/scripts/test_scrapers.ts

# Run specific agent tests
ts-node --esm src/backend/scripts/test_sentiment_simple.ts

# Database analysis
ts-node --esm src/backend/scripts/database_analysis.ts

# Debug Rouge Pulse agent
ts-node --esm src/backend/scripts/debug_rouge_pulse.ts
```

---

## Project Architecture

### Design Philosophy

The system follows a **data-centric architecture** with PostgreSQL as the source of truth:

- **AI Brain**: KiloCode CLI with model `x-ai/grok-code-fast-1`
- **Data Layer**: PostgreSQL for persistence and caching (2-hour TTL)
- **Orchestration**: TypeScript CLI (`run.ts`)
- **Format Optimization**: TOON (Token-Oriented Object Notation) to reduce token usage
- **No Fallback Policy**: Robust analysis that fails cleanly rather than returning simulated data

### Directory Structure

```
/financial-analyst
├── src/
│   ├── backend/               # Backend business logic
│   │   ├── agents/            # AI agents for analysis
│   │   │   ├── Vortex500Agent.ts      # Main sentiment analysis agent
│   │   │   ├── RougePulseAgent.ts     # Enhanced sentiment with alerts
│   │   │   ├── NewsFilterAgent.ts     # News filtering & processing
│   │   │   ├── SentimentOexAgent.ts   # OEX-specific sentiment
│   │   │   ├── DiscordChatBotAgent.ts # Discord chat handling
│   │   │   └── CalendarPublisher.ts   # Calendar integration
│   │   │
│   │   ├── database/          # Database layer
│   │   │   ├── NewsDatabaseService.ts     # Main DB service (PostgreSQL)
│   │   │   ├── NewsValidationService.ts   # Data validation
│   │   │   ├── DataMaintenanceService.ts  # DB maintenance
│   │   │   └── RougePulseDatabaseService.ts
│   │   │
│   │   ├── ingestion/         # Data collection
│   │   │   ├── NewsAggregator.ts    # Multi-source news scraper
│   │   │   ├── FinnhubClient.ts     # Financial data API
│   │   │   ├── FredClient.ts        # Federal Reserve data
│   │   │   ├── TradingEconomicsScraper.ts
│   │   │   ├── BlsScraper.ts        # Bureau of Labor Statistics
│   │   │   └── CboeScraper.ts       # Chicago Board Options Exchange
│   │   │
│   │   ├── sierrachart/       # SierraChart integration
│   │   │   ├── SierraChartDataConsumer.ts
│   │   │   ├── CMEDataConsumer.ts    # CME Group data
│   │   │   ├── CryptoDataConsumer.ts
│   │   │   └── MarketDataManager.ts
│   │   │
│   │   └── scripts/           # Utility scripts
│   │       ├── database_analysis.ts
│   │       ├── debug_rouge_pulse.ts
│   │       └── test_*.ts           # Various test scripts
│   │
│   ├── discord_bot/           # Discord bot components
│   │   ├── sniper_financial_bot.ts      # Main bot (Nova)
│   │   ├── SimplePublisherOptimized.ts  # Publishing pipeline
│   │   ├── CodeFileManager.ts          # Code block handling
│   │   ├── CodeFormatter.ts            # Code formatting & detection
│   │   ├── KiloCodeCommandHandler.ts   # KiloCode CLI integration
│   │   ├── DiscordInteractionHandler.ts
│   │   ├── DiscordPollManager.ts       # Interactive polls
│   │   ├── RoleManager.ts              # Role management
│   │   ├── WelcomeSystem.ts            # User onboarding
│   │   └── news_es_publisher.ts        # ES news publisher
│   │
│   └── x_scraper/             # X (Twitter) integration
│       ├── XNewsScraper.ts
│       ├── XFeedParser.ts
│       ├── NitterManager.ts
│       └── XScraperService.ts
│
├── dist/                      # Compiled JavaScript output
├── docs/                      # Documentation
├── scripts/                   # Root-level scripts
└── run.ts                     # Main CLI entry point
```

---

## Core Components

### 1. Sentiment Analysis Pipeline (Vortex500Agent/RougePulseAgent)

**Primary flow:**
1. **Data Retrieval**: Fetch news from last 48h (or 7 days if needed) from PostgreSQL cache
2. **Format**: Convert to TOON format (`ToonFormatter`) for token optimization (~60% reduction)
3. **AI Analysis**: Send prompt to KiloCode CLI (x-ai/grok-code-fast-1, 60s timeout)
4. **Storage**: Save results to PostgreSQL (`sentiment_analyses` table)
5. **Output**: Display formatted results

**Key agents:**
- **`Vortex500Agent.ts`** - Main production agent (database-only mode, robust)
- **`RougePulseAgent.ts`** - Enhanced version with real-time alerts and threshold monitoring
- **`BaseAgentSimple.ts`** - Base class for all agents

**Key supporting files:**
- `src/backend/data/NewsDataManager.ts` - Data orchestration
- `src/backend/data/NewsDeduplicationService.ts` - Prevent duplicate news (hash-based)
- `src/backend/utils/ToonFormatter.ts` - TOON format conversion for token optimization

**Data Sources:**
The system aggregates from multiple sources via `NewsAggregator`:
- **ZeroHedge** (alternative news)
- **CNBC** (mainstream financial)
- **FinancialJuice** (professional trading)
- **FRED** (Federal Reserve Economic Data)
- **Finnhub** (financial APIs)
- **BLS** (Bureau of Labor Statistics)
- **CBOE** (options data)
- **TradingEconomics** (economic indicators)

### 2. Discord Bot (Nova Financial Bot)

**Main entry point:** `src/discord_bot/sniper_financial_bot.ts`

**Core features:**
- **Persistent KiloCode Sessions**: Maintains single KiloCode process with conversation context
  - Saves ~2000 characters per message by avoiding system prompt resend
  - Process lifecycle management with health checks
  - Clean shutdown handling with SIGTERM
- **KiloCode Integration**: Execute CLI commands directly in Discord
- **Code Block Detection**: Automatically detect and format code blocks with language detection
- **File Uploads**: Generate downloadable files from code snippets (with proper extensions)
- **Interactive Polls**: Market sentiment polls with Discord UI components
- **Role Management**: User roles and permissions system
- **Welcome System**: New user onboarding with automated setup

**Key modules:**
- `KiloCodeCommandHandler.ts` - Handles `/profile`, `/new` commands
- `PersistentSessionManager.ts` - Manages KiloCode persistent sessions
- `CodeFormatter.ts` - Detects and formats code blocks
- `DiscordPollManager.ts` - Interactive UI components (buttons, modals)
- `RoleManager.ts` - User permissions and roles
- `WelcomeSystem.ts` - New user onboarding

**Key commands:**
- `/profile` - Display KiloCode profile and session info
- `/new` - Start new task with clean state
- `!analyze` - Run market sentiment analysis
- `!status` - Show database status
- `!publish` - Trigger publication pipeline

**Bot Process Management:**
- Uses PID file (`sniper_bot.pid`) to ensure single instance
- Automatically kills previous instance if found
- Proper cleanup on shutdown

### 3. Database Layer

**Main service:** `src/backend/database/NewsDatabaseService.ts`

**Tables:**
- `news_items` - Raw news data with deduplication (hash-based)
- `sentiment_analyses` - Complete analysis history
- `news_sources` - Source health monitoring
- `rouge_pulse_alerts` - Alert history
- `user_reputation_data` - User tracking

**Features:**
- Intelligent caching (2-hour TTL)
- Connection pooling
- Data validation (`NewsValidationService`)
- Automatic maintenance (`DataMaintenanceService`)

### 4. Data Ingestion (NewsAggregator)

**Sources:**
- **ZeroHedge** - Alternative news
- **CNBC** - Mainstream financial news
- **FinancialJuice** - Professional trading news
- **FRED** - Federal Reserve Economic Data
- **Finnhub** - Financial APIs
- **BLS** - Bureau of Labor Statistics
- **CBOE** - Options data
- **TradingEconomics** - Economic indicators

**Technology:**
- Playwright with stealth mode
- Anti-detection scripts
- Parallel scraping
- Error handling & fallbacks

### 5. SierraChart Integration

**Location:** `src/backend/sierrachart/`

**Capabilities:**
- Real-time market data consumption
- CME Group futures data
- Cryptocurrency data
- Historical data retrieval
- DTC (Data Trading Channel) protocol

**Files:**
- `SierraChartDataConsumer.ts` - Main consumer
- `CMEDataConsumer.ts` - CME-specific handler
- `CryptoDataConsumer.ts` - Crypto market data
- `MarketDataManager.ts` - Orchestration

---

## Configuration

### Environment Variables (.env)
```bash
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/financial_analyst

# Discord
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id

# KiloCode
KILOCODE_API_KEY=your_api_key

# SierraChart
SIERRACHART_HOST=localhost
SIERRACHART_PORT=36949

# News APIs
FINNHUB_API_KEY=your_finnhub_key
FRED_API_KEY=your_fred_key
```

### PostgreSQL Schema

Main tables created via `src/backend/database/schema_simplified.sql`:
- News items storage with automatic deduplication
- Sentiment analysis history
- Source monitoring and health checks
- User data and reputation tracking

### SierraChart Configuration

**Requirements:**
- SierraChart installed and running
- DTC connection enabled (default port 36949)
- Market data subscriptions configured
- See `docs/SIERRACHART_DATA_CONSUMPTION.md` for details

---

## Development Workflows

### Creating a New Agent

Follow the pattern in `docs/AGENT_CREATION_GUIDE.md`:

1. **Scraper** (`src/backend/ingestion/MyAgentScraper.ts`)
   - Extend with Playwright for web scraping
   - Implement `init()` and `scrapeAll()` methods
   - Add anti-detection measures

2. **Database** (if needed)
   - Add tables to schema
   - Implement save methods in service

3. **Agent** (`src/backend/agents/MyAgent.ts`)
   - Extend `BaseAgentSimple` or follow existing pattern
   - Implement data retrieval, AI prompt building, result parsing
   - Add to `run.ts` CLI

4. **Integration**
   - Add to package.json scripts (optional)
   - Update documentation

### Adding New Data Sources

1. Create scraper in `src/backend/ingestion/`
2. Add to `NewsAggregator.ts` list
3. Test with `npm run scraper:test`
4. Verify database persistence

### Modifying Discord Bot

**Main file:** `src/discord_bot/sniper_financial_bot.ts`

**Key modules:**
- `KiloCodeCommandHandler.ts` - Handle `/profile`, `/new` commands
- `CodeFormatter.ts` - Detect and format code blocks
- `DiscordPollManager.ts` - Interactive UI components
- `RoleManager.ts` - User permissions

### Database Operations

```bash
# Analyze database
ts-node --esm src/backend/scripts/database_analysis.ts

# Run maintenance (cleanup old records)
ts-node --esm src/backend/scripts/db_cleanup.ts

# Validate data quality
ts-node --esm src/backend/scripts/validate_data_quality.ts

# Check specific table
ts-node --esm src/backend/scripts/describe_table.ts table_name

# Quick database check
ts-node --esm src/backend/scripts/quick_db_analysis.ts

# Verify database integrity
ts-node --esm src/backend/scripts/verify_db_integrity.ts
```

### Common Development Patterns

**Creating a New Agent:**
1. Extend `BaseAgentSimple` class
2. Implement data retrieval from PostgreSQL (database-only mode)
3. Use `ToonFormatter` for AI input optimization
4. Integrate with KiloCode CLI for analysis
5. Save results via `NewsDatabaseService.saveSentimentAnalysis()`
6. Add CLI entry in `run.ts` if needed

**Adding New Data Source:**
1. Create scraper in `src/backend/ingestion/` using Playwright with stealth mode
2. Add anti-detection measures (user agents, delays, etc.)
3. Add to `NewsAggregator.ts` sources list
4. Implement deduplication (hash-based)
5. Test with `npm run scraper:test`
6. Verify database persistence

**Modifying Discord Bot:**
- Main file: `src/discord_bot/sniper_financial_bot.ts`
- Persistent session: `PersistentSessionManager.ts`
- Command handling: `KiloCodeCommandHandler.ts`
- File uploads: `CodeFileManager.ts` + `DiscordFileUploader.ts`
- Always test with `npm run bot:simple` for debugging

---

## Testing

### Test Structure
- **Unit tests**: Jest in `src/**/*.test.ts`
- **Integration tests**: Standalone scripts in `src/backend/scripts/test_*.ts`
- **Manual tests**: Run specific components via CLI

### Common Test Commands
```bash
# Test sentiment agent
ts-node --esm src/backend/scripts/test_sentiment_simple.ts

# Test Discord parsing
ts-node --esm src/backend/scripts/test_discord_formatting.ts

# Test news aggregation
ts-node --esm src/backend/scripts/test_news_aggregator.ts

# Test scrapers
ts-node --esm src/backend/scripts/test_scrapers.ts

# Test all validators
ts-node --esm src/backend/scripts/run_validation_tests.ts
```

---

## Key Configuration Files

- **TypeScript**: `tsconfig.json` - ES2022 modules, strict mode
- **ESLint**: `.eslintrc.js` - Code quality rules
- **Jest**: `jest.config.js` - Testing configuration
- **Prettier**: `.prettierrc` - Code formatting

---

## Important Notes

### Database Caching Strategy
- **Cache TTL**: 2 hours for news data
- **Force Refresh**: Use `--force` flag in `run.ts` to bypass cache
- **Cache Freshness**: Checked via `NewsDatabaseService.isCacheFresh()`
- **Fallback Strategy**: If no data in 48h, extends to 7 days, then all available data
- **Deduplication**: Hash-based to prevent duplicate news items

### KiloCode Integration
- **Model**: `x-ai/grok-code-fast-1` (configured via KiloCode CLI)
- **Response Format**: Must be valid JSON (validated with Zod schema)
- **Timeout**: 60 seconds for analysis requests
- **Buffer Limit**: 10MB for responses
- **Persistent Mode**: Single process maintained for performance (see KILOCODE_PERSISTENT_MODE.md)
- **Prompt Optimization**: TOON format reduces tokens by ~60%

### TOON Format (Token-Oriented Object Notation)
- Custom format to optimize token usage for AI models
- Converts JSON to compact, token-efficient representation
- Implemented in `src/backend/utils/ToonFormatter.ts`
- Critical for managing context window with large news datasets

### Discord Bot Features
- **Code Block Detection**: Automatic detection of markdown code blocks
- **File Uploads**: Generate temporary files with correct extensions
- **Interactive Elements**: Buttons, modals, polls
- **Persistent Sessions**: KiloCode mode with conversation history
- **Error Handling**: Graceful fallbacks, no crashes

### SierraChart Requirements
- Windows Server recommended for production
- DTC connection must be configured
- Market data subscriptions required
- See `docs/WINDOWS_SERVER_SIERRA_CHART.md` for setup

---

## Troubleshooting

### Database Connection Issues
```bash
# Check connection
npm run status

# Validate database
ts-node --esm src/backend/scripts/verify_db_integrity.ts
```

### Bot Not Responding
```bash
# Check bot logs
# Restart bot
npm run bot

# Clean KiloCode cache
npm run bot:clean
```

### Scraping Failures
```bash
# Test individual scrapers
ts-node --esm src/backend/scripts/test_isolated_sources.ts

# Check source health
npm run status
```

### KiloCode Errors
- Verify KiloCode CLI is installed and in PATH
- Check API key configuration
- Review timeout settings (60s default)
- Monitor buffer size (10MB limit)

---

## Documentation

Key documentation files in `/docs`:

### Architecture & Design
- **ARCHITECTURE.md** - Detailed data-centric architecture with PostgreSQL
- **ROUGE_PULSE_DETAILED.md** - RougePulse agent with alerts and thresholds
- **TOON_FORMAT.md** - TOON format for token optimization

### KiloCode Integration
- **KILOCODE_PERSISTENT_MODE.md** - Persistent session mode (performance critical)
- **discord-kilocode-commands.md** - Discord bot commands and features

### Market Data Integration
- **SIERRACHART_DATA_CONSUMPTION.md** - SierraChart DTC integration
- **CME_DATA_CONSUMPTION.md** - CME Group futures data
- **CRYPTO_DATA_CONSUMPTION.md** - Cryptocurrency market data
- **SIERRA_CHART_CONFIG.md** - SierraChart configuration guide
- **WINDOWS_SERVER_SIERRA_CHART.md** - Production setup on Windows Server

### Database & Operations
- **DATABASE_CACHE_SYSTEM.md** - Caching strategy and TTL
- **DATABASE_GLOSSARY** - Database schema documentation
- **commandes_pg_sql.md** - Common PostgreSQL commands

### Development
- **SENTIMENT_AGENT.md** - Sentiment analysis implementation
- **COMPLETE_CME_SYMBOLS** - CME symbols reference

### Additional Resources in Root
- **RAPPORT_*.md** - Various implementation reports
- **corrections_*.md** - Bug fixes and improvements
- **pipeline_*.md** - Pipeline optimization guides

---

## Performance Considerations

1. **Database**: Use connection pooling, index frequently queried columns
2. **Scraping**: Parallel execution, respect rate limits
3. **AI Calls**: Cache results, optimize TOON format to reduce tokens
4. **Discord**: Rate limiting, batch message sending
5. **SierraChart**: Monitor DTC connection health, handle reconnections

---

## Security Notes

- Never commit `.env` files with real credentials
- Use environment variables for all sensitive data
- Discord bot token should have minimal required permissions
- KiloCode API keys should be rotated regularly
- Database connections should use SSL in production

