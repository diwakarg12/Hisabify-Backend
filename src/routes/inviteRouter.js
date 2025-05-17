const express = require('express');
const Group = require('../models/group.model');
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const inviteRouter = express.Router();

inviteRouter.post('/invite-user:/groupId', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        const groupId = req.params.groupId;
        const invitedUser = req.body.invitedUser;

        if (!loggedInUserId) {
            res.status.json({ message: "You are not Authorized, Please Login" })
        }

        const user = await User.findOne({ email: invitedUser });
        if (!user) {
            res.status.json({ message: "User is not Registered, please Register User First" })
        }

        const invite = await Invitation.create({
            groupId: groupId,
            invitedBy: loggedInUserId,
            invitedUser: user._id,
            status: "pending"
        });

        res.status(200).json({ message: "User Invited Sucessfully", invitation: invite })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

inviteRouter.post('/invite-review:/status:/invitedBy:/groupId', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        const status = req.params.status;
        const invitedBy = req.params.invitedBy;
        const groupId = req.params.groupId;

        if (!loggedInUserId) {
            res.status(401).json({ message: "You are not Authorized, Please Login" })
        }
        const group = await Group.findById(groupId);
        if (!group) {
            res.status(404).json({ message: "Invalid GroupId" })
        }
        const invitation = await Invitation.findOne({ invitedBy: invitedBy, groupId: groupId });
        if (!invitation) {
            res.status(404).json({ message: "No invitation Found" });
        }
        invitation.status = status;
        await invitation.save();
        res.status(200).json({ message: `You have ${status} the Invitation of Group ${group.groupName}` })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

inviteRouter.get('/view-invitations', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        const invitations = await Invitation.find({ invitedUser: loggedInUserId });
        res.status(200).json({ message: `You have Received ${invitations.length} invitations`, invitations: invitations });

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});



