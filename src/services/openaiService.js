const OpenAI = require('openai');
const Player = require('../models/Player');
const Match = require('../models/Match');
const Team = require('../models/Team');
const Training = require('../models/Training');
const MatchEvent = require('../models/Match-events');

class OpenAIService {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  // 🧠 توليد رد ذكي بناءً على الرسائل والسياق
  async generateChatResponse(messages, context = null) {
    try {
      const lastMessage = messages[messages.length - 1]?.content?.toLowerCase() || '';

      // 🧩 تحديد السياق تلقائيًا
      let detectedContext = context;
      if (!context) {
        if (
          lastMessage.includes('team') ||
          lastMessage.includes('match') ||
          lastMessage.includes('player') ||
          lastMessage.includes('training') ||
          lastMessage.includes('tactic')
        ) {
          detectedContext = { type: 'football_general' };
        } else if (
          lastMessage.includes('system') ||
          lastMessage.includes('program') ||
          lastMessage.includes('app') ||
          lastMessage.includes('feature') ||
          lastMessage.includes('dashboard')
        ) {
          detectedContext = { type: 'system_help' };
        }
      }

      const systemMessage = this.getSystemMessage(detectedContext);
      const fullMessages = [{ role: 'system', content: systemMessage }, ...messages];

      const completion = await this.openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        messages: fullMessages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return {
        content: completion.choices[0].message.content,
        tokens_used: completion.usage?.total_tokens || 0,
        model_used: completion.model || (process.env.OPENAI_MODEL || 'gpt-4o-mini'),
      };
    } catch (error) {
      const apiMessage =
        error?.response?.data?.error?.message || error?.message || 'Unknown OpenAI error';
      console.error('OpenAI API Error:', apiMessage);
      throw new Error(`Failed to generate AI response: ${apiMessage}`);
    }
  }

  // ⚙️ تحديد رسالة النظام حسب السياق
  getSystemMessage(context) {
    const baseMessage = `You are an AI assistant specialized in football coaching and player development.
You provide tactical insights, performance evaluations, and training advice based on modern football principles.
Always use clear, actionable, and practical explanations.`;

    if (!context) return baseMessage;

    switch (context.type) {
      case 'player_analysis':
        return `${baseMessage}
You are analyzing player: ${context.playerName || 'Unknown'} (${context.playerPosition || 'N/A'})`;

      case 'team_analysis':
        return `${baseMessage}
You are analyzing team: ${context.teamName || 'Unknown'} (${context.formation || 'N/A'})`;

      case 'match_analysis':
        return `${baseMessage}
You are analyzing match: ${context.matchDetails || 'No details provided'}`;

      case 'training_plan':
        return `${baseMessage}
You are creating a personalized training plan for: ${context.trainingContext || 'General training'}`;

      case 'football_general':
        return `You are an AI football expert.
Answer general football-related questions about tactics, positions, training, or analysis.
Be concise, insightful, and practical in your answers.`;

      case 'system_help':
        return `You are the AI assistant for a football management web application.
You help users (coaches and players) understand system features and workflows.
Explain how to use features like adding players, creating matches, generating AI reports, or viewing dashboards.
Keep explanations step-by-step and simple.`;

      default:
        return baseMessage;
    }
  }

  // 🏋️‍♂️ إنشاء خطة تدريب للاعب
  async generateTrainingRecommendations(playerId, coachId) {
    try {
      const player = await Player.findById(playerId);
      if (!player || String(player.coach) !== String(coachId)) {
        throw new Error('Player not found or access denied');
      }

      const trainings = await Training.find({ player: playerId }).sort({ date: -1 }).limit(5);
      const matches = await Match.find({ 'players.player': playerId }).sort({ date: -1 }).limit(5);

      const context = {
        type: 'training_plan',
        player: {
          name: player.name,
          position: player.position,
          age: player.age,
        },
        recentTrainings: trainings,
        recentMatches: matches,
      };

      const messages = [
        {
          role: 'user',
          content: `Generate a comprehensive training plan for ${player.name}, a ${player.position} player.
Consider recent performance and suggest specific exercises, drills, and improvements.`,
        },
      ];

      return await this.generateChatResponse(messages, context);
    } catch (error) {
      console.error('Training recommendations error:', error);
      throw error;
    }
  }

  // ⚽ تحليل الماتش
  async generateMatchAnalysis(matchId, coachId) {
    try {
      const match = await Match.findById(matchId).populate('team');
      if (!match) throw new Error('Match not found');

      const events = await MatchEvent.find({ match: matchId });
      const players = match.team?.players || [];

      const context = {
        type: 'match_analysis',
        match,
        events,
        players,
      };

      const messages = [
        {
          role: 'user',
          content: `Analyze this match (${match.opponent}) played on ${match.date}.
Provide tactical analysis, key moments, and recommendations for improvement.`,
        },
      ];

      return await this.generateChatResponse(messages, context);
    } catch (error) {
      console.error('Match analysis error:', error);
      throw error;
    }
  }

  // 👟 تحليل اللاعب
  async generatePlayerAnalysis(playerId, coachId) {
    try {
      const player = await Player.findById(playerId);
      if (!player || String(player.coach) !== String(coachId)) {
        throw new Error('Player not found or access denied');
      }

      const matches = await Match.find({ 'players.player': playerId }).limit(10);
      const events = await MatchEvent.find({ player: playerId }).limit(20);

      const context = {
        type: 'player_analysis',
        player: {
          name: player.name,
          position: player.position,
          age: player.age,
        },
        recentMatches: matches,
        recentEvents: events,
      };

      const messages = [
        {
          role: 'user',
          content: `Analyze ${player.name}, a ${player.position} player.
Provide strengths, weaknesses, and improvement areas.`,
        },
      ];

      return await this.generateChatResponse(messages, context);
    } catch (error) {
      console.error('Player analysis error:', error);
      throw error;
    }
  }

  // 🧩 تحليل الفريق
  async generateTeamAnalysis(teamId, coachId) {
    try {
      const team = await Team.findById(teamId).populate('players');
      if (!team || String(team.coach) !== String(coachId)) {
        throw new Error('Team not found or access denied');
      }

      const context = {
        type: 'team_analysis',
        teamName: team.name,
        formation: team.formation,
        players: team.players,
      };

      const messages = [
        {
          role: 'user',
          content: `Analyze team ${team.name}.
Provide tactical analysis, formation review, and improvement recommendations.`,
        },
      ];

      return await this.generateChatResponse(messages, context);
    } catch (error) {
      console.error('Team analysis error:', error);
      throw error;
    }
  }
}

module.exports = new OpenAIService();
