const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// Suppress strictQuery deprecation warning
mongoose.set('strictQuery', false);

// Connect to MongoDB
const connectDB = async () => {
  try {
    // Check if MongoDB URI is defined
    if (!process.env.MONGO_URI) {
      console.error('Error: MONGO_URI is not defined in environment variables');
      console.error(`Looking for .env file at: ${path.resolve(__dirname, '../../.env')}`);
      console.error('Please create a .env file with MONGO_URI=your_mongodb_connection_string');
      process.exit(1);
    }
    
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error connecting to MongoDB: ${error.message}`);
    process.exit(1);
  }
};



module.exports = {
  connectDB,
};
