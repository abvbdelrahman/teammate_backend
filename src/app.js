const express = require('express');
require('dotenv').config();
require('express-async-errors');
const session = require('express-session');
const passport = require('passport');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const MongoStore = require('connect-mongo');
const cookieParser = require('cookie-parser');
// ✅ استيراد المسارات
const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');
const authRoutes = require('./routes/authRoutes');
const playerRoutes = require('./routes/playerRoutes');
const trainingRoutes = require('./routes/trainingRoutes');
const matchRoutes = require('./routes/matchRoutes');
const statsRoutes = require('./routes/statsRoutes');
const formationRoutes = require('./routes/formationRoutes');
const teamRoutes = require('./routes/teamRoutes');
const matchEventRoutes = require('./routes/matchEventRoutes');
const chatRoutes = require('./routes/chatRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const noteRoutes = require('./routes/noteRoutes');

// ✅ إعداد Passport (Google OAuth)
require('./services/google-strategy');



const app = express();// ✅ Middleware
app.use(cookieParser());

app.use(express.json());
app.use(morgan('dev'));

// ✅ CORS configuration
app.use(
  cors({
    origin: [
      'https://statsor.com',                // 🌍 الموقع الرسمي
      'https://teamplaymate-frontend.vercel.app', // لو بتجرب نسخة فرونت على Vercel
      'http://localhost:5173',              // React local dev server
      'http://127.0.0.1:5173',              // React local dev alt
      'http://127.0.0.1:3008'               // اللي انت كاتبه بالفعل
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  })
);


// ✅ Rate Limiter
const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again later!',
});
app.use('/api', limiter);


// ✅ Session & Passport
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'supersecretkey',
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: 'sessions',
    }),
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);
app.use(passport.initialize());
app.use(passport.session());

// ✅ Routes
app.get('/favicon.ico', (req, res) => res.status(204));

app.use('/api/auth', authRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/trainings', trainingRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/formations', formationRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/match-events', matchEventRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/payments', paymentRoutes);

// ✅ 404 handler
app.all('*', (req, res, next) => {
  next(new AppError(`Cannot find ${req.originalUrl} on this server`, 404));
});

// ✅ Global Error Handler
app.use(globalErrorHandler);

module.exports = app;
