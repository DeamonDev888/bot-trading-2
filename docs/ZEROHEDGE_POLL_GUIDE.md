# ZeroHedge Poll Guide

This guide explains how to create and use the ZeroHedge opinion polls in Discord using the Sniper Financial Bot.

## Overview

The ZeroHedge poll allows community members to share their opinions about ZeroHedge as a financial news source. This helps gather valuable feedback about how traders and analysts perceive this controversial but influential financial platform.

## Available Commands

### French Version
```
!poll_zerohedge
```
or
```
!zerohedge_poll
```

Creates a French-language poll asking: *"Quelle est votre opinion sur ZeroHedge comme source d'information pour les marchés financiers ?"*

### English Version
```
!zerohedge_poll_en
```
or
```
!poll_zerohede_en
```

Creates an English-language poll asking: *"What's your opinion on ZeroHedge as a news source for financial markets?"*

## Poll Options

Both polls include the following options with relevant emojis:

1. **Very reliable source** / **Source très fiable** ✅
2. **Sometimes useful but needs verification** / **Parfois utile mais vérification nécessaire** ⚠️
3. **Too biased** / **Trop biaisé** 📉
4. **Don't follow it** / **Je ne le suis pas** 🚫
5. **Other (with comment)** / **Autre (avec commentaire)** 💭

## Poll Configuration

- **Duration**: 72 hours (3 days)
- **Multiple selections**: Disabled (users can only vote once)
- **Permissions required**: Bot must have "Create Polls" permission in the channel

## Usage Examples

### Creating the Poll
1. Navigate to the desired Discord channel
2. Type `!poll_zerohedge` (for French) or `!zerohedge_poll_en` (for English)
3. The bot will create the poll and provide a direct link

### Example Output
```
✅ Sondage ZeroHedge créé avec succès ! Votez maintenant ci-dessus.
🔗 [Lien direct](https://discord.com/channels/...)
```

## Implementation Details

### Files Created/Modified

1. **Bot Command Integration** (`src/discord_bot/sniper_financial_bot.ts`)
   - Added poll command handlers
   - Updated help message

2. **Standalone Scripts** (for manual poll creation)
   - `create_zerohedge_poll.js` - Node.js script
   - `scripts/create_zerohedge_poll.mjs` - ES Module version
   - `run_zerohedge_poll.mjs` - Full bot integration script
   - `test_zerohedge_poll.ts` - TypeScript test script

3. **Documentation**
   - `docs/ZEROHEDGE_POLL_GUIDE.md` - This file

### Poll Data Structure

The polls use the following data structure:

```typescript
interface PollData {
    question: string;
    options: PollOption[];
    duration: number; // in hours
    allowMultiselect: boolean;
}

interface PollOption {
    text: string;
    emoji?: string;
}
```

## Best Practices

1. **Channel Selection**: Create polls in channels where financial discussions are active
2. **Timing**: Consider creating polls during active trading hours for maximum participation
3. **Follow-up**: After the poll ends, consider sharing results and encouraging discussion
4. **Permissions**: Ensure the bot has necessary permissions before attempting to create polls

## Troubleshooting

### Common Issues

1. **Missing Permissions**
   - Error: "Je n'ai pas la permission de créer des sondages dans ce channel"
   - Solution: Grant the bot "Create Polls" permission in the channel

2. **Bot Not Responding**
   - Check if the bot is online
   - Verify the command spelling
   - Ensure you're not in cooldown

3. **Poll Creation Fails**
   - Check Discord service status
   - Verify channel permissions
   - Review bot logs for detailed error messages

### Debug Commands

- `!ping` - Check if bot is responsive
- `!help` - Verify poll commands are listed
- `!sessions` - Check bot session status

## Future Enhancements

Potential improvements to consider:

1. **Poll Templates**: Create templates for other financial news sources
2. **Poll Results Analysis**: Automatic analysis of poll results
3. **Scheduled Polls**: Recurring polls at specific intervals
4. **Poll History**: Track poll results over time
5. **Multi-channel Support**: Create polls across multiple channels simultaneously

## Security Considerations

- Polls are read-only and don't require additional permissions
- No user data is stored beyond Discord's native poll functionality
- Bot validates all inputs before creating polls

## Support

For issues or questions about the ZeroHedge poll functionality:

1. Check this documentation first
2. Review bot help with `!help`
3. Contact server administrators
4. Check console logs for detailed error messages