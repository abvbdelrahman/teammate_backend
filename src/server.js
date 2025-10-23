const app = require('./app');
const connectDB = require('./config/db');
const PORT = process.env.PORT || 3008;

(async () => {
  try {
    await connectDB();
    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
