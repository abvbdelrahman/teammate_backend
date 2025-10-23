const express = require('express');
const router = express.Router();
const { register, login, validateToken, logout, forgotPassword, resetPassword, googleCallback,googleLogin, guestLogin } = require('../controllers/authController');
const { protect, restrictTo } = require('../middlewares/authMiddleware');


router.get('/google', googleLogin);
router.get('/google/callback', googleCallback);

router.get('/me', protect, (req, res) => {
  res.status(200).json(req.user);
});
router.post('/guest', guestLogin);
router.post('/register', register);
router.post('/login', login);
router.post('/validate-token', validateToken);
router.post('/forget-password', forgotPassword );
router.patch('/resetPassword/:token', resetPassword);

router.post('/logout', protect,logout);
module.exports = router;
