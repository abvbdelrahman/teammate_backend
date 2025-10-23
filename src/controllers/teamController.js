// src/controllers/teamController.js
const Team = require('../models/Team');
const Player = require('../models/Player');
const Formation = require('../models/Formation');
const TeamPlayer = require('../models/TeamPlayer');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// ✅ إنشاء فريق جديد
exports.createTeam = catchAsync(async (req, res, next) => {
  const coachId = req.user.id;
  const { name, description, logo_url, formation, is_active = true } = req.body;

  const team = await Team.create({
    coach: coachId,
    name,
    description,
    logo_url,
    formation,
    is_active,
  });

  res.status(201).json(team);
});

// ✅ جلب كل الفرق
exports.getTeams = catchAsync(async (req, res, next) => {
  const { role, id: userId } = req.user;
  const { is_active } = req.query;

  let filter = role === 'admin' ? {} : { coach: userId };
  if (is_active !== undefined) filter.is_active = is_active === 'true';

  const teams = await Team.find(filter);
  res.status(200).json({teams, count: teams.length});
});

// ✅ جلب فريق واحد مع اللاعبين والتشكيلة
exports.getTeam = catchAsync(async (req, res, next) => {
  const { role, id: userId } = req.user;
  const team = await Team.findById(req.params.id);
  if (!team) return next(new AppError('Team not found', 404));

  if (role !== 'admin' && team.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  const teamPlayers = await TeamPlayer.find({ team: team._id, is_active: true }).populate('player');
  let formation = null;
  if (team.formation) formation = await Formation.findById(team.formation);

  res.status(200).json({
    ...team.toObject(),
    players: teamPlayers,
    formation,
  });
});

// ✅ تحديث الفريق
exports.updateTeam = catchAsync(async (req, res, next) => {
  const { role, id: userId } = req.user;
  const team = await Team.findById(req.params.id);
  if (!team) return next(new AppError('Team not found', 404));

  if (role !== 'admin' && team.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  const updatedTeam = await Team.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.status(200).json(updatedTeam);
});

// ✅ حذف الفريق مع اللاعبين
exports.deleteTeam = catchAsync(async (req, res, next) => {
  const { role, id: userId } = req.user;
  const team = await Team.findById(req.params.id);
  if (!team) return next(new AppError('Team not found', 404));

  if (role !== 'admin' && team.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  await TeamPlayer.deleteMany({ team: team._id });
  await Team.findByIdAndDelete(team._id);

  res.status(200).json({ message: 'Team removed' });
});

// ✅ إضافة لاعب للفريق
exports.addPlayerToTeam = catchAsync(async (req, res, next) => {
  const { teamId } = req.params;
  const { playerId, position_in_team = 'Regular', jersey_number } = req.body;
  const { role, id: userId } = req.user;

  const team = await Team.findById(teamId);
  if (!team) return next(new AppError('Team not found', 404));
  if (role !== 'admin' && team.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  const player = await Player.findById(playerId);
  if (!player) return next(new AppError('Player not found', 404));
  if (role !== 'admin' && player.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  const existing = await TeamPlayer.findOne({ team: teamId, player: playerId });
  if (existing) return next(new AppError('Player already in this team', 400));

  const assignment = await TeamPlayer.create({
    team: teamId,
    player: playerId,
    position_in_team,
    jersey_number,
    is_active: true,
  });

  res.status(201).json(assignment);
});

// ✅ إزالة لاعب من الفريق
exports.removePlayerFromTeam = catchAsync(async (req, res, next) => {
  const { teamId, playerId } = req.params;
  const { role, id: userId } = req.user;

  const team = await Team.findById(teamId);
  if (!team) return next(new AppError('Team not found', 404));
  if (role !== 'admin' && team.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  await TeamPlayer.deleteOne({ team: teamId, player: playerId });
  res.status(200).json({ message: 'Player removed from team' });
});

// ✅ تحديث بيانات لاعب في الفريق
exports.updatePlayerInTeam = catchAsync(async (req, res, next) => {
  const { teamId, playerId } = req.params;
  const { position_in_team, jersey_number, is_active } = req.body;
  const { role, id: userId } = req.user;

  const team = await Team.findById(teamId);
  if (!team) return next(new AppError('Team not found', 404));
  if (role !== 'admin' && team.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  const updated = await TeamPlayer.findOneAndUpdate(
    { team: teamId, player: playerId },
    { position_in_team, jersey_number, is_active },
    { new: true }
  );

  res.status(200).json(updated);
});

// ✅ إحصائيات الفريق
exports.getTeamStats = catchAsync(async (req, res, next) => {
  const { teamId } = req.params;
  const { role, id: userId } = req.user;

  const team = await Team.findById(teamId);
  if (!team) return next(new AppError('Team not found', 404));
  if (role !== 'admin' && team.coach.toString() !== userId) {
    return next(new AppError('Forbidden', 403));
  }

  const teamPlayers = await TeamPlayer.find({ team: teamId, is_active: true }).populate('player');
  const players = teamPlayers.map(tp => tp.player);

  if (!players.length) {
    return res.status(200).json({
      total_players: 0,
      avg_age: null,
      positions_breakdown: [],
      total_goals: 0,
      total_assists: 0,
      total_matches: 0,
    });
  }

  const totalPlayers = players.length;
  const avgAge = players.reduce((sum, p) => sum + (p.age || 0), 0) / totalPlayers;
  const totalGoals = players.reduce((sum, p) => sum + (p.goals || 0), 0);
  const totalAssists = players.reduce((sum, p) => sum + (p.assists || 0), 0);

  const positionsBreakdown = Object.entries(
    players.reduce((acc, p) => {
      const pos = p.position || 'Unknown';
      acc[pos] = (acc[pos] || 0) + 1;
      return acc;
    }, {})
  ).map(([position, count]) => ({ position, count }));

  const totalMatches = players.reduce((sum, p) => sum + (p.matchesPlayed || 0), 0);

  res.status(200).json({
    total_players: totalPlayers,
    avg_age: Number(avgAge.toFixed(2)),
    positions_breakdown: positionsBreakdown,
    total_goals: totalGoals,
    total_assists: totalAssists,
    total_matches: totalMatches,
  });
});
