import fs from "node:fs/promises";
import OpenAI from "openai";
import dotenv from "dotenv";
import { createRAG } from "./simple-rag.js";

// Load environment variables from .env file
dotenv.config();

/* -------------------------------------------------------------------------- */
/* 1 · Load local playbook on cold-start                                      */
/* -------------------------------------------------------------------------- */
let playbook = "";
try {
  playbook = await fs.readFile(
    new URL("../../../data/playbook.md", import.meta.url),
    "utf8"
  );
} catch { /* playbook optional */ }

/* -------------------------------------------------------------------------- */
/* 2 · Retrieval-Augmented Generation (RAG) context                            */
/* -------------------------------------------------------------------------- */
// Ensure we have an API key before initializing RAG
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is missing or empty");
  process.exit(1);
}

// Create RAG system
const rag = createRAG(process.env.OPENAI_API_KEY);

// Initialize RAG system (will happen on first query if not done explicitly)
rag.initialize().catch(err => {
  console.error("Failed to initialize RAG system:", err);
});

async function getContext(question: string): Promise<string> {
  try {
    // Find relevant documents for the question
    const relevantDocs = await rag.findRelevantDocuments(question, 3);
    
    if (relevantDocs.length === 0) {
      console.log("No relevant documents found for query:", question);
      return "";
    }
    
    // Format the documents into a context string
    const context = rag.formatContext(relevantDocs);
    
    console.log(`Found ${relevantDocs.length} relevant document chunks for query`);
    return context;
  } catch (error) {
    console.error("Error retrieving context:", error);
    return "";
  }
}

/* -------------------------------------------------------------------------- */
/* 3 · askGPT helper used by both bots                                         */
/* -------------------------------------------------------------------------- */
// Ensure we have an API key
if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY environment variable is missing or empty");
  process.exit(1);
}

// Create OpenAI client with the API key
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function askGPT(prompt: string, customSystemMessage?: string): Promise<string> {
  // Only get RAG context if we're not using a custom system message with its own context
  const ragContext = customSystemMessage ? "" : await getContext(prompt);

  // Default system message includes playbook and RAG context
  const defaultSystemMessage = 
    `You are MAGI AI, a concise finance assistant.\n\n` +
    (playbook || "") +
    (ragContext ? `\n\n-----\n\nContext:\n${ragContext}` : "");

  // Use custom system message if provided, otherwise use default
  const systemMessage = customSystemMessage || defaultSystemMessage;

  const { choices } = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: systemMessage
      },
      { role: "user", content: prompt }
    ]
  });

  return choices[0]?.message.content ?? "";
}
