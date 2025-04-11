/**
 * Voice Routes
 * 
 * These routes handle audio transcription using OpenAI's Whisper API and natural
 * language parsing of property search queries using OpenAI's GPT-4 API.
 */

import express, { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

// Setup OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Setup Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Create router instance
const router = express.Router();

/**
 * Convert Buffer to Readable Stream for OpenAI API
 */
function bufferToStream(buffer: Buffer) {
  const readable = new (require('stream').Readable)();
  readable._read = () => {}; // _read is required but you can noop it
  readable.push(buffer);
  readable.push(null);
  return readable;
}

/**
 * Parse transcription text into structured search parameters
 */
async function parseTranscriptionForSearchParams(text: string) {
  try {
    const prompt = `
      You are a property search assistant. Extract structured search parameters from the following query.
      Query: "${text}"
      
      Return a JSON object with the following fields (only include fields that are mentioned in the query):
      - address: Street address or partial address
      - parcelNumber: The parcel ID or number
      - propertyType: Type of property (residential, commercial, land, etc.)
      - priceRange: Object with min and max properties for price range
      - area: Object with min and max properties for square footage
      - bedrooms: Number of bedrooms
      - bathrooms: Number of bathrooms
      - yearBuilt: Object with min and max properties for year built
      - features: Array of features (garage, pool, etc.)
      - sortBy: Sort criteria (price, newest, etc.)
      
      Only include fields that are explicitly mentioned in the query. The JSON should be parseable.
    `;

    const response = await openai.chat.completions.create({
      model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
      messages: [
        { role: "system", content: "You extract structured property search parameters from natural language queries." },
        { role: "user", content: prompt }
      ],
      response_format: { type: "json_object" }
    });

    // Extract and parse the JSON
    const content = response.choices[0].message.content;
    const searchParams = JSON.parse(content);
    
    return searchParams;
  } catch (error) {
    console.error('Error parsing transcription:', error);
    return {};
  }
}

/**
 * POST /api/voice/transcribe
 * Transcribe audio to text and extract search parameters
 */
router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    // If audio data is sent as a base64 string in the request body
    if (req.body.audio) {
      // Convert base64 to buffer
      const buffer = Buffer.from(req.body.audio, 'base64');
      
      // Create a temporary file
      const tempDir = path.join(process.cwd(), 'temp');
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }
      const tempFile = path.join(tempDir, `audio-${Date.now()}.webm`);
      fs.writeFileSync(tempFile, buffer);
      
      // Transcribe using OpenAI Whisper
      const audioReadStream = fs.createReadStream(tempFile);
      
      const transcription = await openai.audio.transcriptions.create({
        file: audioReadStream,
        model: "whisper-1",
      });
      
      // Parse the transcription to extract search parameters
      const searchParams = await parseTranscriptionForSearchParams(transcription.text);
      
      // Clean up temp file
      fs.unlinkSync(tempFile);
      
      // Return the transcription and search parameters
      return res.json({
        text: transcription.text,
        searchParams
      });
    } else {
      return res.status(400).json({ error: 'No audio data provided' });
    }
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return res.status(500).json({ error: 'Failed to transcribe audio' });
  }
});

/**
 * POST /api/voice/parse-query
 * Parse text query to extract search parameters
 */
router.post('/parse-query', async (req: Request, res: Response) => {
  try {
    const { text } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'No text provided' });
    }
    
    // Parse the text to extract search parameters
    const searchParams = await parseTranscriptionForSearchParams(text);
    
    return res.json({
      text,
      searchParams
    });
  } catch (error) {
    console.error('Error parsing query:', error);
    return res.status(500).json({ error: 'Failed to parse query' });
  }
});

export default router;