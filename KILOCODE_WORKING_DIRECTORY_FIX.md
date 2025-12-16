# KiloCode Working Directory Fix

## Problem

KiloCode couldn't access files in the project because it was being spawned in the wrong working directory. The bot was using `process.cwd()` which points to wherever Node.js was launched from, not necessarily the project root where all the files are located.

### The Issue

When KiloCode was spawned, it was running in a different directory and couldn't see files like:
- `docs/AGENT_CREATION_GUIDE.md`
- `mini-roadmap.md`
- `package.json`
- etc.

## Solution

Set the working directory to the **project root** (`C:\Users\Deamon\Desktop\Backup\financial analyst`) for all KiloCode spawns.

### Implementation

#### 1. Define Project Root Directory
```typescript
// At the top of DiscordChatBotAgent.ts
const PROJECT_ROOT = path.resolve(__dirname, '../../../');
```

This goes up 3 levels from `src/backend/agents/` to reach the project root:
- `src/backend/agents/DiscordChatBotAgent.ts` (current file)
- `src/backend/agents/` (up 1)
- `src/backend/` (up 2)
- `src/` (up 3 - project root)

#### 2. Update All KiloCode Spawns

Changed all `cwd: process.cwd()` to `cwd: PROJECT_ROOT`:

**Location 1: Persistent Mode (startPersistentKilo)**
```typescript
this.kiloProcess = spawn(kilocodePath, kilocodeArgs, {
  cwd: PROJECT_ROOT,  // Changed from process.cwd()
  stdio: ['pipe', 'pipe', 'pipe'],
  shell: false
});
```

**Location 2: Classic Mode (executeWithFileRobust)**
```typescript
const { stdout } = await execWithInput(fullCommand, promptContent, {
  timeout: 300000,
  cwd: PROJECT_ROOT,  // Changed from process.cwd()
  maxBuffer: 50 * 1024 * 1024
});
```

**Location 3: Logging Mode (executeWithFileRobustWithLogging)**
```typescript
const { stdout, stderr } = await execWithInput(fullCommand, promptContent, {
  timeout: 300000,
  cwd: PROJECT_ROOT,  // Changed from process.cwd()
  maxBuffer: 50 * 1024 * 1024
});
```

**Location 4: Robust Execution (executeKiloCodeRobust)**
```typescript
const { stdout, stderr } = await execAsync(command, {
  timeout: 300000,
  cwd: PROJECT_ROOT,  // Changed from process.cwd()
  maxBuffer: 50 * 1024 * 1024,
  killSignal: 'SIGKILL'
});
```

## How It Works Now

### Before (Broken)
```
1. Bot spawned in: C:\Users\Deamon\Desktop\Backup\financial analyst\dist\
2. KiloCode spawned with cwd: C:\Users\Deamon\Desktop\Backup\financial analyst\dist\
3. KiloCode looks for: docs/AGENT_CREATION_GUIDE.md
4. Path becomes: C:\Users\Deamon\Desktop\Backup\financial analyst\dist\docs\AGENT_CREATION_GUIDE.md
5. File doesn't exist there! ❌
```

### After (Fixed)
```
1. Bot spawned in: C:\Users\Deamon\Desktop\Backup\financial analyst\dist\
2. KiloCode spawned with cwd: C:\Users\Deamon\Desktop\Backup\financial analyst\ (PROJECT_ROOT)
3. KiloCode looks for: docs/AGENT_CREATION_GUIDE.md
4. Path becomes: C:\Users\Deamon\Desktop\Backup\financial analyst\docs\AGENT_CREATION_GUIDE.md
5. File exists! ✅
```

## KiloCode Can Now Access

✅ All files in the project root directory:
- `docs/` - Documentation files
- `src/` - Source code
- `package.json` - Dependencies
- `.env` - Environment variables
- `mini-roadmap.md` - Project roadmap
- Any other files in the project

## Testing

Build and start the bot:
```bash
npm run build
pnpm bot
```

In Discord, you can now ask:
```
@Sniper lis le fichier docs/AGENT_CREATION_GUIDE.md
@Sniper read file mini-roadmap.md
```

KiloCode will be able to read the files because it's running in the correct directory!

## Files Modified

- **`src/backend/agents/DiscordChatBotAgent.ts`**:
  - Added `PROJECT_ROOT` constant (line 8)
  - Updated 4 spawn locations to use `PROJECT_ROOT` instead of `process.cwd()`

## Benefits

✅ **File Access**: KiloCode can now access all project files
✅ **Correct Working Directory**: Always runs in project root
✅ **No Path Issues**: Files are found at correct paths
✅ **Simpler Commands**: Just tell KiloCode "read file X" and it works
✅ **Consistent**: All spawns use the same working directory

## Summary

The fix ensures KiloCode always runs in the project root directory (`C:\Users\Deamon\Desktop\Backup\financial analyst`), giving it access to all files. This allows KiloCode to read and analyze files directly, just as you intended. The bot simply parses and displays the results.
