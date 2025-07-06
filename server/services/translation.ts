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
    // Validate input
    if (!text || text.trim().length === 0) {
      throw new Error('Text to translate is required and cannot be empty');
    }

    if (text.length > 4000) {
      throw new Error('Text is too long for translation. Maximum length is 4000 characters.');
    }

    return this.translateWithOpenAI(text, sourceLang, targetLang);
  }

  private async translateWithOpenAI(text: string, sourceLang: string, targetLang: string): Promise<TranslationResult> {
    let retryCount = 0;
    const maxRetries = 3;

    while (retryCount < maxRetries) {
      try {
        const response = await this.openai.chat.completions.create({
          model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
          messages: [
            {
              role: "system",
              content: `You are a professional Japanese to English translator specializing in accurate, natural translations. 
              Maintain the original meaning while making the English sound natural and fluent. 
              Respond with JSON in this exact format: { "translation": "your translation here" }`
            },
            {
              role: "user",
              content: `Translate this Japanese text to English: "${text}"`
            }
          ],
          response_format: { type: "json_object" },
          temperature: 0.3, // Lower temperature for more consistent translations
          max_tokens: 1000
        });

        if (!response.choices || response.choices.length === 0) {
          throw new Error('No translation response received from OpenAI');
        }

        const messageContent = response.choices[0].message?.content;
        if (!messageContent) {
          throw new Error('Empty response from OpenAI');
        }

        let result;
        try {
          result = JSON.parse(messageContent);
        } catch (parseError) {
          throw new Error('Invalid JSON response from OpenAI');
        }

        if (!result.translation) {
          throw new Error('Translation not found in response');
        }

        // Validate translation quality
        const translatedText = result.translation.trim();
        if (translatedText.length === 0) {
          throw new Error('Empty translation received');
        }

        return {
          originalText: text,
          translatedText: translatedText,
          confidence: 0.95
        };
      } catch (error) {
        retryCount++;
        console.warn(`Translation attempt ${retryCount} failed:`, error);

        if (retryCount >= maxRetries) {
          console.error("OpenAI translation error after retries:", error);
          
          // Provide specific error messages
          if (error instanceof Error) {
            if (error.message.includes('API key')) {
              throw new Error('OpenAI API key is invalid or missing. Please check your configuration.');
            }
            if (error.message.includes('quota')) {
              throw new Error('OpenAI API quota exceeded. Please check your usage limits.');
            }
            if (error.message.includes('rate limit')) {
              throw new Error('Rate limit exceeded. Please try again in a few moments.');
            }
            throw new Error(`Failed to translate text: ${error.message}`);
          }
          
          throw new Error('Failed to translate text: Unknown error occurred');
        }

        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    throw new Error('Translation failed after all retries');
  }

  async translateBatch(texts: string[], sourceLang: string = 'ja', targetLang: string = 'en'): Promise<TranslationResult[]> {
    if (!texts || texts.length === 0) {
      throw new Error('No texts provided for batch translation');
    }

    // Filter out empty texts
    const validTexts = texts.filter(text => text && text.trim().length > 0);
    
    if (validTexts.length === 0) {
      throw new Error('No valid texts found for translation');
    }

    // Process translations with proper error handling
    const translationPromises = validTexts.map(async (text, index) => {
      try {
        return await this.translateText(text, sourceLang, targetLang);
      } catch (error) {
        console.error(`Failed to translate text ${index}:`, error);
        // Return a fallback translation instead of failing completely
        return {
          originalText: text,
          translatedText: `[Translation failed: ${text}]`,
          confidence: 0
        };
      }
    });

    const translations = await Promise.all(translationPromises);
    
    // Ensure we have at least some successful translations
    const successfulTranslations = translations.filter(t => t.confidence > 0);
    
    if (successfulTranslations.length === 0) {
      throw new Error('All translations failed. Please check your OpenAI API key and quota.');
    }

    return translations;
  }
}

export const translationService = new TranslationService();
