/**
 * Training module: Handles AI improvement through feedback, data collection, and automatic learning from real debates.
 * Collects training data from real parliamentary debates, university competitions, and historical debates.
 */

const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const cheerio = require('cheerio');

class DebateTrainer {
  constructor() {
    this.feedbackData = [];
    this.trainingDataPath = path.join(__dirname, '../../data/training_data.json');
    this.realDebateDataPath = path.join(__dirname, '../../data/real_debates.json');
    this.initializeTrainingData();
    this.initializeRealDebateData();
    this.startAutoTraining();
  }

  async initializeTrainingData() {
    try {
      await fs.access(this.trainingDataPath);
    } catch {
      // Create training data file if it doesn't exist
      await fs.writeFile(this.trainingDataPath, JSON.stringify({
        debates: [],
        feedback: [],
        improvements: []
      }, null, 2));
    }
  }

  /**
   * Store debate session data for training
   */
  async storeDebateSession(sessionData) {
    try {
      const data = JSON.parse(await fs.readFile(this.trainingDataPath, 'utf8'));
      data.debates.push({
        timestamp: new Date().toISOString(),
        motion: sessionData.motion,
        aiSide: sessionData.aiSide,
        userSide: sessionData.userSide,
        rounds: sessionData.rounds,
        winner: sessionData.winner || null
      });
      await fs.writeFile(this.trainingDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error storing debate session:', error);
    }
  }

  /**
   * Collect user feedback on AI responses
   */
  async collectFeedback(feedback) {
    try {
      const data = JSON.parse(await fs.readFile(this.trainingDataPath, 'utf8'));
      data.feedback.push({
        timestamp: new Date().toISOString(),
        type: feedback.type, // 'rating', 'comment', 'suggestion'
        round: feedback.round,
        motion: feedback.motion,
        rating: feedback.rating, // 1-5 scale
        comment: feedback.comment,
        suggestion: feedback.suggestion
      });
      await fs.writeFile(this.trainingDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error collecting feedback:', error);
    }
  }

  /**
   * Analyze feedback patterns and generate improvement suggestions
   */
  async analyzeFeedback() {
    try {
      const data = JSON.parse(await fs.readFile(this.trainingDataPath, 'utf8'));
      const feedback = data.feedback;

      const analysis = {
        averageRating: feedback.reduce((sum, f) => sum + (f.rating || 0), 0) / feedback.length,
        commonIssues: this.identifyCommonIssues(feedback),
        improvementAreas: this.suggestImprovements(feedback),
        timestamp: new Date().toISOString()
      };

      data.improvements.push(analysis);
      await fs.writeFile(this.trainingDataPath, JSON.stringify(data, null, 2));

      return analysis;
    } catch (error) {
      console.error('Error analyzing feedback:', error);
      return null;
    }
  }

  identifyCommonIssues(feedback) {
    const issues = {};
    feedback.forEach(f => {
      if (f.comment) {
        // Simple keyword analysis
        const keywords = ['fact', 'evidence', 'logic', 'tone', 'argument', 'rebuttal'];
        keywords.forEach(keyword => {
          if (f.comment.toLowerCase().includes(keyword)) {
            issues[keyword] = (issues[keyword] || 0) + 1;
          }
        });
      }
    });
    return issues;
  }

  suggestImprovements(feedback) {
    const suggestions = [];
    const issues = this.identifyCommonIssues(feedback);

    if (issues.fact > issues.evidence) {
      suggestions.push('Improve factual accuracy and source citations');
    }
    if (issues.logic > 2) {
      suggestions.push('Strengthen logical reasoning and argument structure');
    }
    if (issues.tone > 1) {
      suggestions.push('Better adapt to different debate tones');
    }
    if (issues.rebuttal > 1) {
      suggestions.push('Improve counter-argument effectiveness');
    }

    return suggestions;
  }

  /**
   * Generate improved prompts based on feedback analysis
   */
  async generateImprovedPrompts() {
    const analysis = await this.analyzeFeedback();
    if (!analysis) return null;

    const improvements = {
      systemPromptEnhancements: [],
      roundPromptEnhancements: [],
      parameterAdjustments: {}
    };

    if (analysis.averageRating < 3.5) {
      improvements.systemPromptEnhancements.push(
        'Add more emphasis on evidence-based arguments and fact-checking'
      );
    }

    if (analysis.improvementAreas.includes('Improve factual accuracy')) {
      improvements.roundPromptEnhancements.push(
        'Include specific instructions for citing sources and verifying facts'
      );
    }

    if (analysis.improvementAreas.includes('Strengthen logical reasoning')) {
      improvements.parameterAdjustments.temperature = 0.5; // More focused
      improvements.parameterAdjustments.maxTokens = 600; // More detailed
    }

    return improvements;
  }

  /**
   * Initialize real debate data collection
   */
  async initializeRealDebateData() {
    try {
      await fs.access(this.realDebateDataPath);
    } catch {
      // Create real debate data file if it doesn't exist
      await fs.writeFile(this.realDebateDataPath, JSON.stringify({
        parliamentaryDebates: [],
        universityCompetitions: [],
        historicalDebates: [],
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }
  }

  /**
   * Start automatic training process
   */
  startAutoTraining() {
    if(process.env.ENABLE_REAL_DATA === 'true') {
      // Collect real debate data every 24 hours
      setInterval(() => {
        this.collectRealDebateData();
      }, 24 * 60 * 60 * 1000); // 24 hours

      // Analyze and improve every 7 days
      setInterval(() => {
        this.analyzeAndImprove();
      }, 7 * 24 * 60 * 60 * 1000); // 7 days

      // Initial collection
      this.collectRealDebateData();
    } else {
      console.warn(
        'Real debate data collection disabled because ENABLE_REAL_DATA !== true.'
      );
    }
  }

  /**
   * Collect real debate data from various sources
   */
  async collectRealDebateData() {
    try {
      console.log('Collecting real debate data...');

      // Collect from parliamentary sources
      await this.collectParliamentaryDebates();

      // Collect from university debate competitions
      await this.collectUniversityDebates();

      // Collect historical debates
      await this.collectHistoricalDebates();

      console.log('Real debate data collection completed.');
    } catch (error) {
      console.error('Error collecting real debate data:', error);
    }
  }

  /**
   * Collect parliamentary debate transcripts
   */
  async collectParliamentaryDebates() {
    try {
      // Example: UK Parliament Hansard (simplified)
      const sources = [
        'https://hansard.parliament.uk/',
        // Add more parliamentary sources
      ];

      const buildProxyUrl = url =>
        `https://r.jina.ai/http/${url.replace(/^https?:\/\//, '')}`;
      for (const source of sources) {
        try {
          const target =
            source.includes('hansard.parliament.uk') || source.includes('bp.com')
              ? buildProxyUrl(source)
              : source;
          const response = await axios.get(target, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
              Accept: 'text/html,application/xhtml+xml'
            }
          });
          const $ = cheerio.load(response.data);

          // Extract debate motions and arguments
          $('.debate-motion, .motion-text').each((i, elem) => {
            const motion = $(elem).text().trim();
            const debateArgs = $(elem).next('.debate-arguments').text().trim();

            if (motion && debateArgs) {
              this.storeRealDebate({
                type: 'parliamentary',
                motion,
                arguments: debateArgs,
                source,
                timestamp: new Date().toISOString()
              });
            }
          });
        } catch (error) {
          console.error(`Error collecting from ${source}:`, error);
        }
      }
    } catch (error) {
      console.error('Error collecting parliamentary debates:', error);
    }
  }

  /**
   * Collect university debate competition data
   */
  async collectUniversityDebates() {
    try {
      // Example: World Universities Debating Championship, BP Debates, etc.
      const sources = [
        'https://wudc.org/',
        'https://www.bp.com/en/global/corporate/sustainability/debates.html',
        // Add more university debate sources
      ];

      for (const source of sources) {
        try {
          const response = await axios.get(source);
          const $ = cheerio.load(response.data);

          // Extract debate motions and winning arguments
          $('.debate-topic, .motion').each((i, elem) => {
            const motion = $(elem).text().trim();
            const winnerArgs = $(elem).next('.winning-arguments').text().trim();

            if (motion && winnerArgs) {
              this.storeRealDebate({
                type: 'university',
                motion,
                arguments: winnerArgs,
                source,
                timestamp: new Date().toISOString()
              });
            }
          });
        } catch (error) {
          console.error(`Error collecting from ${source}:`, error);
        }
      }
    } catch (error) {
      console.error('Error collecting university debates:', error);
    }
  }

  /**
   * Collect historical debate transcripts
   */
  async collectHistoricalDebates() {
    try {
      // Example: Famous historical debates
      const historicalDebates = [
        {
          motion: 'This House believes that democracy is the best form of government',
          arguments: {
            pro: 'Democracy ensures representation, accountability, and peaceful power transitions...',
            con: 'Democracy can lead to tyranny of the majority and inefficient decision-making...'
          }
        },
        // Add more historical debates
      ];

      for (const debate of historicalDebates) {
        this.storeRealDebate({
          type: 'historical',
          motion: debate.motion,
          debateArgs: JSON.stringify(debate.arguments),
          source: 'historical_records',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error) {
      console.error('Error collecting historical debates:', error);
    }
  }

  /**
   * Store real debate data
   */
  async storeRealDebate(debateData) {
    try {
      const data = JSON.parse(await fs.readFile(this.realDebateDataPath, 'utf8'));

      switch (debateData.type) {
        case 'parliamentary':
          data.parliamentaryDebates.push(debateData);
          break;
        case 'university':
          data.universityCompetitions.push(debateData);
          break;
        case 'historical':
          data.historicalDebates.push(debateData);
          break;
      }

      data.lastUpdated = new Date().toISOString();
      await fs.writeFile(this.realDebateDataPath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('Error storing real debate data:', error);
    }
  }

  /**
   * Analyze real debate data and improve AI prompts
   */
  async analyzeAndImprove() {
    try {
      console.log('Analyzing real debate data for improvements...');

      const realData = JSON.parse(await fs.readFile(this.realDebateDataPath, 'utf8'));
      const trainingData = JSON.parse(await fs.readFile(this.trainingDataPath, 'utf8'));

      // Analyze patterns from real debates
      const patterns = this.analyzeDebatePatterns(realData);

      // Generate improved system prompts
      const improvedPrompts = this.generateAdvancedPrompts(patterns);

      // Update training data with insights
      trainingData.improvements.push({
        timestamp: new Date().toISOString(),
        type: 'real_debate_analysis',
        patterns,
        improvedPrompts
      });

      await fs.writeFile(this.trainingDataPath, JSON.stringify(trainingData, null, 2));

      console.log('AI improvement completed based on real debate analysis.');
    } catch (error) {
      console.error('Error analyzing and improving:', error);
    }
  }

  /**
   * Analyze patterns from real debate data
   */
  analyzeDebatePatterns(realData) {
    const patterns = {
      commonStructures: [],
      effectiveArguments: [],
      rebuttalTechniques: [],
      evidenceUsage: []
    };

    // Analyze parliamentary debates
    realData.parliamentaryDebates.forEach(debate => {
      // Extract argument structures
      if (debate.arguments.includes('evidence') || debate.arguments.includes('statistics')) {
        patterns.evidenceUsage.push('Strong evidence-based arguments');
      }
      if (debate.arguments.includes('counter') || debate.arguments.includes('however')) {
        patterns.rebuttalTechniques.push('Effective counter-arguments');
      }
    });

    // Analyze university competitions
    realData.universityCompetitions.forEach(debate => {
      patterns.effectiveArguments.push(debate.arguments);
    });

    return patterns;
  }

  /**
   * Generate advanced prompts based on real debate analysis
   */
  generateAdvancedPrompts(patterns) {
    const prompts = {
      systemPrompt: `You are an expert debater trained on real parliamentary debates, university competitions, and historical arguments. Your responses should demonstrate:

1. **Evidence-Based Reasoning**: Always support claims with verifiable evidence and statistics
2. **Logical Structure**: Use clear premises, warrants, and conclusions
3. **Strategic Rebuttals**: Address opponents' arguments directly and effectively
4. **Professional Tone**: Maintain appropriate formality while being persuasive
5. **Comprehensive Analysis**: Consider multiple perspectives and implications

Key techniques from real debates:
${patterns.effectiveArguments.slice(0, 5).join('\n- ')}

Structure your arguments like professional debaters:
- Start with a clear thesis
- Provide evidence and reasoning
- Anticipate and address counter-arguments
- End with a strong conclusion`,

      roundPrompts: {
        opening: 'Present your main arguments with strong evidence and clear structure.',
        rebuttal: 'Directly address your opponent\'s key points with specific counter-evidence.',
        closing: 'Summarize your strongest arguments and explain why they win the debate.'
      }
    };

    return prompts;
  }

  /**
   * Export training data for external model fine-tuning
   */
  async exportTrainingData() {
    try {
      const data = JSON.parse(await fs.readFile(this.trainingDataPath, 'utf8'));
      const realData = JSON.parse(await fs.readFile(this.realDebateDataPath, 'utf8'));
      const exportPath = path.join(__dirname, '../../data/training_export.json');

      // Combine user training data with real debate data
      const fineTuneData = [
        // User-generated debates
        ...data.debates.map(debate => ({
          messages: [
            {
              role: 'system',
              content: 'You are a skilled debater. Respond with well-reasoned arguments.'
            },
            {
              role: 'user',
              content: `Motion: ${debate.motion}\nPosition: ${debate.aiSide}\nGenerate a debate response.`
            },
            {
              role: 'assistant',
              content: debate.rounds.map(r => r.aiResponse).join('\n\n')
            }
          ]
        })),
        // Real debate examples
        ...realData.parliamentaryDebates.slice(0, 50).map(debate => ({
          messages: [
            {
              role: 'system',
              content: 'You are an expert parliamentary debater.'
            },
            {
              role: 'user',
              content: `Motion: ${debate.motion}\nProvide a professional debate response.`
            },
            {
              role: 'assistant',
              content: debate.arguments
            }
          ]
        })),
        ...realData.universityCompetitions.slice(0, 50).map(debate => ({
          messages: [
            {
              role: 'system',
              content: 'You are a competitive debater in a university tournament.'
            },
            {
              role: 'user',
              content: `Motion: ${debate.motion}\nDeliver a winning debate speech.`
            },
            {
              role: 'assistant',
              content: debate.arguments
            }
          ]
        }))
      ];

      await fs.writeFile(exportPath, JSON.stringify(fineTuneData, null, 2));
      return exportPath;
    } catch (error) {
      console.error('Error exporting training data:', error);
      return null;
    }
  }
}

module.exports = { DebateTrainer };
