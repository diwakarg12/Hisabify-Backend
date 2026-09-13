const mongoose = require('mongoose');

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    const MONGO_URI = process.env.MONGO_URI;
    if (!MONGO_URI) {
        throw new Error("⚠️ Please define MONGO_URI in environment variables");
    }

    // Reuse existing connection if active
    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    if (!cached.promise) {
        cached.promise = mongoose
            .connect(MONGO_URI, {
                bufferCommands: false,
            })
            .then((mongooseInstance) => {
                console.log("MongoDB connected successfully");
                return mongooseInstance;
            })
            .catch(err => {
                cached.promise = null; // Reset promise on error so retry works
                throw err;
            });
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

module.exports = connectDB;

