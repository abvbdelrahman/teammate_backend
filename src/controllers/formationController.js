const Formation = require('../models/Formation');
const FormationPosition = require('../models/FormationPosition');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

// إنشاء تشكيلية جديدة مع المراكز
exports.createFormation = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot create formations', 403);

    const coachId = req.user.id;
    const { 
        name, 
        description, 
        formation_type = 'balanced', 
        difficulty_level = 'intermediate',
        is_default = false,
        positions = []
    } = req.body;

    const formation = await Formation.create({
        coach: coachId,
        name,
        description,
        formation_type,
        difficulty_level,
        is_default
    });

    // إضافة المراكز إذا موجودة
    if (positions && positions.length > 0) {
        const positionDocs = positions.map(pos => ({
            formation: formation._id,
            positionName: pos.positionName,
            coordinates: { x: pos.x, y: pos.y },
            notes: pos.notes || '',
            createdBy: coachId
        }));
        await FormationPosition.insertMany(positionDocs);
    }

    res.status(201).json(formation);
});

// جلب كل التشكيلات
exports.getFormations = catchAsync(async (req, res) => {
    const coachId = req.user.id;
    const { formation_type, difficulty_level, is_default } = req.query;

    const filter = { coach: coachId };
    if (formation_type) filter.formation_type = formation_type;
    if (difficulty_level) filter.difficulty_level = difficulty_level;
    if (is_default !== undefined) filter.is_default = is_default === 'true';

    const formations = await Formation.find(filter);
    res.json(formations);
});

// جلب تشكيلية معينة مع المراكز
exports.getFormation = catchAsync(async (req, res) => {
    const formation = await Formation.findById(req.params.id);
    if (!formation) throw new AppError('Formation not found', 404);

    if (formation.coach.toString() !== req.user.id && !['admin', 'guest'].includes(req.user.role)) {
        throw new AppError('Forbidden', 403);
    }

    const positions = await FormationPosition.find({ formation: formation._id })
        .sort({ 'coordinates.y': -1 });

    res.json({ ...formation.toObject(), positions });
});

// تحديث تشكيلية
exports.updateFormation = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot update formations', 403);

    const formation = await Formation.findById(req.params.id);
    if (!formation) throw new AppError('Formation not found', 404);
    if (formation.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    Object.assign(formation, req.body);
    await formation.save();

    res.json(formation);
});

// حذف تشكيلية ومراكزها
exports.deleteFormation = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot delete formations', 403);

    const formation = await Formation.findById(req.params.id);
    if (!formation) throw new AppError('Formation not found', 404);
    if (formation.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    await FormationPosition.deleteMany({ formation: formation._id });
    await formation.deleteOne();

    res.json({ message: 'Formation removed' });
});

// إضافة مركز جديد
exports.addPosition = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot add positions', 403);

    const { formationId } = req.params;
    const formation = await Formation.findById(formationId);
    if (!formation) throw new AppError('Formation not found', 404);
    if (formation.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    const { positionName, x, y, notes } = req.body;
    if (!positionName || x == null || y == null) {
        throw new AppError('positionName, x and y are required', 400);
    }

    const position = await FormationPosition.create({
        formation: formation._id,
        positionName,
        coordinates: { x, y },
        notes: notes || '',
        createdBy: req.user.id
    });

    res.status(201).json(position);
});

// تحديث مركز
exports.updatePosition = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot update positions', 403);

    const { formationId, positionId } = req.params;
    const formation = await Formation.findById(formationId);
    if (!formation) throw new AppError('Formation not found', 404);
    if (formation.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    const position = await FormationPosition.findById(positionId);
    if (!position) throw new AppError('Position not found', 404);

    Object.assign(position, req.body);
    await position.save();

    res.json(position);
});

// حذف مركز
exports.deletePosition = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot delete positions', 403);

    const { formationId, positionId } = req.params;
    const formation = await Formation.findById(formationId);
    if (!formation) throw new AppError('Formation not found', 404);
    if (formation.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    await FormationPosition.findByIdAndDelete(positionId);
    res.json({ message: 'Position removed' });
});

// تعيين تشكيلية كافتراضية
exports.setDefaultFormation = catchAsync(async (req, res) => {
    if (req.user.role === 'guest') throw new AppError('Guests cannot modify formations', 403);

    const { formationId } = req.params;
    const formation = await Formation.findById(formationId);
    if (!formation) throw new AppError('Formation not found', 404);
    if (formation.coach.toString() !== req.user.id) throw new AppError('Forbidden', 403);

    await Formation.updateMany({ coach: req.user.id }, { is_default: false });
    formation.is_default = true;
    await formation.save();

    res.json(formation);
});
