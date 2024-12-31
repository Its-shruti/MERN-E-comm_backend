const mongoose = require('mongoose');

const connectionString = process.env.MONGO_URI;
mongoose.connect(connectionString);
