# KiloCode Mode Change: Ask → Code

## Overview
Changed KiloCode mode from `ask` to `code` for better code generation, modification, and refactoring capabilities.

## Change Summary
All KiloCode invocations now use `-m code` instead of `-m ask`.

### Updated Locations

#### 1. Persistent Mode (startPersistentKilo)
**File**: `src/backend/agents/DiscordChatBotAgent.ts`
**Line**: 274

**Before**:
```typescript
this.kiloProcess = spawn(kilocodePath, ['-m', 'ask', '--auto', '--json'], {
```

**After**:
```typescript
this.kiloProcess = spawn(kilocodePath, ['-m', 'code', '--auto', '--json'], {
```

#### 2. Classic Mode (executeWithFileRobust)
**File**: `src/backend/agents/DiscordChatBotAgent.ts`
**Line**: 681

**Before**:
```typescript
const { stdout } = await execWithInput(`${kilocodePath} -m ask --auto --json`, promptContent, {
```

**After**:
```typescript
const { stdout } = await execWithInput(`${kilocodePath} -m code --auto --json`, promptContent, {
```

#### 3. Logging Mode (executeWithFileRobustWithLogging)
**File**: `src/backend/agents/DiscordChatBotAgent.ts`
**Line**: 723

**Before**:
```typescript
const { stdout, stderr } = await execWithInput(`${kilocodePath} -m ask --auto --json 2>&1`, promptContent, {
```

**After**:
```typescript
const { stdout, stderr } = await execWithInput(`${kilocodePath} -m code --auto --json 2>&1`, promptContent, {
```

## KiloCode Modes Comparison

### Ask Mode (Previous)
- **Purpose**: Get answers and explanations
- **Best for**: Q&A, explanations, general assistance
- **Code quality**: Adequate but not specialized

### Code Mode (Current)
- **Purpose**: Write, modify, and refactor code
- **Best for**:
  - Code generation
  - Code modifications
  - Code refactoring
  - Bug fixes
  - Code reviews
  - Technical implementations

## Benefits of Code Mode

1. **Specialized for Code**: Optimized specifically for code-related tasks
2. **Better Code Generation**: Produces more accurate and complete code
3. **Refactoring Capabilities**: Excellent at improving existing code
4. **Technical Accuracy**: More precise with programming concepts
5. **Structure Awareness**: Better understanding of code architecture

## Command Line Usage

The bot now uses:
```bash
kilocode -m code --auto --json
```

Instead of:
```bash
kilocode -m ask --auto --json
```

## Testing

Build and start the bot:
```bash
npm run build
pnpm bot
```

Expected log output:
```
[sniper] 🚀 Initialisation KiloCode persistant...
[discord-chatbot] 🚀 Démarrage KiloCode en mode persistant...
[discord-chatbot] Using KiloCode path: C:\Users\Deamon\AppData\Roaming\npm\kilocode.cmd
[discord-chatbot] ✅ KiloCode prêt en mode persistant
```

## Other Available Modes

If you want to switch to another mode in the future:

1. **Architect** (`-m architect`): Plan and design before implementation
2. **Debug** (`-m debug`): Diagnose and fix software issues
3. **Orchestrator** (`-m orchestrator`): Coordinate tasks across multiple modes

## Backward Compatibility

This change is backward compatible with the existing code structure. All functionality remains the same, but with improved code-specific capabilities.

## Files Modified

- `src/backend/agents/DiscordChatBotAgent.ts` - 3 locations updated
- Build: ✅ Successful compilation

## Summary

The bot now uses KiloCode's **Code mode** instead of **Ask mode**, providing better code generation, modification, and refactoring capabilities for Discord interactions.
