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
        console.log('url', profile)
        if (profile && profile.startsWith("data:image")) {

            try {
                const uploadResponse = await cloudinary.uploader.upload(profile);
                req.body.profile = uploadResponse.secure_url;
                console.log('url', req.body.profile)
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
        if (!loggedInUser._id) {
            res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const user = await User.findByIdAndDelete(loggedInUser._id);
        if (!user) {
            res.status(404).json({ message: "No user Found with the Given userId" })
        }
        res.cookie('token', null, { expires: new Date(Date.now()) });

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
        res.status(200).json({ message: "Your Account is Deleted and Data has been removed form the Database", user: null })

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

        if (!validator.isEmail(email)) {
            return res.status(400).json({ message: "Invalid Email" })
        }
        const existingUser = await User.findOne({ email: email });
        if (existingUser) {
            return res.status(409).json({ message: "User already exist with this email id" })
        }

        const user = await User.findByIdAndUpdate(
            loggedInUser._id,
            { email: email },
            { new: true }
        );

        res.status(200).json({ message: 'Email Updated successfully!', user: user })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});

profileRouter.patch('/update-phone', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { phone } = req.body;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        if (!validator.isMobilePhone(phone)) {
            return res.status(400).json({ message: "Invalid Phone" })
        }

        const existingUser = await User.findOne({ phone: phone });
        if (existingUser) {
            return res.status(409).json({ message: "User already exist with this phone" })
        }

        const user = await User.findByIdAndUpdate(
            loggedInUser._id,
            { phone: phone },
            { new: true }
        );

        res.status(200).json({ message: 'Phone Updated successfully!', user: user })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
})

module.exports = profileRouter;