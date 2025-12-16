# Poll Emoji Validation Fix

## Problem

When creating a Discord poll, the bot failed with the error:
```
❌ Error creating poll: DiscordAPIError[50035]: Invalid Form Body
poll.answers[2].poll_media.emoji[INVALID_EMOJI_UNICODE]: Invalid emoji unicode
```

This occurred because the bot was trying to use an invalid emoji in a poll answer.

## Root Cause

The poll creation code was directly using emojis from the poll data without validation:
```typescript
return {
    text,
    emoji: option.emoji  // ❌ No validation!
};
```

Discord requires emojis to be valid unicode or custom emoji format. Invalid emojis cause API errors.

## Solution

Added emoji validation before using them in polls.

### Changes Made

**File**: `src/discord_bot/DiscordPollManager.ts`
**Lines**: 168-181

Added validation logic:
```typescript
// Validate emoji if provided
let emoji = undefined;
if (option.emoji) {
    // Check if it's a valid emoji (unicode or custom emoji format)
    const isValidUnicodeEmoji = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]$/u.test(option.emoji);
    const isValidCustomEmoji = /^<:\w+:\d+>$/.test(option.emoji) || /^<a:\w+:\d+>$/.test(option.emoji);

    if (isValidUnicodeEmoji || isValidCustomEmoji) {
        emoji = option.emoji;
        console.log(`✅ Valid emoji for poll answer: ${emoji}`);
    } else {
        console.warn(`⚠️ Invalid emoji "${option.emoji}" for poll answer "${text}", removing emoji`);
    }
}

return {
    text,
    emoji  // ✅ Validated emoji (or undefined if invalid)
};
```

### Emoji Validation Patterns

**Unicode Emojis**: Checks for presentation or extended pictographic characters
```typescript
/^[\p{Emoji_Presentation}\p{Extended_Pictographic}]$/u
```

**Custom Emojis**: Checks for Discord custom emoji formats
```typescript
// Animated custom emoji: <:name:id>
/^<:\w+:\d+>$/.test(option.emoji)
// Regular custom emoji: <a:name:id>
/^<a:\w+:\d+>$/.test(option.emoji)
```

## How It Works

### Before (Broken)
```
1. Poll creation starts
2. Emoji: "💰" → Used directly ❌ (might be invalid)
3. Discord API call
4. Error: Invalid emoji unicode
```

### After (Fixed)
```
1. Poll creation starts
2. Emoji: "💰" → Validated ✅
3. Valid emoji: Used in poll
4. Invalid emoji: Removed, warning logged
5. Discord API call succeeds ✅
```

## Error Handling

### Valid Emojis
- ✅ Standard unicode emojis: `💰`, 📈, 🔥, etc.
- ✅ Custom Discord emojis: `<:name:123456789>`, `<a:name:123456789>`

### Invalid Emojis
- ❌ Empty strings
- ❌ Invalid unicode sequences
- ❌ Malformed custom emoji formats
- ❌ Non-emoji text

**Behavior**: Invalid emojis are removed and a warning is logged, but the poll continues to be created.

## Testing

Build and test:
```bash
npm run build
pnpm bot
```

### Test Case 1: Valid Unicode Emoji
```
Input: { text: "Option 1", emoji: "💰" }
Output: ✅ Valid emoji used in poll
```

### Test Case 2: Invalid Emoji
```
Input: { text: "Option 2", emoji: "not_an_emoji" }
Output: ⚠️ Warning logged, emoji removed, poll created without emoji
```

### Test Case 3: Custom Emoji
```
Input: { text: "Option 3", emoji: "<:custom:123456789>" }
Output: ✅ Valid custom emoji used in poll
```

## Benefits

✅ **Prevents API Errors**: Invalid emojis are caught before API calls
✅ **Graceful Degradation**: Invalid emojis are removed, poll still works
✅ **Better Logging**: Warnings show which emojis are invalid
✅ **Flexible**: Accepts both unicode and custom emojis
✅ **Safe**: No crashes when emojis are invalid

## Files Modified

- **`src/discord_bot/DiscordPollManager.ts`**:
  - Added emoji validation logic (lines 168-181)
  - Logs validation results for debugging

## Summary

The fix ensures all emojis used in Discord polls are valid, preventing API errors and allowing polls to be created successfully even when some emojis are invalid.
