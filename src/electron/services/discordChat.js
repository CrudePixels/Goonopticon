/**
 * Discord text channel reader (bot token + Gateway).
 * Requires:
 *  - Bot token with access to the guild
 *  - Privileged intent: Message Content (to receive message text)
 */

let client = null;
let targetChannelIds = new Set();
let messageHandler = null;

async function startDiscord({ token, channelIds, onMessage }) {
  const t = typeof token === 'string' ? token.trim() : '';
  const ids = Array.isArray(channelIds) ? channelIds.filter(Boolean).map((x) => String(x)) : [];
  if (!t || ids.length === 0) return { ok: false, error: 'Missing Discord bot token or no channels' };
  if (typeof onMessage !== 'function') return { ok: false, error: 'Missing onMessage handler' };

  // Always restart on configuration change to keep the listener consistent.
  stopDiscord();

  targetChannelIds = new Set(ids);
  messageHandler = onMessage;

  let Discord;
  try {
    // Lazy require so app still starts without discord.js installed.
    Discord = require('discord.js');
  } catch (e) {
    stopDiscord();
    return { ok: false, error: 'discord.js dependency missing. Please run npm install discord.js.' };
  }

  const { Client, GatewayIntentBits } = Discord;
  client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent]
  });

  client.on('messageCreate', (msg) => {
    try {
      if (!msg || !msg.channelId) return;
      if (!targetChannelIds.has(String(msg.channelId))) return;

      // For thread replies etc this still fires; channelId is still the text channel id.
      const content = msg.content;
      if (!content || typeof content !== 'string') return;

      const author = msg.member?.displayName || msg.author?.username || '?';
      const avatarUrl = msg.author?.displayAvatarURL
        ? msg.author.displayAvatarURL({ size: 64, extension: 'png', dynamic: false })
        : '';

      messageHandler({
        username: author,
        message: content,
        channelId: String(msg.channelId),
        avatarUrl: avatarUrl || undefined
      });
    } catch (_) {}
  });

  client.on('error', () => {});
  client.on('shardError', () => {});

  try {
    await client.login(t);
    return { ok: true };
  } catch (e) {
    stopDiscord();
    return { ok: false, error: e?.message || 'Discord login failed' };
  }
}

function stopDiscord() {
  try {
    if (client) client.destroy();
  } catch (_) {}
  client = null;
  targetChannelIds = new Set();
  messageHandler = null;
}

module.exports = { startDiscord, stopDiscord };

