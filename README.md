# gitmon-sh

A self-hosted Discord bot that monitors GitHub repositories and sends notifications to a Discord channel when events occur. Designed to run on Unraid or any Docker-compatible system.

## Features

- 🔔 Real-time GitHub event notifications
- 🎨 Beautiful Discord embeds with event details
- 🔒 Secure webhook signature verification
- 🐳 Docker-ready with docker-compose support
- 💚 Health check endpoint for monitoring
- 📊 Supports multiple GitHub events:
  - Push events
  - Pull requests (opened, closed, merged)
  - Issues (opened, closed, reopened)
  - Releases
  - Stars
  - Forks
  - Branch/tag creation and deletion
  - And more!

## Prerequisites

- Node.js 20+ (if running without Docker)
- Docker and Docker Compose (for containerized deployment)
- Discord bot token
- Discord channel ID
- GitHub repository with webhook access

## Setup

### 1. Create a Discord Bot

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application" and give it a name
3. Go to the "Bot" section and click "Add Bot"
4. Under "TOKEN", click "Reset Token" and copy it (you'll need this for `DISCORD_BOT_TOKEN`)
5. Enable "MESSAGE CONTENT INTENT" under "Privileged Gateway Intents"
6. Go to OAuth2 → URL Generator
   - Select scopes: `bot`
   - Select bot permissions: `Send Messages`, `Embed Links`
   - Copy the generated URL and use it to invite the bot to your server

### 2. Get Discord Channel ID

1. Enable Developer Mode in Discord (User Settings → Advanced → Developer Mode)
2. Right-click on the channel where you want notifications
3. Click "Copy Channel ID"

### 3. Configure Environment Variables

Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and fill in your values:
```env
DISCORD_BOT_TOKEN=your_discord_bot_token_here
DISCORD_CHANNEL_ID=your_discord_channel_id_here
WEBHOOK_SECRET=your_github_webhook_secret_here
PORT=3000
```

### 4. Set Up GitHub Webhook

1. Go to your GitHub repository → Settings → Webhooks → Add webhook
2. Set Payload URL to: `http://your-server-ip:3000/webhook`
3. Set Content type to: `application/json`
4. Set Secret to the same value as `WEBHOOK_SECRET` in your `.env` file
5. Select events you want to monitor (or choose "Send me everything")
6. Click "Add webhook"

**Note:** For local testing, you can use a service like [ngrok](https://ngrok.com/) to expose your local server:
```bash
ngrok http 3000
```
Then use the ngrok URL for your GitHub webhook.

## Running the Bot

### Using Docker Compose (Recommended)

```bash
docker-compose up -d
```

To view logs:
```bash
docker-compose logs -f
```

To stop:
```bash
docker-compose down
```

### Using Docker

Build the image:
```bash
docker build -t gitmon-sh .
```

Run the container:
```bash
docker run -d \
  --name gitmon-sh \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  gitmon-sh
```

### Running Directly with Node.js

Install dependencies:
```bash
npm install
```

Start the bot:
```bash
npm start
```

## Unraid Setup

1. Install the "Community Applications" plugin if not already installed
2. Go to Docker tab and click "Add Container"
3. Configure as follows:
   - **Name:** `gitmon-sh`
   - **Repository:** Build from the Dockerfile or use a pre-built image
   - **Network Type:** `bridge`
   - **Port Mappings:** Container Port `3000` → Host Port `3000`
   - **Environment Variables:**
     - `DISCORD_BOT_TOKEN`: Your Discord bot token
     - `DISCORD_CHANNEL_ID`: Your Discord channel ID
     - `WEBHOOK_SECRET`: Your GitHub webhook secret
     - `PORT`: `3000`
4. Click "Apply"

Alternatively, you can use docker-compose on Unraid with the "Compose Manager" plugin.

## Health Check

The bot includes a health check endpoint at `/health` that returns:
```json
{
  "status": "ok",
  "discord": "connected",
  "uptime": 12345.67
}
```

Access it at: `http://your-server-ip:3000/health`

## Supported GitHub Events

The bot handles the following GitHub webhook events with custom formatting:

- **push** - Code pushes to branches
- **pull_request** - PR opened/closed/merged
- **issues** - Issues opened/closed/reopened
- **release** - New releases published
- **star** - Repository starred/unstarred
- **fork** - Repository forked
- **create** - Branch/tag created
- **delete** - Branch/tag deleted
- **ping** - Webhook test event

Other events will be displayed with generic formatting.

## Security

- Webhook signature verification is enabled by default using HMAC SHA-256
- The `WEBHOOK_SECRET` must match between your GitHub webhook settings and the bot's environment variables
- If `WEBHOOK_SECRET` is not set, signature verification will be skipped (not recommended for production)

## Troubleshooting

### Bot not connecting to Discord
- Verify your `DISCORD_BOT_TOKEN` is correct
- Ensure the bot has been invited to your Discord server
- Check the bot has permissions to send messages in the channel

### Webhook not receiving events
- Verify the webhook URL is accessible from the internet
- Check GitHub webhook delivery history in repository settings
- Ensure `WEBHOOK_SECRET` matches between GitHub and your `.env` file
- Check firewall settings allow traffic on port 3000

### Messages not appearing in Discord
- Verify `DISCORD_CHANNEL_ID` is correct
- Ensure the bot has "Send Messages" and "Embed Links" permissions in the channel
- Check bot logs for errors

## Development

To run in development mode:
```bash
npm run dev
```

## License

MIT
