const express = require('express');
const Group = require('../models/group.model');
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const inviteRouter = express.Router();

inviteRouter.post('/send/:groupId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId } = req.params;
        const { invitedTo } = req.body;

        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const user = await User.findOne({ email: invitedTo });
        if (!user) {
            return res.status(404).json({ message: "No User Found" });
        }

        const userInGroup = await Group.findOne({ _id: groupId, members: user._id });
        if (userInGroup) {
            return res.status(400).json({ message: "User Already present in the Group" })
        }

        const existingInvitation = await Invitation.findOne({ groupId: groupId, invitedTo: user._id });
        if (existingInvitation) {
            return res.status(400).json({ message: "User Already Invited" })
        }

        const invite = await Invitation.create({
            groupId: groupId,
            invitedBy: loggedInUser._id,
            invitedTo: user._id,
            status: "pending"
        });

        res.status(200).json({ message: `You have Invited ${user.firstName} successfully!`, invitation: invite })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message })
    }
});

inviteRouter.get('/view', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please login" })
        }

        const invitations = await Invitation.find({ invitedTo: loggedInUser._id, status: 'pending' })
            .populate('groupId', "groupName")
            .populate('invitedBy', "firstName lastName email");

        if (!invitations) {
            return res.status(404).json({ message: "You haven't received any request" })
        }

        res.status(200).json({ message: `You have Received ${invitations.length} invitations`, invitations: invitations });

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

inviteRouter.post('/review/:status/:groupId', userAuth, async (req, res) => {
    try {
 
        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const { status, groupId } = req.params;
        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "No group found" });
        }

        const invitation = await Invitation.findOne({ groupId: groupId, status: "pending" });
        if (!invitation) {
            res.status(404).json({ message: "No invitation Found" });
        }

        if (status === 'accepted') {
            invitation.status = status;
            await invitation.save();

            const group = await Group.findByIdAndUpdate(groupId, { $addToSet: { members: loggedInUser._id } })
        } else {
            invitation.status = status;
            await invitation.save();
        }

        res.status(200).json({ message: `You have ${status} the Invitation of Group ${group.groupName}` })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

module.exports = inviteRouter;



