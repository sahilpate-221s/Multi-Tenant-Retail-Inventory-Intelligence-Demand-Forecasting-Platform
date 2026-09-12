import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.warn("GEMINI_API_KEY not set - AI Assistant features will be unavailable.");
}

export const genAI: GoogleGenAI | null = apiKey ? new GoogleGenAI({ apiKey }) : null;