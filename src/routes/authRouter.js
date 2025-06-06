const express = require('express');
const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { signupValidation, loginValidation } = require('../utils/apiValidation');
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

        res.status(200).json({ message: "Login Successfull", user: user })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});


authRouter.post('/logout', async (req, res) => {
    res.cookie('token', null, { expires: new Date(Date.now()) });
    res.status(200).json({ message: "user LoggedOut Successfully" })
});


module.exports = authRouter;