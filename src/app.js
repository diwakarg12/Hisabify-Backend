
require('dns').setDefaultResultOrder('ipv4first');
require('dotenv').config();

const express = require('express');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const cors = require('cors');

const authRouter = require('../src/routes/authRouter');
const profileRouter = require('./routes/profileRouter');
const groupRouter = require('./routes/groupRouter');
const inviteRouter = require('./routes/inviteRouter');
const expenseRouter = require('./routes/expenseRouter');
const messageRouter = require('./routes/messageRouter');

const app = express();

const allowedOrigins = process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(',').map(url => url.trim())
    : [];

const defaultOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
    'http://127.0.0.1:5173',
    'http://127.0.0.1:5174',
    'https://hisabify-app.vercel.app',
    'https://hisabify.vercel.app'
];

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

const corsOptions = {
    origin: (origin, callback) => {
        // Allow non-browser calls (like mobile apps, curl, Postman)
        if (!origin) return callback(null, true);

        // Allow configured CLIENT_URL origins & defaults
        if (allowedOrigins.includes(origin) || defaultOrigins.includes(origin)) {
            return callback(null, true);
        }

        // Allow any localhost / 127.0.0.1 port (for local dev flexibility)
        if (/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
            return callback(null, true);
        }

        // Allow Vercel preview or production deployments
        if (/^https:\/\/.*\.vercel\.app$/.test(origin)) {
            return callback(null, true);
        }

        return callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

let isConnected = false;

if (process.env.NODE_ENV === "production") {

    app.use(async (req, res, next) => {
        try {
            if (!isConnected) {
                await connectDB(); // cached connection
                isConnected = true;
                console.log("DB Connected (once)");
            }
            next();
        } catch (error) {
            console.error("DB connection failed", error);
            return res.status(500).json({ message: "Database Connection Failed" });
        }
    });

}

app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/group', groupRouter);
app.use('/invite', inviteRouter);
app.use('/expense', expenseRouter);
app.use('/message', messageRouter)

app.get('/', (req, res) => {
    res.status(200).json({ message: 'API running 🚀' });
});

if (process.env.NODE_ENV !== "production") {
    const PORT = process.env.PORT || 3000;

    connectDB()
        .then(() => {
            console.log('Database connected successfully');

            app.listen(PORT, () => {
                console.log(`Server running on PORT: ${PORT}`);
            });
        })
        .catch((err) => {
            console.error(`DB Error: ${err}`);
        });
}

module.exports = app;


