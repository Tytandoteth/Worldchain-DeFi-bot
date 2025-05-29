# WorldChain DeFi Information Assistant

A neutral, factual Telegram bot providing objective information about WorldChain protocols, DeFi data, and mini applications. This bot serves as an informational resource for the WorldChain ecosystem and allows users to submit protocol data for review.

## Features

- **Protocol Information**: Access factual details about WorldChain protocols, including Total Value Locked (TVL), technical statistics, and deployment information.
- **Protocol Comparison**: Compare different protocols using objective metrics and data points.
- **Mini Application Directory**: Discover mini applications available on WorldChain with factual descriptions of their functionalities.
- **DeFi Analytics**: Access current data on DeFi trends, performance metrics, and activity indicators.
- **User Data Submission**: Submit protocol data for review through a structured process that emphasizes factual accuracy.
- **Regular Updates**: Receive systematic updates on ecosystem developments based on verifiable data sources.

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

### Prerequisites
- A Railway account: [railway.app](https://railway.app)
- Git repository for your project

### Option 1: Deploy via Railway Dashboard

1. Log in to [Railway](https://railway.app)
2. Create a new project
3. Select "Deploy from GitHub repo"
4. Connect your GitHub account and select this repository
5. Configure the following environment variables in the Railway dashboard:
   - `TELEGRAM_BOT_TOKEN`: Your Telegram bot token from BotFather
   - `OPENAI_API_KEY`: Your OpenAI API key for AI capabilities
   - Optional: `DATA_SUBMISSIONS_ADMIN_CHAT_ID`: Telegram chat ID to receive submission notifications

### Option 2: Deploy via Railway CLI

1. Install Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Log in to Railway:
   ```bash
   railway login
   ```

3. Link your project:
   ```bash
   railway link
   ```

4. Set required environment variables:
   ```bash
   railway variables set TELEGRAM_BOT_TOKEN=your_telegram_token
   railway variables set OPENAI_API_KEY=your_openai_api_key
   ```

5. Deploy your application:
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
