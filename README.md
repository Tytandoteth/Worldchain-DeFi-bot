# WorldChain DeFi Bot

A Telegram bot providing detailed information about Worldchain protocols, DeFi data, and mini apps, with user data submission capabilities.

## Features

- **Protocol Information**: Get detailed information about protocols on WorldChain
- **Protocol Comparison**: Compare different protocols with the `/compare` command
- **Protocol Statistics**: Get detailed statistics with the `/stats` command
- **Mini Apps Exploration**: Discover mini apps on WorldChain with the `/miniapps` command
- **Trending Protocols**: See what's trending with the `/trending` command
- **User Data Submission**: Users can submit new protocol data via private messages

## Project Structure

```
worldchain-defi-bot/
├── packages/
│   ├── core/                 # Core functionality and shared modules
│   │   └── src/
│   │       ├── defillama.ts  # DeFi Llama integration
│   │       ├── openai.ts     # OpenAI integration
│   │       ├── simple-rag.ts # Retrieval-Augmented Generation system
│   │       └── ...
│   ├── telegram-bot/         # Telegram bot implementation
│   │   └── src/
│   │       ├── index.ts      # Main bot logic
│   │       └── bot-commands.ts # Command handlers
├── data/                     # Data files for the bot
│   ├── financial/            # Financial data
│   └── user_submissions/     # User submitted data (pending approval)
└── .env                      # Environment variables (not tracked in git)
```

## Environment Variables

Copy `.env.example` to `.env` and fill in the required values:

```
# OpenAI API credentials
OPENAI_API_KEY=your_openai_api_key_here

# Telegram Bot credentials
TELEGRAM_BOT_TOKEN=your_telegram_bot_token_here

# Data Submission Configuration
DATA_SUBMISSIONS_ADMIN_CHAT_ID=admin_chat_id
```

## Development

### Setup

```bash
# Install dependencies
npm install

# Build all packages
npm run build

# Run in development mode
npm run dev
```

### Deployment Options

### Railway Deployment (Recommended)

This bot is configured for easy deployment on Railway:

1. **Create a Railway account** at [railway.app](https://railway.app) if you don't have one

2. **Install Railway CLI** (optional, for easy deployment)
   ```bash
   npm i -g @railway/cli
   railway login
   ```

3. **Deploy using Railway Dashboard**
   - Create a new project in Railway
   - Connect your GitHub repository or use the CLI: `railway init`
   - Add environment variables in Railway Dashboard:
     - `OPENAI_API_KEY`
     - `TELEGRAM_BOT_TOKEN`
     - `DATA_SUBMISSIONS_ADMIN_CHAT_ID` (optional)
   - Deploy the project

4. **Deploy using Railway CLI**
   ```bash
   railway up
   ```

5. **Monitor your deployment** in the Railway dashboard

### PM2 Deployment (Self-hosted)

For self-hosted deployment, use PM2 to manage the bot process:

```bash
# Install PM2 globally
npm install -g pm2

# Start the bot with PM2
pm2 start app.js
```

## User Data Submission Process

1. Users start a private chat with the bot
2. They use the `/submit` command followed by their protocol data
3. The data is stored in a pending queue for admin review
4. Once approved, the data becomes available through regular bot queries

## Security Notes

- All API keys and tokens are stored in `.env` (not tracked in Git)
- User submissions go through approval process to prevent spam/inappropriate content
- Following best practices for secure Telegram bot deployment
