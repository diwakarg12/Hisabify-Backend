const express = require('express');
const User = require('../models/user.model');
const userAuth = require('../middlewares/userAuth.middleware');
const { updateProfileValidation } = require('../utils/apiValidation');
const logEvent = require('../utils/logger');
const cloudinary = require('../config/cloudinary');
const validator = require('validator');

const profileRouter = express.Router();
profileRouter.get('/view', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(404).json({ message: "You are not Authorized, Please login" })
        }

        const user = await User.findById(loggedInUser._id);
        if (!user) {
            return res.status(404).json({ message: "No user found with the UserId" })
        }

        res.status(200).json({ message: `${user.firstName}, Here is your Profile `, user: user })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});

profileRouter.get('/user/:email', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { email } = req.params;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: 'You are not Authorized, Please login' })
        }

        const users = await User.find({
            email: { $regex: email, $options: 'i' }
        });
        if (!users || users.length === 0) {
            return res.status(404).json({ message: 'No users found with matching email' });
        }

        res.status(200).json({ message: `You got ${users.length} users`, users: users })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
})

profileRouter.patch('/update', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { profile } = req.body
        updateProfileValidation(req.body)
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(404).json({ message: "You are not Authorized, Please login" })
        }
        if (profile && profile.startsWith("data:image")) {

            try {
                const uploadResponse = await cloudinary.uploader.upload(profile);
                req.body.profile = uploadResponse.secure_url;
            } catch (error) {
                return res.status(400).json({ message: "Error while Uploading the file" })
            }
        };

        //logging
        const logData = {
            action: 'PROFILE_UPDATE',
            description: "User Profile Updated Successfully",
            performedBy: loggedInUser._id,
            meta: {}
        };

        Object.keys(req.body).forEach(key => {
            if (key in loggedInUser &&
                req.body[key] !== undefined &&
                req.body[key] !== loggedInUser[key]
            ) {
                //adding updated data in meta field of logData
                logData.meta[key] = {
                    old: loggedInUser[key], new: req.body[key]
                }
                //updating user
                loggedInUser[key] = req.body[key]
            }
        });
        await loggedInUser.save();

        await logEvent(logData)

        res.status(200).json({ message: "Profile Data Updated Successfully!", user: loggedInUser })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});

profileRouter.delete('/delete', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const user = await User.findByIdAndDelete(loggedInUser._id);
        if (!user) {
            return res.status(404).json({ message: "No user Found with the Given userId" });
        }

        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        });

        //Logging
        const logData = {
            action: 'PROFILE_DELETE',
            description: "User Profile Deleted Successfully",
            performedBy: loggedInUser._id,
            meta: {
                Name: loggedInUser.firstName + " " + loggedInUser.lastName,
                email: loggedInUser.email
            },
        };
        await logEvent(logData);

        res.status(200).json({ message: "Your Account is Deleted and Data has been removed form the Database", user: null });

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});

profileRouter.patch('/update-email', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { email } = req.body;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const normalizedEmail = String(email || '').toLowerCase().trim();
        if (!validator.isEmail(normalizedEmail)) {
            return res.status(400).json({ message: "Please enter a valid email address" })
        }
        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser && String(existingUser._id) !== String(loggedInUser._id)) {
            return res.status(409).json({ message: "Another user account already exists with this email address" })
        }

        const user = await User.findByIdAndUpdate(
            loggedInUser._id,
            { email: normalizedEmail },
            { new: true }
        );

        res.status(200).json({ message: 'Email updated successfully!', user: user })

    } catch (error) {
        res.status(400).json({ message: error.message || "Failed to update email address" });
    }
});

profileRouter.patch('/update-phone', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { phone } = req.body;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const phoneStr = String(phone || '').trim();
        if (!phoneStr) {
            return res.status(400).json({ message: "Phone number is required" });
        }
        if (!phoneStr.startsWith('+')) {
            return res.status(400).json({ message: "Please include country code (+91) before phone number (e.g. +919876543210)" });
        }
        if (!validator.isMobilePhone(phoneStr, 'any')) {
            return res.status(400).json({ message: "Invalid phone number format (e.g. +919876543210)" });
        }

        const existingUser = await User.findOne({ phone: phoneStr });
        if (existingUser && String(existingUser._id) !== String(loggedInUser._id)) {
            return res.status(409).json({ message: "Another user account already exists with this phone number" });
        }

        const user = await User.findByIdAndUpdate(
            loggedInUser._id,
            { phone: phoneStr },
            { new: true }
        );

        res.status(200).json({ message: 'Phone number updated successfully!', user: user })

    } catch (error) {
        res.status(400).json({ message: error.message || "Failed to update phone number" });
    }
})

module.exports = profileRouter;