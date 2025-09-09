import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai';
import { config } from '../config/environment.js';

export const embeddings = new GoogleGenerativeAIEmbeddings({
  apiKey: config.geminiApiKey,
  model: 'text-embedding-004', // 768 dims (fits our vector(768) column)
});