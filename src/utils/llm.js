import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
import { config } from '../config/environment.js';

export const llm = new ChatGoogleGenerativeAI({
  apiKey: config.geminiApiKey,
  model: 'gemini-1.5-flash',
  temperature: 0.3,
});