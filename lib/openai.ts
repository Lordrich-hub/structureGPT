import OpenAI from "openai";

if (!process.env.OPENAI_API_KEY) {
  console.error("OPENAI_API_KEY is not set. API routes depending on OpenAI will fail.");
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
  timeout: 60000,
  maxRetries: 2,
});
