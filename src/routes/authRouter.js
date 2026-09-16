const express = require('express');
const User = require('../models/user.model');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendResetOtp = require('../utils/sendResetOtp');
const { signupValidation, loginValidation } = require('../utils/apiValidation');
const logEvent = require('../utils/logger')
const userAuth = require('../middlewares/userAuth.middleware')
const authRouter = express.Router();

const COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
};

const CLEAR_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "none",
    secure: true,
    path: '/',
};

authRouter.post('/signup', async (req, res) => {
    try {
        signupValidation(req.body);
        const { firstName, lastName, gender, dob, phone, email, password } = req.body;
        const parsedDate = new Date(dob);
        const normalizedEmail = email ? email.toLowerCase().trim() : email;

        const existingUser = await User.findOne({
            $or: [
                { email: normalizedEmail },
                { phone: phone }
            ]
        });
        if (existingUser) {
            return res.status(400).json({ message: "An account with this Email or Phone number already exists" });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await User.create({
            firstName: firstName,
            lastName: lastName,
            dob: parsedDate,
            gender: gender,
            phone: phone,
            email: normalizedEmail,
            password: passwordHash
        });

        const token = jwt.sign(
            { _id: user._id },
            process.env.JWT_SECRET || "Diwakar@123",
            { expiresIn: "7d" }
        );

        if (!token) {
            return res.status(500).json({ message: "Error while generating token" });
        }

        res.cookie('token', token, COOKIE_OPTIONS);

        const logData = {
            action: 'USER_SIGNUP',
            description: "User signed up successfully",
            performedBy: user._id,
            meta: {
                Name: user.firstName + " " + user.lastName,
                email: user.email
            },
        };
        await logEvent(logData);

        res.status(200).json({ message: "User Created successfully", user: user, token: token });
    } catch (error) {
        res.status(400).json({ message: error.message || "Signup failed. Please check your inputs." });
    }
});

authRouter.post('/login', async (req, res) => {
    try {
        loginValidation(req.body);
        const { email, password } = req.body;
        const normalizedInput = email ? email.toLowerCase().trim() : email;
        const user = await User.findOne({
            $or: [
                { email: normalizedInput },
                { phone: email }
            ]
        });
        if (!user) {
            return res.status(400).json({ message: "Invalid credentials. Please check your email/phone and password." });
        }
        const pass = await bcrypt.compare(password, user.password);
        if (!pass) {
            return res.status(400).json({ message: "Invalid credentials. Please check your email/phone and password." });
        }
        const token = jwt.sign(
            { _id: user._id },
            process.env.JWT_SECRET || "Diwakar@123",
            { expiresIn: "7d" }
        );
        if (!token) {
            return res.status(500).json({ message: "Error while generating token" });
        }

        res.cookie('token', token, COOKIE_OPTIONS);

        const logData = {
            action: 'USER_LOGIN',
            description: "User Logged in successfully",
            performedBy: user._id,
            meta: {
                Name: user.firstName + " " + user.lastName,
                email: user.email
            },
        };
        await logEvent(logData);

        res.status(200).json({ message: "Login Successful", user: user, token: token });
    } catch (error) {
        res.status(400).json({ message: error.message || "Login failed. Please check your credentials." });
    }
});

authRouter.post('/send-reset-otp', async (req, res) => {
    try {

        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                message: "Email is required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                message: "No user account found with this email address"
            });
        }

        // Generate 6 digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // Hash OTP
        const hashedOtp = crypto
            .createHash('sha256')
            .update(otp)
            .digest('hex');

        user.resetOtp = hashedOtp;

        user.resetOtpExpiry = Date.now() + 15 * 60 * 1000;

        await user.save();

        // Send email
        await sendResetOtp(user.email, otp);

        res.status(200).json({
            message: "OTP sent successfully"
        });

    } catch (error) {
        res.status(400).json({
            message: error.message || "Failed to send reset OTP"
        });
    }
});

authRouter.post('/verify-reset-otp', async (req, res) => {
    try {

        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({
                message: "All fields are required"
            });
        }

        const normalizedEmail = email.toLowerCase().trim();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({
                message: "User not found"
            });
        }

        // Hash incoming OTP
        const hashedOtp = crypto
            .createHash('sha256')
            .update(otp.toString().trim())
            .digest('hex');

        if (
            user.resetOtp !== hashedOtp ||
            user.resetOtpExpiry < Date.now()
        ) {
            return res.status(400).json({
                message: "Invalid or expired OTP"
            });
        }

        // Hash new password
        const passwordHash = await bcrypt.hash(newPassword, 10);

        user.password = passwordHash;

        // Clear OTP
        user.resetOtp = null;
        user.resetOtpExpiry = null;

        await user.save();

        res.status(200).json({
            message: "Password reset successful"
        });

    } catch (error) {
        res.status(400).json({
            message: error.message || "Failed to reset password"
        });
    }
});

authRouter.post('/logout', userAuth, async (req, res) => {
    const loggedInUser = req.user;
    if (!loggedInUser) {
        return res.status(401).json({ message: "You are not Authorized, Please login" });
    }

    res.clearCookie('token', CLEAR_COOKIE_OPTIONS);
    const logData = {
        action: 'USER_LOGGED_OUT',
        description: "User Logged Out successfully",
        performedBy: loggedInUser._id,
        meta: {
            Name: loggedInUser.firstName + " " + loggedInUser.lastName,
            email: loggedInUser.email
        },
    };
    await logEvent(logData);

    res.status(200).json({ message: "User Logged Out Successfully", user: null });
});

authRouter.get('/check', userAuth, (req, res) => {
    res.status(200).json({ authenticated: true, user: req.user });
});


module.exports = authRouter;