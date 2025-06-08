const express = require('express');
const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { signupValidation, loginValidation } = require('../utils/apiValidation');
const logEvent = require('../utils/logger')
const userAuth = require('../middlewares/userAuth.middleware')
const authRouter = express.Router();

authRouter.post('/signup', async (req, res) => {
    try {
        signupValidation(req.body);
        const { firstName, lastName, gender, dob, phone, email, password } = req.body;

        const existingUser = await User.findOne({
            $or: [
                { email: email },
                { phone: phone }
            ]
        });
        if (existingUser) {
            return res.status(400).json({ message: "user Already Exist with given Email or Phone" })
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstName: firstName,
            lastName: lastName,
            dob: dob,
            gender: gender,
            phone: phone,
            email: email,
            password: passwordHash
        });

        const token = jwt.sign({ _id: user._id }, "Diwakar@123", { expiresIn: "1d" })
        console.log('Token', token);
        if (!token) {
            res.status(401).json({ message: "Erro while Generating token," })
        }
        res.cookie('token', token)
        const logData = {
            action: 'USER_SIGNUP',
            description: "User signed up successfully",
            performedBy: user._id,
            meta: {
                Name: user.firstName + " " + user.lastName,
                email: user.email
            },
        };
        await logEvent(logData)

        res.status(200).json({ message: "User Created successfully", user: user })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});


authRouter.post('/login', async (req, res) => {
    try {
        loginValidation(req.body);
        const { email, password } = req.body;
        const user = await User.findOne({ email: email });
        if (!user) {
            return res.status(404).json({ message: "Invalid Credential" });
        }
        const pass = await bcrypt.compare(password, user.password);
        if (!pass) {
            return res.status(404).json({ message: "Invalid Credential" })
        }
        const token = jwt.sign({ _id: user._id }, "Diwakar@123", { expiresIn: "1d" });
        console.log('Token', token);
        if (!token) {
            return res.status(404).json({ message: "Eror while Generating Token" });
        }

        res.cookie('token', token, {
            httpOnly: true,
            sameSite: "strict"
        });

        const logData = {
            action: 'USER_LOGIN',
            description: "User Logged in successfully",
            performedBy: user._id,
            meta: {
                Name: user.firstName + " " + user.lastName,
                email: user.email
            },
        };
        await logEvent(logData)

        res.status(200).json({ message: "Login Successfull", user: user })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});


authRouter.post('/logout', userAuth, async (req, res) => {
    const loggedInUser = req.user;
    if (!loggedInUser) {
        return res.status(401).json({ message: "You are not Authorized, Please login" })
    }

    res.cookie('token', null, { expires: new Date(Date.now()) });
    const logData = {
        action: 'USER_lOGGED_OUT',
        description: "User Logged Out successfully",
        performedBy: loggedInUser._id,
        meta: {
            Name: loggedInUser.firstName + " " + loggedInUser.lastName,
            email: loggedInUser.email
        },
    };
    await logEvent(logData)

    res.status(200).json({ message: "user LoggedOut Successfully" })
});


module.exports = authRouter;