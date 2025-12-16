# Claude CLI Agents Commands - Financial Analyst Project

## 🎯 Agent Loading Commands

### 1. Load Single Agent File

**TOON Format Specialist:**
```bash
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/agents.json)" \
  --agent agent_TOON
```

**Financial Analysis Specialist:**
```bash
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/financial-agents.json)" \
  --agent financial-analyst
```

### 2. Load Multiple Agents at Once

**Load All Financial Agents:**
```bash
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/financial-agents.json)"
```

**Load TOON + Financial Agents:**
```bash
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/agents.json) $(cat .claude/agents/financial-agents.json)"
```

## 🤖 Available Agents

### TOON Format Specialist (`agent_TOON`)
- **Purpose**: Convert JSON/YAML/CSV to Toon format for token optimization
- **Savings**: 30-60% token reduction
- **Use Case**: Optimizing prompts for LLM efficiency
- **Model**: Sonnet

### Financial Analyst (`financial-analyst`)
- **Purpose**: ES futures trading analysis with AI
- **Expertise**: Market sentiment, data analysis, KiloCode integration
- **Use Case**: Trading signals, risk management, market analysis
- **Model**: Sonnet

### Discord Bot Developer (`discord-bot-developer`)
- **Purpose**: Discord.js development for trading bots
- **Expertise**: KiloCode integration, file uploads, interactive UI
- **Use Case**: Bot development, command handling, message formatting
- **Model**: Sonnet

### SierraChart Expert (`sierra-chart-expert`)
- **Purpose**: SierraChart DTC protocol integration
- **Expertise**: Real-time market data, CME/Crypto data consumption
- **Use Case**: Market data integration, connection management
- **Model**: Sonnet

### Database Architect (`database-architect`)
- **Purpose**: PostgreSQL for financial systems
- **Expertise**: Schema design, query optimization, data integrity
- **Use Case**: Database architecture, performance tuning
- **Model**: Opus

## 🚀 Quick Start Commands

### For Financial Analysis
```bash
# Launch with Financial Analyst agent
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/financial-agents.json)" \
  --agent financial-analyst
```

### For Bot Development
```bash
# Launch with Discord Bot Developer agent
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/financial-agents.json)" \
  --agent discord-bot-developer
```

### For Database Work
```bash
# Launch with Database Architect agent
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/financial-agents.json)" \
  --agent database-architect
```

### For TOON Optimization
```bash
# Launch with TOON agent
claude \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  --agents "$(cat .claude/agents/agents.json)" \
  --agent agent_TOON
```

## 📝 Agent Configuration Files

### Location
- **TOON Agent**: `.claude/agents/agents.json`
- **Financial Agents**: `.claude/agents/financial-agents.json`

### Adding New Agents

1. Create or edit agent JSON file:
```json
{
  "your-agent-name": {
    "description": "Brief description of agent purpose",
    "prompt": "Detailed system prompt defining agent behavior and expertise",
    "model": "sonnet" // or "opus", "haiku"
  }
}
```

2. Load with command:
```bash
claude --agents "$(cat .claude/agents/your-file.json)" --agent your-agent-name
```

## 💡 Usage Examples

### Example 1: Market Analysis Session
```bash
claude \
  --agents "$(cat .claude/agents/financial-agents.json)" \
  --agent financial-analyst \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  --add-dir "C:\Users\Deamon\Desktop\Backup\financial analyst" \
  -p "Analyze current ES futures sentiment based on recent news"
```

### Example 2: Bot Debugging Session
```bash
claude \
  --agents "$(cat .claude/agents/financial-agents.json)" \
  --agent discord-bot-developer \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsZ.json" \
  -p "Debug the KiloCode command handler in sniper_financial_bot.ts"
```

### Example 3: Database Optimization
```bash
claude \
  --agents "$(cat .claude/agents/financial-agents.json)" \
  --agent database-architect \
  --dangerously-skip-permissions \
  --settings "C:\Users\Deamon\Desktop\Backup\financial analyst\.claude\settingsM.json" \
  -p "Optimize queries for sentiment_analyses table"
```

## 🔄 Session Management

### Resume Agent Session
```bash
# Find session ID from previous output
claude --resume <session-id> --dangerously-skip-permissions
```

### Continue Last Agent Session
```bash
claude -c --dangerously-skip-permissions
```

## ⚡ Performance Tips

1. **Use Z settings for quick tasks**: Faster response time
2. **Use M settings for complex analysis**: More context capacity
3. **Choose appropriate model**:
   - `sonnet` for balanced speed/quality
   - `opus` for complex reasoning
4. **Non-interactive mode**: Add `-p "your prompt"` for automated tasks

## 🛠️ Troubleshooting

### Agent Not Loading
- Verify JSON syntax in agent file
- Check file path is correct
- Ensure `--agent` name matches JSON key

### Permission Issues
- Always include `--dangerously-skip-permissions` for full access
- Use `--add-dir` for project directory access

### Settings Issues
- Verify settings file path exists
- Use settingsM.json for full capabilities
- Use settingsZ.json for minimal setup