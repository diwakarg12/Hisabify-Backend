
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


app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}));

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


