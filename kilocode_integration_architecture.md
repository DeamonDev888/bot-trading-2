# KiloCode Integration Architecture Analysis
## Discord Bot System - Complete Technical Documentation

### Executive Summary

The Financial Analyst Discord bot integrates with KiloCode CLI using a **hybrid session persistence model** with two modes:
1. **Persistent Mode**: Uses session IDs to maintain conversation context
2. **Classic Mode**: Spawns new KiloCode process per message (fallback)

The system uses `PersistentSessionManager` for context sharing across users and `DiscordChatBotAgent` for KiloCode execution.

---

## 1. Core Components & File Architecture

### 1.1 Primary Files

| File | Purpose | Key Responsibilities |
|------|---------|---------------------|
| \`src/backend/agents/DiscordChatBotAgent.ts\` | Core KiloCode integration | Session management, CLI execution, response parsing |
| \`src/discord_bot/PersistentSessionManager.ts\` | Context sharing | Shared session state, user activity tracking |
| \`src/discord_bot/KiloCodeCommandHandler.ts\` | CLI command wrapper | Profile, new task commands |
| \`src/discord_bot/sniper_financial_bot.ts\` | Main bot entry | Orchestration, shutdown handling |

### 1.2 Session Management Flow

\`\`\`
PersistentSessionManager
    ├── Manages shared session state
    ├── Tracks user activity (last 10 activities)
    ├── Maintains context history (last 8 exchanges)
    └── Provides conversation context to DiscordChatBotAgent
            │
            └── DiscordChatBotAgent
                ├── Has currentSessionId property
                ├── Calls executeKiloOneShot() with sessionId
                └── Falls back to chatClassic() on errors
\`\`\`

---

## 2. Session ID Management

### 2.1 Session ID Storage
**File**: \`src/backend/agents/DiscordChatBotAgent.ts\`
- **Property**: \`currentSessionId: string | null\` (line 246)
- **Initialization**: Set during \`initializeKiloSession()\` (line 271-274)
- **Invalidation**: Set to \`null\` in \`stopPersistentKilo()\` (line 335)

### 2.2 Session ID Flow

\`\`\`typescript
// 1. Initialization
async initializeKiloSession(): Promise<void> {
    const systemPrompt = this.getSystemPrompt();
    const payload = { type: "user", content: systemPrompt };
    
    const { stdout, sessionId } = await this.executeKiloOneShot(payload);
    if (sessionId) {
        this.currentSessionId = sessionId;  // ← SESSION ID CAPTURED
    }
}

// 2. Usage in Chat
async chatPersistent(request: ChatRequest): Promise<ChatResponse> {
    const payload = {
        type: "user",
        content: finalPromptText
    };
    
    // ← SESSION ID PASSED TO KILOCODE
    const { stdout: rawOutput, sessionId: newSessionId } = 
        await this.executeKiloOneShot(payload, this.currentSessionId || undefined);
    
    if (newSessionId && newSessionId !== this.currentSessionId) {
        this.currentSessionId = newSessionId;  // ← SESSION ID UPDATED
    }
}

// 3. Cleanup
async stopPersistentKilo(): Promise<void> {
    this.currentSessionId = null;  // ← SESSION ID INVALIDATED
}
\`\`\`

### 2.3 Session Context Tracking

**File**: \`src/discord_bot/PersistentSessionManager.ts\`

\`\`\`typescript
interface SessionData {
    sessionId: string;                    // Shared session identifier
    startTime: Date;                      // Session start timestamp
    lastActivity: Date;                   // Last activity timestamp
    messageCount: number;                 // Total messages processed
    contextHistory: string[];             // Last 8 exchanges
    userActivityLog: Array<{              // Last 10 user activities
        userId: string;
        username: string;
        timestamp: Date;
        message: string;
    }>;
}
\`\`\`

---

## 3. Exact CLI Commands & Flags

### 3.1 One-Shot Execution (Persistent Mode)
**File**: \`src/backend/agents/DiscordChatBotAgent.ts\` (line 287-328)

\`\`\`typescript
private async executeKiloOneShot(
    inputPayload: object, 
    sessionId?: string
): Promise<{ stdout: string, sessionId?: string }>

// CLI Command:
const kilocodeScript = 'C:\Users\Deamon\AppData\Roaming\npm\node_modules\@kilocode\cli\index.js';
const nodePath = process.execPath;

const args = [
    kilocodeScript,    // Path to KiloCode CLI
    '-m', 'code',      // Mode: code
    '--auto',          // Auto-confirm
    '--json-io'        // JSON I/O mode
];

if (sessionId) {
    args.push('-s', sessionId);  // Session ID flag
}
\`\`\`

**Complete Command Structure**:
\`\`\`bash
node "C:\Users\Deamon\AppData\Roaming\npm\node_modules\@kilocode\cli\index.js" \
    -m code \
    --auto \
    --json-io \
    -s <SESSION_ID>

# Input sent via stdin as JSON:
{"type":"user","content":"<PROMPT_TEXT>"}

# Output via stdout as JSON stream
\`\`\`

### 3.2 File-Based Execution (Classic Mode)
**File**: \`src/backend/agents/DiscordChatBotAgent.ts\` (line 937-939)

\`\`\`typescript
private async executeDirectRobust(req: AgentRequest, fullOutputPath: string): Promise<unknown> {
    const escapedPrompt = req.prompt.replace(/"/g, '\\"');
    const command = \`kilocode -m code --auto "\${escapedPrompt}"\`;
}
\`\`\`

**Alternative file-based** (sniper_financial_bot.ts line 3025):
\`\`\`typescript
const tempPromptPath = path.join(process.cwd(), 'temp_prompt.txt');
await fs.writeFile(tempPromptPath, req.prompt, 'utf-8');
const command = \`cat "\${tempPromptPath}" | kilocode -m ask --auto --json\`;
\`\`\`

### 3.3 Profile & New Task Commands
**File**: \`src/discord_bot/KiloCodeCommandHandler.ts\`

\`\`\`typescript
// Profile commands (lines 97-103)
const commands = [
    'kilocode profile',
    'kilocode --profile',
    'kilocode profile --show',
    'kilocode user profile',
    'kilocode whoami'
];

// New task command (lines 140-142)
const newTaskCommand = taskDescription
    ? \`kilocode -m ask --auto "Nouvelle tâche: \${taskDescription}. Commence avec un état propre."\`
    : 'kilocode -m ask --auto "Commence une nouvelle session avec un état propre. Prêt à aider."';
\`\`\`


---

## 4. Prompt System Integration

### 4.1 System Prompt
**File**: \`src/backend/agents/DiscordChatBotAgent.ts\` (line 350)

The system prompt is ~2000 characters defining:
- Bot identity: "Sniper" - Discord Financial Analyst
- Core competencies: Financial analysis, TypeScript development, Discord admin
- Communication rules: Always in French, concise responses
- JSON output format for polls and embeds

### 4.2 Dynamic Prompt Creation

**First Message** (\`createDiscordBotPrompt\` lines 686-720):
\`\`\`typescript
if (request.isFirstMessage === false) {
    return \`# CONTINUATION DE SESSION
Tu es Sniper, le bot Discord.
CONTEXTE PRÉCÉDENT:
\${request.context || '(Aucun contexte)'}

MEMBRE: "\${request.message}"

Réponds naturellement en continuant la conversation.
N'oublie pas: Tu es expert financier et admin Discord.
Génère du JSON si nécessaire (poll, embed).\`;
}
\`\`\`

**Continuation Context** (from PersistentSessionManager line 157-180):
\`\`\`typescript
private buildConversationContext(session: SessionData): string {
    return \`
## 📝 CONTEXTE DE CONVERSATION PARTAGÉE
\${session.contextHistory.slice(-8).join('\n')}

## 📊 STATISTIQUES DE SESSION PARTAGÉE
- **Début de session**: \${session.startTime.toLocaleString('fr-FR')}
- **Messages échangés**: \${session.messageCount}
- **Utilisateurs récents**: \${uniqueUsers.join(', ')}
- **Dernière activité**: \${session.lastActivity.toLocaleString('fr-FR')}

Cette session est partagée entre tous les utilisateurs Discord.
Garde ce contexte en mémoire pour tes réponses suivantes.
\`;
}
\`\`\`

### 4.3 Context Injection Flow

\`\`\`
User Message
    ↓
PersistentSessionManager.processMessage()
    ├─ Builds conversation context (last 8 exchanges)
    ├─ Tracks user activity (last 10 users)
    └─ Passes context to DiscordChatBotAgent
            ↓
        DiscordChatBotAgent.chat()
            ├─ Checks message size (>5000 chars → classic mode)
            ├─ Attempts chatPersistent() with context
            │   └─ Injects context if isFirstMessage
            └─ Falls back to chatClassic() on error
                    └─ Uses createDiscordBotPrompt()
\`\`\`

---

## 5. Initialization → Chat → Persistence → Cleanup Flow

### 5.1 Initialization Sequence

**Step 1: Bot Startup** (\`sniper_financial_bot.ts\` line 34-73)
\`\`\`typescript
// PID file creation for single instance
const PID_FILE = path.join(process.cwd(), 'sniper_bot.pid');

// Kill any existing instance
if (oldPid && !isNaN(oldPid) && oldPid !== process.pid) {
    process.kill(oldPid, 'SIGKILL');
}
\`\`\`

**Step 2: SniperFinancialBot Constructor** (lines 257-263)
\`\`\`typescript
export class SniperFinancialBot {
    private sessionManager: PersistentSessionManager;
    private kilocodeHandler: KiloCodeCommandHandler;
    
    constructor() {
        this.sessionManager = new PersistentSessionManager();
        this.kilocodeHandler = KiloCodeCommandHandler.getInstance();
    }
}
\`\`\`

**Step 3: Session Initialization** (line 264-281)
\`\`\`typescript
// In bot initialization
await this.discordAgent.initializeKiloSession();

// Which creates session in DiscordChatBotAgent
async initializeKiloSession(): Promise<void> {
    const { stdout, sessionId } = await this.executeKiloOneShot(payload);
    this.currentSessionId = sessionId;
}
\`\`\`

### 5.2 Chat Flow

**User Message Received** (\`sniper_financial_bot.ts\` line 4432)
\`\`\`typescript
const handled = await sniper.handleMessage(message);
\`\`\`

**Message Processing** (\`PersistentSessionManager.ts\` line 76-152)
\`\`\`typescript
async processMessage(userId, username, message, attachmentContent?) {
    // 1. Log user activity
    session.userActivityLog.push({userId, username, timestamp, message});
    
    // 2. Add to context history
    session.contextHistory.push(\`\${username}: \${message}\`);
    
    // 3. Keep only last 8 exchanges
    if (session.contextHistory.length > 8) {
        session.contextHistory = session.contextHistory.slice(-8);
    }
    
    // 4. Build conversation context
    const conversationContext = this.buildConversationContext(session);
    
    // 5. Call DiscordChatBotAgent with context
    const chatRequest = {
        message,
        userId,
        username,
        isFirstMessage: session.messageCount === 0,
        context: conversationContext
    };
    
    const response = await this.chatAgent.chat(chatRequest);
}
\`\`\`

**KiloCode Execution** (\`DiscordChatBotAgent.ts\` line 453-476)
\`\`\`typescript
async chat(request: ChatRequest): Promise<ChatResponse> {
    // Check message size
    if (request.message.length > 5000) {
        return this.chatClassic(request);  // Fallback for large messages
    }
    
    try {
        return await this.chatPersistent(request);  // Try persistent mode
    } catch (error) {
        return this.chatClassic(request);  // Fallback on error
    }
}
\`\`\`

**Persistent Mode Execution** (lines 491-541)
\`\`\`typescript
private async chatPersistent(request: ChatRequest): Promise<ChatResponse> {
    // 1. Prepare payload
    const payload = {
        type: "user",
        content: finalPromptText  // Message + context injection
    };
    
    // 2. Execute with session ID
    const { stdout: rawOutput, sessionId: newSessionId } = 
        await this.executeKiloOneShot(payload, this.currentSessionId || undefined);
    
    // 3. Update session ID if changed
    if (newSessionId && newSessionId !== this.currentSessionId) {
        this.currentSessionId = newSessionId;
    }
    
    // 4. Clean and parse response
    const cleanResponse = this.cleanAndParseKiloStream(rawOutput);
    return await this.parseChatResponse(cleanResponse);
}
\`\`\`


### 5.3 Session Persistence

**Shared Session State** (\`PersistentSessionManager.ts\`)
- **Timeout**: 30 minutes of inactivity (line 23)
- **Cleanup**: Runs every 10 minutes (line 188)
- **Restoration**: Loads from \`data/shared_session_state.json\` (lines 264-297)
- **Save**: Writes to \`data/shared_session_state.json\` (lines 231-259)

**Context History Management**:
\`\`\`typescript
// Keep only 8 last exchanges to avoid timeouts
if (session.contextHistory.length > 8) {
    session.contextHistory = session.contextHistory.slice(-8);
}

// Keep only last 10 user activities
if (session.userActivityLog.length > 10) {
    session.userActivityLog = session.userActivityLog.slice(-10);
}
\`\`\`

### 5.4 Cleanup & Shutdown

**Shutdown Triggers** (\`sniper_financial_bot.ts\` lines 4470-4483):
\`\`\`typescript
process.on('SIGINT', async () => {
    await sniper.handleShutdown();
});

process.on('SIGTERM', async () => {
    await sniper.handleShutdown();
});

process.on('SIGQUIT', async () => {
    await sniper.handleShutdown();
});
\`\`\`

**Shutdown Handler** (lines 4118-4134):
\`\`\`typescript
async handleShutdown(): Promise<void> {
    // 1. Stop persistent KiloCode
    await this.discordAgent.stopPersistentKilo();
    
    // 2. Cleanup resources
    await this.cleanup();
    
    process.exit(0);
}
\`\`\`

**Persistent Kilo Stop** (\`DiscordChatBotAgent.ts\` lines 333-336):
\`\`\`typescript
async stopPersistentKilo(): Promise<void> {
    console.log('[discord-chatbot] 🛑 Resetting Session ID...');
    this.currentSessionId = null;  // Invalidate session
}
\`\`\`

**Full Cleanup** (lines 4102-4113):
\`\`\`typescript
async cleanup(): Promise<void> {
    // 1. Close calendar agents
    await this.closeCalendarAgents();
    
    // 2. Stop persistent KiloCode
    await this.discordAgent.stopPersistentKilo();
    
    console.log('✅ Full cleanup completed');
}
\`\`\`

---

## 6. Mode Comparison

### 6.1 Persistent Mode (Preferred)

**Pros**:
- Avoids resending ~2000 character system prompt each time
- Maintains conversation context via session ID
- Faster response times
- Better user experience

**Cons**:
- Windows stability issues (mentioned in comments)
- Requires session ID management
- Complex error handling

**Command**:
\`\`\`bash
node <kilocode_script> -m code --auto --json-io -s <SESSION_ID>
\`\`\`

### 6.2 Classic Mode (Fallback)

**Pros**:
- More stable on Windows
- Simpler implementation
- No session state to manage
- Each message is independent

**Cons**:
- Slower (spawns new process each time)
- Must resend system prompt each time
- No persistent context

**Command**:
\`\`\`bash
kilocode -m code --auto "<PROMPT>"
\`\`\`

---

## 7. Files Requiring Modification

### 7.1 Core Integration Files (No changes needed - working correctly)

✅ \`src/backend/agents/DiscordChatBotAgent.ts\`
- Session ID management: Working correctly
- CLI execution: Properly implemented
- Response parsing: Functional
- Fallback logic: Operational

✅ \`src/discord_bot/PersistentSessionManager.ts\`
- Context sharing: Working correctly
- Activity tracking: Functional
- Session state: Properly managed

✅ \`src/discord_bot/KiloCodeCommandHandler.ts\`
- Command wrapper: Working correctly
- Profile/new task: Functional

### 7.2 Potential Enhancement Areas

#### 7.2.1 Session Persistence Improvement

**File**: \`src/backend/agents/DiscordChatBotAgent.ts\`
**Line**: 333-336

**Current Implementation**:
\`\`\`typescript
async stopPersistentKilo(): Promise<void> {
    console.log('[discord-chatbot] 🛑 Resetting Session ID...');
    this.currentSessionId = null;
}
\`\`\`

**Enhancement** (if needed):
\`\`\`typescript
async stopPersistentKilo(): Promise<void> {
    console.log('[discord-chatbot] 🛑 Invalidating KiloCode Session...');
    
    // Optionally send invalidation signal to KiloCode
    if (this.currentSessionId) {
        try {
            const invalidatePayload = {
                type: "system",
                content: "Invalidate session",
                sessionId: this.currentSessionId
            };
            await this.executeKiloOneShot(invalidatePayload, this.currentSessionId);
        } catch (error) {
            console.warn('[discord-chatbot] ⚠️ Session invalidation failed:', error);
        }
    }
    
    this.currentSessionId = null;
}
\`\`\`

#### 7.2.2 Session Recovery

**File**: \`src/discord_bot/PersistentSessionManager.ts\`
**Enhancement**: Add session recovery on bot restart

\`\`\`typescript
async loadSessionsState(): Promise<void> {
    // Already implemented (lines 264-297)
    // Check if active before restoring
    if (this.isSessionActive(restoredSession)) {
        this.sharedSession = restoredSession;
    }
}
\`\`\`

#### 7.2.3 Context Optimization

**File**: \`src/backend/agents/DiscordChatBotAgent.ts\`
**Lines**: 694-705

**Current**: Context injected only for first message
**Enhancement**: Make context injection configurable

\`\`\`typescript
if (request.context && (request.isFirstMessage || request.forceContext)) {
    const sanitizedContext = request.context.replace(/\n/g, ' ');
    finalPromptText = \`[CONTEXTE SISTÈME: \${sanitizedContext}] \${finalPromptText}\`;
}
\`\`\`

#### 7.2.4 CLI Command Unification

**Issue**: Inconsistent CLI flags across files

**File**: \`KiloCodeCommandHandler.ts\`
- Uses: \`kilocode -m ask --auto\` (line 141)
- Should be: \`kilocode -m code --auto\` (per KILOCODE_MODE_CHANGE.md)

**Recommended Fix**:
\`\`\`typescript
// Line 140-142
const newTaskCommand = taskDescription
    ? \`kilocode -m code --auto "Nouvelle tâche: \${taskDescription}. Commence avec un état propre."\`
    : 'kilocode -m code --auto "Commence une nouvelle session avec un état propre. Prêt à aider."';
\`\`\`

#### 7.2.5 Alternative File-Based Execution

**File**: \`sniper_financial_bot.ts\`
**Line**: 3025

**Current**:
\`\`\`typescript
const command = \`cat "\${tempPromptPath}" | kilocode -m ask --auto --json\`;
\`\`\`

**Should be**:
\`\`\`typescript
const command = \`cat "\${tempPromptPath}" | kilocode -m code --auto --json\`;
\`\`\`


---

## 8. Critical Issues & Recommendations

### 8.1 ✅ No Critical Issues Found

The current implementation is **stable and functional**:
- Session management works correctly
- Fallback mechanisms are in place
- Cleanup handlers are properly implemented
- Context sharing is working as designed

### 8.2 Recommendations

#### 8.2.1 CLI Mode Consistency

**Priority**: Low
**Files**: 2 files need updates
- \`src/discord_bot/KiloCodeCommandHandler.ts\` line 141
- \`src/discord_bot/sniper_financial_bot.ts\` line 3025

**Change**: Replace \`-m ask\` with \`-m code\` for consistency

#### 8.2.2 Session Invalidation Enhancement

**Priority**: Low
**File**: \`src/backend/agents/DiscordChatBotAgent.ts\` line 333

**Enhancement**: Add explicit session invalidation call to KiloCode before resetting ID

#### 8.2.3 Documentation Updates

**Priority**: Medium
**Files**: Update KILOCODE_MODE_CHANGE.md

**Add**: Document the hybrid mode architecture (persistent + classic fallback)

#### 8.2.4 Monitoring & Logging

**Priority**: Low
**Enhancement**: Add metrics for:
- Session persistence success rate
- Fallback to classic mode frequency
- Average session duration

---

## 9. Architecture Summary

### 9.1 Flow Diagram

\`\`\`
┌─────────────────────────────────────────────────────────────┐
│                    DISCORD MESSAGE RECEIVED                  │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│           PersistentSessionManager.processMessage()          │
│  • Log user activity (max 10)                               │
│  • Update context history (max 8)                           │
│  • Build conversation context                               │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              DiscordChatBotAgent.chat()                      │
│  • Check message size (>5000 → classic)                     │
│  • Try persistent mode first                                │
│  • Fallback to classic on error                             │
└────────────────────┬────────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         ▼                       ▼
┌────────────────┐        ┌────────────────┐
│  PERSISTENT    │        │   CLASSIC      │
│  MODE          │        │   MODE         │
└────────────────┘        └────────────────┘
         │                       │
         ▼                       ▼
┌────────────────┐        ┌────────────────┐
│ executeKiloOne │        │ executeWithFile│
│ Shot()         │        │ Robust()       │
└────────────────┘        └────────────────┘
         │                       │
         ▼                       ▼
┌──────────────────────────────────────┐
│  KILOCODE CLI EXECUTION               │
│                                        │
│  node <script> -m code --auto         │
│      --json-io -s <SESSION_ID>        │
└──────────────────────────────────────┘
\`\`\`

### 9.2 Session Lifecycle

\`\`\`
INITIALIZATION
    ↓
Bot Start → Create PID file
    ↓
SniperFinancialBot() → Initialize PersistentSessionManager
    ↓
discordAgent.initializeKiloSession()
    ↓
executeKiloOneShot() with system prompt
    ↓
← receive SESSION_ID
    ↓
currentSessionId = SESSION_ID

PERSISTENCE
    ↓
User Message
    ↓
PersistentSessionManager.track()
    ↓
chatPersistent() with SESSION_ID
    ↓
executeKiloOneShot(-s SESSION_ID)
    ↓
← receive response + (optional new SESSION_ID)
    ↓
Update currentSessionId if changed

CLEANUP
    ↓
SIGTERM/SIGINT/SIGQUIT
    ↓
handleShutdown()
    ↓
discordAgent.stopPersistentKilo()
    ↓
currentSessionId = null
    ↓
Exit process
\`\`\`

---

## 10. Conclusion

The KiloCode integration is **well-architected and stable**:

✅ **Strengths**:
- Hybrid mode (persistent + classic fallback) provides reliability
- Session management is properly implemented
- Context sharing works across users
- Cleanup handlers are comprehensive
- No critical bugs found

⚠️ **Minor Issues**:
- CLI mode inconsistency (ask vs code)
- Session invalidation could be more explicit

📋 **Files to Modify** (if addressing minor issues):
1. \`src/discord_bot/KiloCodeCommandHandler.ts\` - Line 141
2. \`src/discord_bot/sniper_financial_bot.ts\` - Line 3025

🎯 **No major refactoring needed** - the architecture is sound and production-ready.

---

**Generated**: 2025-12-13  
**Analysis Type**: KiloCode Integration Architecture Review  
**Status**: ✅ No critical issues found - system is production-ready
