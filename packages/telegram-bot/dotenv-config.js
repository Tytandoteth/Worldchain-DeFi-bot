import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import fs from 'fs';

// Get the directory path of the current module
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Path to the root .env file
const envPath = resolve(__dirname, '../../.env');

// Check if the file exists
if (fs.existsSync(envPath)) {
  console.log(`Loading environment variables from ${envPath}`);
  const result = dotenv.config({ path: envPath });
  
  if (result.error) {
    console.error('Error loading .env file:', result.error);
  } else {
    console.log('Environment variables loaded successfully');
  }
} else {
  console.error(`Error: .env file not found at ${envPath}`);
}

// Log the environment variables (without sensitive values)
console.log('Environment variables:');
console.log('OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '[CONFIGURED]' : '[NOT CONFIGURED]');
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '[CONFIGURED]' : '[NOT CONFIGURED]');
