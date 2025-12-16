# Persistent KiloCode Mode - Integration Summary

## Overview
The Discord bot has been successfully integrated with persistent KiloCode mode, where KiloCode is spawned once at bot startup, kept alive for all messages, and killed when the bot shuts down.

## Architecture

### Single DiscordChatBotAgent Instance
- **Before**: Two separate instances of `DiscordChatBotAgent` existed:
  1. Main bot's `this.discordAgent` - initialized with persistent mode
  2. SessionManager's `this.chatAgent` - NOT initialized with persistent mode

- **After**: Single shared instance:
  - Main bot creates the `DiscordChatBotAgent` instance
  - Passes it to `PersistentSessionManager` via constructor
  - Both main bot and sessionManager use the same instance

### Flow Diagram
```
Bot Startup
    ↓
1. Create DiscordChatBotAgent instance
    ↓
2. Pass instance to PersistentSessionManager constructor
    ↓
3. Call startPersistentKilo() on the instance
    ↓
4. Spawn KiloCode process with system prompt
    ↓
Message Received
    ↓
5. Send "[username] message" to KiloCode via stdin
    ↓
6. Parse response from stdout
    ↓
Bot Shutdown
    ↓
7. Call stopPersistentKilo() to kill process
```

## Key Changes

### 1. sniper_financial_bot.ts
**Constructor** (line 295):
```typescript
// Before
this.sessionManager = new PersistentSessionManager();

// After
this.sessionManager = new PersistentSessionManager(this.discordAgent);
```

**initializeBot()** (line 314):
```typescript
// Added: Start persistent KiloCode at bot startup
await this.discordAgent.startPersistentKilo();
```

**cleanup()** (line 4094):
```typescript
// Before
await this.kilocodeProcessManager.killKiloCodeProcess();

// After
await this.discordAgent.stopPersistentKilo();
```

**handleShutdown()** (line 4108):
```typescript
// Before
await this.kilocodeProcessManager.killKiloCodeProcess();

// After
await this.discordAgent.stopPersistentKilo();
```

### 2. PersistentSessionManager.ts
**Constructor** (line 26):
```typescript
// Before
constructor() {
  this.chatAgent = new DiscordChatBotAgent();
}

// After
constructor(chatAgent?: DiscordChatBotAgent) {
  this.chatAgent = chatAgent || new DiscordChatBotAgent();
}
```

**New Method** (line 34):
```typescript
setDiscordAgent(agent: DiscordChatBotAgent): void {
  this.chatAgent = agent;
}
```

## Benefits

1. **Efficiency**: System prompt sent only once at startup, not on every message
2. **Performance**: No process spawning overhead for each message
3. **Context Preservation**: KiloCode maintains conversation context throughout the session
4. **Resource Management**: Clean process lifecycle (start → keep alive → stop)
5. **Single Point of Control**: One KiloCode instance shared across all features

## Message Flow

### First Message
```
[username] message
```
- KiloCode receives full system prompt + user message
- `isFirstMessage = true` flag triggers full prompt

### Subsequent Messages
```
[username] message
```
- KiloCode receives only the user message
- `isFirstMessage = false` flag triggers short prompt
- Maintains context from previous messages

## Shutdown Handling

The bot properly handles KiloCode cleanup on:
- SIGINT (Ctrl+C)
- SIGTERM (process termination)
- SIGQUIT
- Manual bot shutdown

All shutdown paths call `handleShutdown()` which calls `stopPersistentKilo()`.

## Testing

To verify the integration:

1. **Start the bot**: Check logs for "Initialisation KiloCode persistant..."
2. **Send a message**: Should use persistent mode (check for "persistent" in logs)
3. **Send multiple messages**: Each should use the same KiloCode process
4. **Stop the bot**: Should see "Arrêt propre du bot terminé"

## Files Modified

- `src/discord_bot/sniper_financial_bot.ts` - Main bot integration
- `src/discord_bot/PersistentSessionManager.ts` - Shared agent instance
- `src/backend/agents/DiscordChatBotAgent.ts` - Persistent mode methods (previously implemented)

## Backward Compatibility

The integration maintains backward compatibility:
- Constructor parameter is optional
- `setDiscordAgent()` allows runtime agent assignment
- All existing functionality preserved
- No breaking changes to public APIs
