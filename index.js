require('dotenv').config();
const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const express = require('express');
const crypto = require('crypto');

// Configuration
const DISCORD_TOKEN = process.env.DISCORD_BOT_TOKEN;
const CHANNEL_ID = process.env.DISCORD_CHANNEL_ID;
const PORT = process.env.PORT || 3000;
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

// Initialize Discord client
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// Initialize Express server
const app = express();

// For webhook signature verification, we need the raw body
app.use('/webhook', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}));

// Regular JSON parsing for other routes
app.use(express.json());

// Verify GitHub webhook signature
function verifySignature(req, res, next) {
  if (!WEBHOOK_SECRET) {
    console.warn('Warning: WEBHOOK_SECRET not set. Skipping signature verification.');
    return next();
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).send('No signature provided');
  }

  const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
  const digest = 'sha256=' + hmac.update(req.rawBody).digest('hex');

  if (signature !== digest) {
    return res.status(401).send('Invalid signature');
  }

  next();
}

// Format GitHub event as Discord embed
function createEmbed(event, payload) {
  const embed = new EmbedBuilder()
    .setTimestamp(new Date());

  switch (event) {
    case 'push':
      const commits = payload.commits || [];
      const branch = payload.ref.replace('refs/heads/', '');
      embed
        .setTitle(`📝 Push to ${payload.repository.full_name}`)
        .setColor(0x5865F2)
        .setURL(payload.compare)
        .setDescription(`**${payload.pusher.name}** pushed ${commits.length} commit(s) to \`${branch}\``)
        .addFields(
          commits.slice(0, 5).map(commit => ({
            name: commit.message.split('\n')[0].substring(0, 100),
            value: `[\`${commit.id.substring(0, 7)}\`](${commit.url}) by ${commit.author.name}`,
            inline: false
          }))
        );
      if (commits.length > 5) {
        embed.setFooter({ text: `... and ${commits.length - 5} more commit(s)` });
      }
      break;

    case 'pull_request':
      const pr = payload.pull_request;
      const action = payload.action;
      const colors = {
        opened: 0x2CBE4E,
        closed: pr.merged ? 0x8957E5 : 0xDA3633,
        reopened: 0x2CBE4E,
        merged: 0x8957E5
      };
      embed
        .setTitle(`🔀 Pull Request ${action}: #${pr.number} ${pr.title}`)
        .setColor(colors[action] || 0x5865F2)
        .setURL(pr.html_url)
        .setDescription(pr.body?.substring(0, 200) || 'No description provided')
        .addFields(
          { name: 'Repository', value: payload.repository.full_name, inline: true },
          { name: 'Author', value: pr.user.login, inline: true },
          { name: 'Branch', value: `${pr.head.ref} → ${pr.base.ref}`, inline: false }
        );
      break;

    case 'issues':
      const issue = payload.issue;
      embed
        .setTitle(`🐛 Issue ${payload.action}: #${issue.number} ${issue.title}`)
        .setColor(payload.action === 'opened' ? 0x2CBE4E : payload.action === 'closed' ? 0x8957E5 : 0x5865F2)
        .setURL(issue.html_url)
        .setDescription(issue.body?.substring(0, 200) || 'No description provided')
        .addFields(
          { name: 'Repository', value: payload.repository.full_name, inline: true },
          { name: 'Author', value: issue.user.login, inline: true },
          { name: 'State', value: issue.state, inline: true }
        );
      break;

    case 'release':
      const release = payload.release;
      embed
        .setTitle(`🚀 Release ${payload.action}: ${release.tag_name}`)
        .setColor(0xFFA500)
        .setURL(release.html_url)
        .setDescription(release.body?.substring(0, 500) || 'No description provided')
        .addFields(
          { name: 'Repository', value: payload.repository.full_name, inline: true },
          { name: 'Author', value: release.author.login, inline: true },
          { name: 'Name', value: release.name || release.tag_name, inline: true }
        );
      break;

    case 'star':
      embed
        .setTitle(`⭐ Repository ${payload.action === 'created' ? 'Starred' : 'Unstarred'}`)
        .setColor(payload.action === 'created' ? 0xFFD700 : 0x808080)
        .setURL(payload.repository.html_url)
        .setDescription(`**${payload.sender.login}** ${payload.action === 'created' ? 'starred' : 'unstarred'} ${payload.repository.full_name}`)
        .addFields(
          { name: 'Total Stars', value: payload.repository.stargazers_count.toString(), inline: true }
        );
      break;

    case 'fork':
      embed
        .setTitle(`🍴 Repository Forked`)
        .setColor(0x238636)
        .setURL(payload.forkee.html_url)
        .setDescription(`**${payload.sender.login}** forked ${payload.repository.full_name}`)
        .addFields(
          { name: 'Fork', value: payload.forkee.full_name, inline: true },
          { name: 'Total Forks', value: payload.repository.forks_count.toString(), inline: true }
        );
      break;

    case 'create':
      const refType = payload.ref_type;
      embed
        .setTitle(`✨ ${refType.charAt(0).toUpperCase() + refType.slice(1)} Created`)
        .setColor(0x2CBE4E)
        .setURL(payload.repository.html_url)
        .setDescription(`**${payload.sender.login}** created ${refType} \`${payload.ref || 'repository'}\` in ${payload.repository.full_name}`);
      break;

    case 'delete':
      embed
        .setTitle(`🗑️ ${payload.ref_type.charAt(0).toUpperCase() + payload.ref_type.slice(1)} Deleted`)
        .setColor(0xDA3633)
        .setURL(payload.repository.html_url)
        .setDescription(`**${payload.sender.login}** deleted ${payload.ref_type} \`${payload.ref}\` in ${payload.repository.full_name}`);
      break;

    case 'ping':
      embed
        .setTitle(`🏓 Webhook Ping`)
        .setColor(0x5865F2)
        .setDescription(`Webhook successfully configured for ${payload.repository?.full_name || 'organization'}!`)
        .addFields(
          { name: 'Zen', value: payload.zen || 'Keep it simple', inline: false }
        );
      break;

    default:
      embed
        .setTitle(`📢 ${event}`)
        .setColor(0x5865F2)
        .setDescription(`Event received from ${payload.repository?.full_name || 'GitHub'}`)
        .addFields(
          { name: 'Action', value: payload.action || 'N/A', inline: true },
          { name: 'Sender', value: payload.sender?.login || 'Unknown', inline: true }
        );
  }

  return embed;
}

