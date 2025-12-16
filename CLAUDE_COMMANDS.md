# Claude CLI Commands - Financial Analyst Project

## Quick Start Commands

### 1. Claude with Custom Settings

**With Z-Preset Settings (Minimal):**
```bash
claude --dangerously-skip-permissions --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json"
```

**With M-Preset Settings (Medium):**
```bash
claude --dangerously-skip-permissions --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json"
```

### 2. Claude with Settings + Project Directory Access

**Z-Preset + Full Project Access:**
```bash
claude --dangerously-skip-permissions --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json" --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst"
```

**M-Preset + Full Project Access:**
```bash
claude --dangerously-skip-permissions --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst"
```

## Custom Agents Configuration

### Using Custom Agents

You can define custom agents inline with the `--agents` flag:

```bash
claude --agents '{
  "financial-analyst": {
    "description": "Specialized financial market analyst",
    "prompt": "You are an expert financial analyst specializing in ES futures trading, sentiment analysis, and market data interpretation. Focus on actionable trading insights and risk management.",
    "model": "sonnet"
  },
  "code-reviewer": {
    "description": "Reviews TypeScript/Node.js code for financial systems",
    "prompt": "You are a senior TypeScript developer reviewing financial trading systems. Focus on security, performance, and best practices for real-time data processing.",
    "model": "sonnet"
  },
  "trading-bot-debugger": {
    "description": "Debugs Discord trading bot issues",
    "prompt": "You are a Discord bot debugging specialist. Focus on integration issues, API connectivity, and error handling in trading bots.",
    "model": "opus"
  }
}' --agent financial-analyst --dangerously-skip-permissions
```

### Example: Financial Analysis with Custom Agent

```bash
claude \
  --agents '{
    "market-sentiment": {
      "description": "Analyzes market sentiment from news data",
      "prompt": "You are a market sentiment analyst specializing in ES futures. Analyze news sentiment, identify key market drivers, and provide trading signals based on sentiment analysis.",
      "model": "sonnet"
    }
  }' \
  --agent market-sentiment \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst"
```

## Advanced Configuration

### Session Persistence

**Continue Previous Session:**
```bash
claude -c --dangerously-skip-permissions --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json"
```

**Resume Specific Session:**
```bash
claude --resume session-id-here --dangerously-skip-permissions
```

### Model Selection

**Force Specific Model:**
```bash
claude --model sonnet --dangerously-skip-permissions --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json"
```

**With Fallback Model:**
```bash
claude --model opus --fallback-model sonnet --dangerously-skip-permissions
```

### Debug Mode

**Enable Full Debug:**
```bash
claude --debug --dangerously-skip-permissions --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json"
```

**Filtered Debug (API and MCP only):**
```bash
claude --debug "api,mcp" --dangerously-skip-permissions
```

## Project-Specific Commands

### Bot Development Sessions

**For Discord Bot Development:**
```bash
claude \
  --agents '{
    "discord-dev": {
      "description": "Discord.js development specialist",
      "prompt": "You are a Discord.js expert specializing in financial trading bots. Focus on command handling, message formatting, KiloCode integration, and real-time data processing.",
      "model": "sonnet"
    }
  }' \
  --agent discord-dev \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst"
```

**For Database Analysis:**
```bash
claude \
  --agents '{
    "db-analyst": {
      "description": "PostgreSQL database analyst",
      "prompt": "You are a PostgreSQL database expert specializing in financial data analysis. Focus on query optimization, schema design for time-series data, and sentiment analysis data storage.",
      "model": "opus"
    }
  }' \
  --agent db-analyst \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json"
```

### Market Data Sessions

**SierraChart Integration:**
```bash
claude \
  --agents '{
    "sierra-expert": {
      "description": "SierraChart DTC protocol specialist",
      "prompt": "You are a SierraChart integration expert. Focus on DTC protocol, real-time market data consumption, CME data handling, and trading system integration.",
      "model": "sonnet"
    }
  }' \
  --agent sierra-expert \
  --dangerously-skip-permissions \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst\src\backend\sierrachart"
```

**News Scraping & Analysis:**
```bash
claude \
  --agents '{
    "news-analyst": {
      "description": "Financial news scraping and analysis specialist",
      "prompt": "You are an expert in financial news scraping and sentiment analysis. Focus on Playwright automation, anti-detection techniques, news deduplication, and market impact analysis.",
      "model": "opus"
    }
  }' \
  --agent news-analyst \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json"
```

## Batch Commands for Scripts

### Non-Interactive Mode (for automation)

**Single Command Analysis:**
```bash
claude -p "Analyze the Vortex500Agent code for performance issues" \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json"
```

**JSON Output for Processing:**
```bash
claude -p "Check database health" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"status":{"type":"string"},"issues":{"type":"array"}}}' \
  --dangerously-skip-permissions
```

## Quick Reference Summary

| Purpose | Command |
|---------|---------|
| **Quick Start (Z)** | `claude --dangerously-skip-permissions --settings "...\settingsZ.json"` |
| **Quick Start (M)** | `claude --dangerously-skip-permissions --settings "...\settingsM.json"` |
| **Full Access (Z)** | `claude --dangerously-skip-permissions --settings "...\settingsZ.json" --add-dir "...` |
| **Full Access (M)** | `claude --dangerously-skip-permissions --settings "...\settingsM.json" --add-dir "...` |
| **Custom Agent** | `claude --agents '{...}' --agent agent-name --dangerously-skip-permissions` |
| **Continue Session** | `claude -c --dangerously-skip-permissions` |
| **Debug Mode** | `claude --debug --dangerously-skip-permissions` |
| **Specific Model** | `claude --model sonnet --dangerously-skip-permissions` |

## Security Notes

- `--dangerously-skip-permissions` bypasses all permission checks
- Only use in trusted environments
- Consider using `--permission-mode acceptEdits` for less risky automation
- Always backup your `.env` and sensitive files before extensive modifications

## Settings Files Location

- **Z-Preset**: `C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json`
- **M-Preset**: `C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json`

Make sure these files exist and contain your preferred Claude configuration.