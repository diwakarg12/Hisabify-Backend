const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const cors = require('cors');
dotenv.config();

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



app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/group', groupRouter);
app.use('/invite', inviteRouter);
app.use('/expense', expenseRouter);
app.use('/message', messageRouter)

connectDB();

module.exports = app;



//We can do this if the platform where we have to deploy the application is not serverless

// const PORT = process.env.PORT || 3000;

// connectDB().then(() => {
//     console.log('Database connected successfully');
//     app.listen(PORT, () => {
//         console.log(`Server is running on PORT: ${PORT}`);
//     })
// }).catch((err) => {
//     console.log(`Error while Connecting to DB: ${err}`);
// });