// Send message to Discord
async function sendToDiscord(embed) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
      console.log('Message sent to Discord successfully');
    } else {
      console.error('Channel not found or not a text channel');
    }
  } catch (error) {
    console.error('Error sending message to Discord:', error);
  }
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    discord: client.isReady() ? 'connected' : 'disconnected',
    uptime: process.uptime()
  });
});

// GitHub webhook endpoint
app.post('/webhook', verifySignature, async (req, res) => {
  const event = req.headers['x-github-event'];
  const payload = req.body;

  console.log(`Received GitHub event: ${event}`);

  try {
    const embed = createEmbed(event, payload);
    await sendToDiscord(embed);
    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Discord bot ready event
client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
  console.log(`Monitoring channel: ${CHANNEL_ID}`);
});

// Start the bot and server
async function start() {
  if (!DISCORD_TOKEN) {
    console.error('Error: DISCORD_BOT_TOKEN is not set');
    process.exit(1);
  }

  if (!CHANNEL_ID) {
    console.error('Error: DISCORD_CHANNEL_ID is not set');
    process.exit(1);
  }

  try {
    // Login to Discord
    await client.login(DISCORD_TOKEN);

    // Start Express server
    app.listen(PORT, () => {
      console.log(`Webhook server listening on port ${PORT}`);
      console.log(`Webhook endpoint: http://localhost:${PORT}/webhook`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('Error starting bot:', error);
    process.exit(1);
  }
}

// Handle shutdown gracefully
process.on('SIGINT', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('Shutting down...');
  client.destroy();
  process.exit(0);
});

start();
