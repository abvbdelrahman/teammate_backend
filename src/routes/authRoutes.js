const express = require('express');
const router = express.Router();

const {
  register,
  login,
  validateToken,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  updateSportPreference,
  googleCallback,
  verifyResetCode,
  googleLogin,
  guestLogin,
} = require('../controllers/authController');

const { protect } = require('../middlewares/authMiddleware');

// 🔗 Google OAuth
router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

// 👤 Guest login
router.post('/guest', guestLogin);

// 🧍 Register & Login
router.post('/register', register);
router.post('/login', login);

// ✅ Token validation & refresh
router.post('/validate-token', validateToken);
router.post('/refresh-token', refreshToken);

// 🔐 Password reset flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

// ⚽ Update user sport preference
router.patch('/sport', protect, updateSportPreference);

// 🚪 Logout
router.post('/logout', protect, logout);

// 🧾 Authenticated user info
router.get('/me', protect, (req, res) => {
  res.status(200).json({ success: true, user: req.user });
});

module.exports = router;
