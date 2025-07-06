import OpenAI from 'openai';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  confidence?: number;
}

export class TranslationService {
  private openai: OpenAI;

  constructor() {
    // Initialize OpenAI
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || "default_key"
    });
  }

  async translateText(text: string, sourceLang: string = 'ja', targetLang: string = 'en'): Promise<TranslationResult> {
    return this.translateWithOpenAI(text, sourceLang, targetLang);
  }

  private async translateWithOpenAI(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult> {
    try {
      const response = await this.openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: `You are a professional translator. Translate the following Japanese text to English. Maintain the natural flow and context. Respond with JSON in this format: { "translation": "translated text" }`
          },
          {
            role: "user",
            content: text
          }
        ],
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(response.choices[0].message.content);
      
      return {
        originalText: text,
        translatedText: result.translation,
        confidence: 0.9
      };
    } catch (error) {
      console.error("OpenAI translation error:", error);
      throw new Error(`Failed to translate text: ${error.message}`);
    }
  }

  async translateBatch(texts: string[], sourceLang: string = 'ja', targetLang: string = 'en'): Promise<TranslationResult[]> {
    const translations = await Promise.all(
      texts.map(text => this.translateText(text, sourceLang, targetLang))
    );
    return translations;
  }
}

export const translationService = new TranslationService();
