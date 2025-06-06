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

app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.CLIENT_URL,
    credentials: true
}))


app.use('/auth', authRouter);
app.use('/profile', profileRouter);


connectDB().then(() => {
    console.log('Database connected successfully');
    app.listen(PORT, () => {
        console.log(`Server is running on PORT: ${PORT}`);
    })
}).catch((err) => {
    console.log(`Error while Connecting to DB: ${err}`);
});