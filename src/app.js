const express = require('express');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const authRouter = require('../src/routes/authRouter');
const profileRouter = require('./routes/profileRouter');
const groupRouter = require('./routes/groupRouter');
const inviteRouter = require('./routes/inviteRouter');
const PORT = process.env.PORT || 3000;
dotenv.config();
const app = express();

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))

console.log('Test', process.env.CLIENT_URL);


app.use('/auth', authRouter);
app.use('/profile', profileRouter);
app.use('/group', groupRouter);
app.use('/invite', inviteRouter);


connectDB().then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, () => {
        console.log(`Server is running on PORT: ${PORT}`);
    })
}).catch((err) => {
    console.log(`Error while Connecting to DB: ${err}`);
});