const express = require('express');
const Group = require('../models/group.model');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const groupRouter = express.Router();

groupRouter.post('/create', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupName } = req.body;

        const user = await User.findById(loggedInUser._id);
        if (!user) {
            return res.status(404).json({ message: "user is not Authorized, please Login First" })
        }

        const existingGroup = await Group.findOne({ groupName: groupName, isDeleted: false });
        if (existingGroup) {
            return res.status(401).json({ message: "Group Already Exists, please use another name" });
        };
        const group = await Group.create({
            groupName: groupName,
            createdBy: user._id,
            members: [user._id]
        });

        res.status(200).json({ message: "Group Created Successfully", group: group })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});

groupRouter.get('/view', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const groups = await Group.find({ members: loggedInUser._id })
            .populate('createdBy', 'firstName lastName email')
            .populate('members', 'firstName lastName email');

        res.status(200).json({ message: `You are Added in ${groups.length} Groups`, groups: groups })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message })
    }
});

groupRouter.post('/remove-user/:groupId/:userId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId, userId } = req.params;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, please Login" })
        }

        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group || group.isDeleted) {
            return res.status(404).json({ message: "NO Group Found" })
        }

        if (!group.members.includes(userId)) {
            return res.status(404).json({ message: "User doesn't exist in the Group" })
        }

        if (group.createdBy.toString() !== loggedInUser._id.toString()) {
            return res.status(403).json({ message: "Only Admin can Remove any user" })
        };

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "No user Found" });
        }

        if (user._id.toString() === group.createdBy.toString()) {
            return res.status(400).json({ message: "Admin cannot be removed" })
        };

        group.members = group.members.filter(member => member.toString() !== user._id.toString());
        await group.save();

        res.status(200).json({ message: `${user.firstName} has been removed`, group: group })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

groupRouter.post('/delete/:groupId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId } = req.params;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please login Again" })
        }

        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group) {
            return res.status(404).json({ message: "NO Group Found" });
        }
        console.log('group', group)

        if (!group.members.includes(loggedInUser._id)) {
            return res.status(400).json({ message: "User is not the member of this Group" })
        }


        if (loggedInUser._id.toString() === group.createdBy.toString()) {
            group.isDeleted = true;
            await group.save();
        } else {
            group.members = group.members.filter(member => member.toString() !== loggedInUser._id.toString());
            await group.save();
        }

        res.status(200).json({ message: `${group.createdBy.equals(loggedInUser._id)} ?Group Deleted Successfully! : You left the group`, group: group });

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message })
    }
});

module.exports = groupRouter;