const Coach = require('../models/Coach');

const PLAN_PERMISSIONS = {
  free: { canExportPDF: false, maxPlayers: 5 },
  pro: { canExportPDF: true, maxPlayers: Infinity },
  custom: { canExportPDF: true, maxPlayers: Infinity },
};

exports.checkPlanPermission = (permissionKey) => {
  return async (req, res, next) => {
    try {
      const user = await Coach.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const plan = user.plan || 'free';
      const permissions = PLAN_PERMISSIONS[plan];

      if (!permissions[permissionKey]) {
        return res
          .status(403)
          .json({ message: 'Your plan does not allow this action' });
      }

      next();
    } catch (err) {
      console.error('Plan permission error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  };
};
