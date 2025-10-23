const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const Coach = require('../models/Coach');

// ✅ تأكد إن المتغيرات دي موجودة في ملف .env
// GOOGLE_CLIENT_ID=your_client_id
// GOOGLE_CLIENT_SECRET=your_client_secret
// GOOGLE_CALLBACK_URL=http://localhost:3000/api/auth/google/callback

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/api/auth/google/callback',
      scope: ['profile', 'email'], // مهم جداً لجلب الإيميل
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log('🔹 Google Profile:', profile);

        const user = {
          provider: 'google',
          providerId: profile.id,
          email: profile.emails?.[0]?.value ?? null,
          name: profile.displayName ?? 'No Name',
          photo: profile.photos?.[0]?.value ?? null,
          accessToken,
        };

        // 🔸 ممكن نضيف هنا بحث أو إنشاء مستخدم في MongoDB:
        const existingCoach = await Coach.findOne({ email: user.email });
        if (!existingCoach) {
          await Coach.create({
            name: user.name,
            email: user.email,
            photo: user.photo,
            role: 'coach',
            provider: 'google',
          });
        }

        done(null, user);
      } catch (error) {
        console.error('❌ Google Strategy Error:', error);
        done(error, null);
      }
    }
  )
);

// 🚀 مش بنستخدم session في مشروعك (JWT فقط)، فممكن نخليهم كدا:
passport.serializeUser((user, done) => done(null, user));
passport.deserializeUser((user, done) => done(null, user));

module.exports = passport;
