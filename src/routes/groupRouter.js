const express = require('express');
const Group = require('../models/group.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const groupRouter = express.Router();

groupRouter.post('/create-group', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupName } = req.body.groupName;

        const user = await User.findById(loggedInUser._id);
        if (!user) {
            res.status(404).json({ message: "user is not Authorized, please Login First" })
        }

        const existingGroup = await Group.findOne({ groupName: groupName });
        if (existingGroup) {
            res.status(401).json({ message: "Group Already Exists, please use another name" });
        };
        const group = await Group.create({
            groupName: groupName,
            createdBy: user._id,
            members: [user._id]
        });

        res.status(200).json({ message: "Group Created Successfully", group: group })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error });
    }
});

groupRouter.get('/view-groups', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        if (!loggedInUserId) {
            res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const groups = await Group.find({ members: loggedInUserId });

        res.status(200).json({ message: `You are Added in ${groups.length} Groups`, groups: groups })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
})