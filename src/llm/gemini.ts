import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
  throw new Error(
    "No se encontró GEMINI_API_KEY en el archivo .env",
  );
}

const ai = new GoogleGenAI({
  apiKey,
});

export async function probarGemini(): Promise<string> {
  const response = await ai.models.generateContent({
    model: "gemini-3.8-flash",
    contents:
      "Responde únicamente con esta frase: Conexion con Gemini correcta",
  });

  return response.text ?? "";
}