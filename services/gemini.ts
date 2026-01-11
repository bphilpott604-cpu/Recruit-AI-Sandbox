
import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedAssets } from "../types";

export const generateRecruitmentSandbox = async (rawNotes: string): Promise<GeneratedAssets> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
    contents: `Raw hiring notes: ${rawNotes}`,
    config: {
      thinkingConfig: { thinkingBudget: 32768 },
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          jobDescription: {
            type: Type.STRING,
            description: "A polished LinkedIn Job Description formatted in Markdown."
          },
          interviewGuide: {
            type: Type.STRING,
            description: "An Interview Guide with 10 behavioral questions targeting soft/hard skills in Markdown."
          }
        },
        required: ["jobDescription", "interviewGuide"]
      },
      systemInstruction: "You are a world-class HR consultant and technical recruiter. Create a polished LinkedIn-ready Job Description and a 10-question behavioral interview guide based on messy notes. Use clear headings and bullet points."
    }
  });

  const text = response.text || "{}";
  return JSON.parse(text) as GeneratedAssets;
};

export const createChatSession = (systemPrompt: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: systemPrompt,
    },
  });
};
