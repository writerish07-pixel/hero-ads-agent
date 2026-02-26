'use strict';

const OpenAI = require('openai');
const axios = require('axios');
const logger = require('../config/logger');

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';

/**
 * AI Service – wraps OpenAI (primary) with Gemini (fallback) for generating
 * ad copy, keyword suggestions, performance analysis, and ad scoring.
 */
class AIService {
  constructor() {
    this.openaiKey = process.env.OPENAI_API_KEY;
    this.geminiKey = process.env.GEMINI_API_KEY;

    this.openai = this.openaiKey
      ? new OpenAI({ apiKey: this.openaiKey })
      : null;

    if (!this.openaiKey) {
      logger.warn('AIService: OPENAI_API_KEY not set');
    }
    if (!this.geminiKey) {
      logger.warn('AIService: GEMINI_API_KEY not set – no fallback available');
    }
  }

  // ── Core chat completion ──────────────────────────────────────────────────

  /**
   * Call OpenAI chat completion; falls back to Gemini on failure.
   * @param {string} systemPrompt
   * @param {string} userPrompt
   * @returns {Promise<string>} Raw text response
   */
  async _complete(systemPrompt, userPrompt) {
    // Try OpenAI first
    if (this.openai) {
      try {
        const response = await this.openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 1024,
        });
        return response.choices[0].message.content;
      } catch (err) {
        logger.warn('OpenAI call failed, trying Gemini fallback', { error: err.message });
      }
    }

    // Gemini fallback
    if (this.geminiKey) {
      try {
        const { data } = await axios.post(
          `${GEMINI_API_URL}?key=${this.geminiKey}`,
          {
            contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
          }
        );
        return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      } catch (err) {
        logger.error('Gemini fallback also failed', { error: err.message });
      }
    }

    // Static fallback when no API keys are available
    logger.warn('AIService: no API keys configured – returning mock response');
    return null;
  }

  // ── Public methods ────────────────────────────────────────────────────────

  /**
   * Generate ad copy variants for a campaign.
   * @param {{ campaignName, objective, targetAudience, industry, tone, platform, numVariants }} context
   * @returns {Promise<{ variants: Array, metadata: object }>}
   */
  async generateAdCopy(context) {
    const { campaignName, objective, targetAudience, industry, tone, platform, numVariants = 3, additionalContext } = context;

    const systemPrompt = `You are an expert digital advertising copywriter specialising in high-conversion ad copy.
Generate compelling ad copy that drives action. Always respond with a valid JSON object.`;

    const userPrompt = `Create ${numVariants} ad copy variants for the following campaign:
- Campaign Name: ${campaignName}
- Objective: ${objective}
- Target Audience: ${targetAudience}
- Industry: ${industry}
- Tone: ${tone}
- Platform: ${platform}
${additionalContext ? `- Additional Context: ${additionalContext}` : ''}

Respond with JSON in this exact format:
{
  "variants": [
    {
      "headline": "string (max 30 chars for Google, 40 for Meta)",
      "description": "string (max 90 chars)",
      "callToAction": "string",
      "score": number (0-100)
    }
  ]
}`;

    const raw = await this._complete(systemPrompt, userPrompt);

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return { ...parsed, metadata: { model: 'gpt-4o-mini', generatedAt: new Date().toISOString() } };
      } catch {
        logger.warn('AIService: failed to parse JSON response, returning mock');
      }
    }

    return this._mockAdCopy(numVariants);
  }

  /**
   * Suggest keywords based on business context.
   * @param {{ businessContext: string, industry?: string }} context
   * @returns {Promise<{ keywords: Array }>}
   */
  async suggestKeywords(context) {
    const { businessContext, industry } = context;

    const systemPrompt = `You are a PPC keyword research expert. Respond with valid JSON only.`;
    const userPrompt = `Suggest 15 high-intent keywords for:
- Business: ${businessContext}
${industry ? `- Industry: ${industry}` : ''}

Respond with JSON:
{
  "keywords": [
    { "keyword": "string", "matchType": "broad|phrase|exact", "estimatedCPC": number, "intent": "informational|navigational|transactional" }
  ]
}`;

    const raw = await this._complete(systemPrompt, userPrompt);

    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        logger.warn('AIService.suggestKeywords: parse error, using mock');
      }
    }

    return this._mockKeywords();
  }

  /**
   * Analyse campaign performance and return AI-generated insights.
   * @param {object} metricsData
   * @returns {Promise<{ insights: string[], recommendations: string[] }>}
   */
  async analyzePerformance(metricsData) {
    const systemPrompt = `You are a digital advertising performance analyst. Respond with valid JSON only.`;
    const userPrompt = `Analyse the following campaign metrics and provide actionable insights:
${JSON.stringify(metricsData, null, 2)}

Respond with JSON:
{
  "insights": ["string"],
  "recommendations": ["string"],
  "overallScore": number (0-100)
}`;

    const raw = await this._complete(systemPrompt, userPrompt);

    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        logger.warn('AIService.analyzePerformance: parse error, using mock');
      }
    }

    return {
      insights: ['CTR is above industry average', 'CPL trending downward over last 7 days'],
      recommendations: ['Increase budget on top-performing ad sets', 'Test new audience segments for lower CPL'],
      overallScore: 72,
    };
  }

  /**
   * Score an individual ad copy on quality and predicted performance.
   * @param {{ headline: string, description: string, callToAction: string }} adCopy
   * @returns {Promise<{ score: number, feedback: string[] }>}
   */
  async scoreAd(adCopy) {
    const systemPrompt = `You are a digital advertising quality scorer. Respond with valid JSON only.`;
    const userPrompt = `Score the following ad copy (0-100) and provide improvement feedback:
Headline: "${adCopy.headline}"
Description: "${adCopy.description}"
CTA: "${adCopy.callToAction}"

Respond with JSON:
{ "score": number, "feedback": ["string"], "strengths": ["string"], "weaknesses": ["string"] }`;

    const raw = await this._complete(systemPrompt, userPrompt);

    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        logger.warn('AIService.scoreAd: parse error, using mock');
      }
    }

    return {
      score: 70,
      feedback: ['Consider adding a sense of urgency', 'Include a specific benefit in the headline'],
      strengths: ['Clear call-to-action', 'Concise description'],
      weaknesses: ['Headline lacks differentiation'],
    };
  }

  // ── Mock data ─────────────────────────────────────────────────────────────
  _mockAdCopy(numVariants) {
    const variants = Array.from({ length: numVariants }, (_, i) => ({
      headline: `Unlock Your Business Potential ${i + 1}`,
      description: 'Connect with your ideal customers and grow your revenue with targeted ad campaigns.',
      callToAction: 'Get Started Free',
      score: 75 + i * 3,
    }));
    return { variants, metadata: { model: 'mock', generatedAt: new Date().toISOString() } };
  }

  _mockKeywords() {
    return {
      keywords: [
        { keyword: 'best insurance quote', matchType: 'exact', estimatedCPC: 3.5, intent: 'transactional' },
        { keyword: 'affordable home insurance', matchType: 'phrase', estimatedCPC: 2.8, intent: 'transactional' },
        { keyword: 'car insurance comparison', matchType: 'broad', estimatedCPC: 2.1, intent: 'informational' },
        { keyword: 'life insurance rates', matchType: 'exact', estimatedCPC: 4.2, intent: 'transactional' },
        { keyword: 'insurance near me', matchType: 'phrase', estimatedCPC: 1.9, intent: 'navigational' },
      ],
    };
  }
}

module.exports = AIService;
