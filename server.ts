import { localApiOnly } from './local-api-guard.mjs';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use('/api', localApiOnly(() => PORT));
const PORT = 3000;

app.use(express.json({ limit: '50mb' }));

const getAiClient = () => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('GEMINI_API_KEY is required');
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

const redesignRoomFunctionDeclaration: FunctionDeclaration = {
  name: 'redesignRoom',
  description: 'Redesign the room with a new style or specific modifications (e.g., "make the rug blue", "Mid-Century Modern style"). Call this when the user asks to change the visual design of the room.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      style: {
        type: Type.STRING,
        description: 'The overall style to apply (e.g., "Mid-Century Modern", "Scandinavian", "Industrial", "Bohemian", etc.). If keeping the same style but changing details, pass the current style.',
      },
      prompt: {
        type: Type.STRING,
        description: 'Specific instructions for the redesign, like "keep the layout but make the rug blue", or "add more plants".',
      }
    },
    required: ['style'],
  },
};

app.post('/api/generate-design', async (req, res) => {
  try {
    const { image, style, prompt } = req.body;
    let textPrompt = `Redesign this interior in ${style} style.`;
    if (prompt) {
      textPrompt += ` Additional instruction: ${prompt}`;
    }

    const ai = getAiClient();
    const base64Data = image.split(',')[1];
    const mimeType = image.split(';')[0].split(':')[1] || 'image/jpeg';

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-image-preview',
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: mimeType,
            },
          },
          {
            text: textPrompt,
          },
        ],
      },
    });

    let imageUrl = '';
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        imageUrl = `data:${part.inlineData.mimeType || 'image/png'};base64,${part.inlineData.data}`;
        break;
      }
    }

    if (imageUrl) {
      res.json({ imageUrl });
    } else {
      res.status(500).json({ error: 'Failed to generate image' });
    }
  } catch (err: any) {
    console.error('Error generating design:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { messages } = req.body; // array of { role: 'user' | 'model', parts: [{ text: ...}, { functionCall: ... }, { functionResponse: ... }] }
    
    const ai = getAiClient();

    // Map messages to the format expected by the SDK
    const formattedMessages = messages.map((msg: any) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: msg.parts,
    }));

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-pro-preview',
      contents: formattedMessages,
      config: {
        systemInstruction: "You are an expert AI Interior Design Consultant. Help the user reimagine their room. You can provide shoppable links (using markdown links to generic searches like `[Blue Rug](https://www.google.com/search?tbm=shop&q=blue+rug)`) and suggest design improvements. If the user asks to change the room's appearance, call the redesignRoom function.",
        tools: [{ functionDeclarations: [redesignRoomFunctionDeclaration] }],
      }
    });

    res.json({ response: response.candidates?.[0]?.content });
  } catch (err: any) {
    console.error('Error in chat:', err);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '127.0.0.1', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
