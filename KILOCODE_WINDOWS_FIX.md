# KiloCode Windows Execution Fix

## Problem
The bot was failing with `spawn EINVAL` error on Windows because:
1. The `kilocode` file is a Unix shell script (not compatible with Windows cmd)
2. The `.cmd` file is a Windows batch file that needs to be executed through `cmd.exe`
3. Direct spawning of `.cmd` files with Node.js arguments doesn't work

## Solution
Updated configuration to use `cmd.exe` to execute the KiloCode batch file properly.

### .env Configuration
```env
# KiloCode Configuration
KILOCODE_PATH=cmd.exe
KILOCODE_ARGS=/c,C:\Users\Deamon\AppData\Roaming\npm\kilocode.cmd
```

**Breakdown:**
- `KILOCODE_PATH`: The command to execute (`cmd.exe`)
- `KILOCODE_ARGS`: Arguments split by comma:
  - `/c`: Execute command and terminate (cmd.exe flag)
  - Full path to the KiloCode batch file

### DiscordChatBotAgent.ts Updates

All three KiloCode invocation locations were updated to support the new configuration:

#### 1. Persistent Mode (startPersistentKilo)
```typescript
const kilocodePath = process.env.KILOCODE_PATH || 'kilocode';
const kilocodeArgsEnv = process.env.KILOCODE_ARGS;
const kilocodeArgs = kilocodeArgsEnv
  ? kilocodeArgsEnv.split(',').concat(['-m', 'code', '--auto', '--json'])
  : ['-m', 'code', '--auto', '--json'];

this.kiloProcess = spawn(kilocodePath, kilocodeArgs, {
  cwd: process.cwd(),
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false
});
```

#### 2. Classic Mode (executeWithFileRobust)
```typescript
const kilocodePath = process.env.KILOCODE_PATH || 'kilocode';
const kilocodeArgsEnv = process.env.KILOCODE_ARGS;
const kilocodeArgs = kilocodeArgsEnv
  ? kilocodeArgsEnv.split(',').concat(['-m', 'code', '--auto', '--json'])
  : ['-m', 'code', '--auto', '--json'];
const fullCommand = `${kilocodePath} ${kilocodeArgs.join(' ')}`;

const { stdout } = await execWithInput(fullCommand, promptContent, {
```

#### 3. Logging Mode (executeWithFileRobustWithLogging)
```typescript
const kilocodePath = process.env.KILOCODE_PATH || 'kilocode';
const kilocodeArgsEnv = process.env.KILOCODE_ARGS;
const kilocodeArgs = kilocodeArgsEnv
  ? kilocodeArgsEnv.split(',').concat(['-m', 'code', '--auto', '--json'])
  : ['-m', 'code', '--auto', '--json'];
const fullCommand = `${kilocodePath} ${kilocodeArgs.join(' ')} 2>&1`;

const { stdout, stderr } = await execWithInput(fullCommand, promptContent, {
```

## Execution Flow

### Before (Failing)
```
Node.js spawn
  → Try to spawn "kilocode.cmd"
  → ❌ EINVAL error (can't spawn .cmd with args directly)
```

### After (Working)
```
Node.js spawn
  → Spawn "cmd.exe"
  → Pass args: ["/c", "C:\Users\Deamon\AppData\Roaming\npm\kilocode.cmd", "-m", "code", "--auto", "--json"]
  → cmd.exe executes the batch file
  → Batch file runs Node.js with KiloCode
  → ✅ Success
```

## Platform-Specific Configurations

### Windows (Current)
```env
KILOCODE_PATH=cmd.exe
KILOCODE_ARGS=/c,C:\Users\Deamon\AppData\Roaming\npm\kilocode.cmd
```

### macOS/Linux (Alternative)
```env
# Option 1: Use just the command name (if in PATH)
KILOCODE_PATH=kilocode

# Option 2: Use full path to executable
KILOCODE_PATH=/usr/local/bin/kilocode
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
[discord-chatbot] Using KiloCode path: cmd.exe
[discord-chatbot] Using KiloCode args: /c C:\Users\Deamon\AppData\Roaming\npm\kilocode.cmd -m code --auto --json
[discord-chatbot] ✅ KiloCode prêt en mode persistant
```

## Key Changes

1. **.env**: Added `KILOCODE_PATH` and `KILOCODE_ARGS` configuration
2. **DiscordChatBotAgent.ts**: Updated 3 spawn locations to handle command and args separately
3. **Mode**: Using Code mode (`-m code`) instead of Ask mode
4. **Platform**: Windows-specific execution through cmd.exe

## Benefits

✅ **Windows Compatibility**: Works on Windows through cmd.exe
✅ **Platform Agnostic**: Can be configured for any platform
✅ **Flexible**: Easy to change KiloCode location or execution method
✅ **Debug Info**: Logs show exact command and args being used
✅ **Mode Support**: Supports all KiloCode modes (ask, code, architect, debug, orchestrator)

## Files Modified

- `.env` - Added KiloCode configuration
- `src/backend/agents/DiscordChatBotAgent.ts` - Updated 3 spawn locations
- Build: ✅ Successful compilation

## Summary

The bot now properly executes KiloCode on Windows by using `cmd.exe` to run the batch file, solving the `spawn EINVAL` error and enabling persistent mode operation.
