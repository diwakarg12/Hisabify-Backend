const mongoose = require('mongoose');
const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
    throw new Error("⚠️ Please define MONGO_URI in environment variables");
}

let cached = global.mongoose;

if (!cached) {
    cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
    // ✅ If connection already exists, reuse it
    if (cached.conn) {
        return cached.conn;
    }

    // ✅ If no promise, create one
    if (!cached.promise) {
        cached.promise = mongoose
            .connect(process.env.MONGO_URI, {
                bufferCommands: false,
            })
            .then((mongooseInstance) => {
                console.log("MongoDB connected");
                return mongooseInstance;
            })
            .catch(err => {
                cached.promise = null; // 🔥 reset on failure
                throw err;
            })
    }

    cached.conn = await cached.promise;
    return cached.conn;
};

module.exports = connectDB;
