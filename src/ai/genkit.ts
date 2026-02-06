import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';

const apiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;

// Only initialize if API key is available, otherwise export null
// This prevents build failures when env vars aren't set
export const ai = apiKey ? genkit({
  plugins: [googleAI({ apiKey })],
  model: 'googleai/gemini-1.5-flash',
}) : null;