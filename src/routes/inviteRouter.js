const express = require('express');
const Group = require('../models/group.model');
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const Invitation = require('../models/invitation.model');
const logEvent = require('../utils/logger');
const inviteRouter = express.Router();

inviteRouter.post('/send/:groupId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId } = req.params;
        const { invitedTo } = req.body;

        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group) {
            return res.status(404).json({ message: "Group not found" })
        }

        if (String(group.createdBy) !== String(loggedInUser._id)) {
            return res.status(403).json({
                message: "Only group creator can invite users",
            });
        }

        const user = await User.findById(invitedTo);
        if (!user) {
            return res.status(404).json({ message: "No User Found" });
        }

        if (group.members.includes(user._id)) {
            return res.status(400).json({ message: "User already present in the group" })
            // throw new Error("User already present in the group");
        }

        const existingInvitation = await Invitation.findOne({ groupId: groupId, invitedTo: invitedTo, status: "pending" });
        if (existingInvitation) {
            return res.status(400).json({ message: "User Already Invited" })
        }

        const invite = await Invitation.create({
            groupId: groupId,
            invitedBy: req.user._id,
            invitedTo: invitedTo,
            status: "pending"
        });

        const logData = {
            action: 'USER_INVITED_TO_GROUP',
            description: "User has been invited to Group Successfully",
            performedBy: loggedInUser._id,
            targetUser: user._id,
            group: group._id,
            meta: {
                Name: user.firstName + " " + user.lastName,
                email: user.email
            },
        };
        await logEvent(logData);

        res.status(200).json({ message: `You have Invited ${user.firstName} successfully!`, invitation: invite })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message })
    }
});

inviteRouter.get('/view/received-request', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please login" })
        }

        const receivedInvitations = await Invitation.find({ invitedTo: loggedInUser._id, status: 'pending' })
            .populate('groupId', "groupName")
            .populate('invitedBy', "firstName lastName email");

        if (receivedInvitations.length === 0) {
            return res.status(200).json({
                message: "No received invitations",
                receivedInvitations: []
            });
        }

        res.status(200).json({ message: `You have Received ${receivedInvitations.length} invitations`, receivedInvitations: receivedInvitations });

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

inviteRouter.get('/view/sent-request/:groupId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId } = req.params;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please login" })
        }

        const sentInvitations = await Invitation.find({ groupId: groupId, status: 'pending' })
            .populate('groupId', "groupName")
            .populate('invitedTo', "firstName lastName email profile");

        if (sentInvitations.length === 0) {
            return res.status(200).json({
                message: "No sent invitations",
                sentInvitations: []
            });
        }

        res.status(200).json({ message: `You have Received ${sentInvitations.length} invitations`, sentInvitations: sentInvitations });

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

inviteRouter.post('/review/:status/:requestId/:groupId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const { status, requestId, groupId } = req.params;
        const invitation = await Invitation.findById(requestId);
        if (!invitation) {
            return res.status(404).json({ message: "Invitation not found" });
        }

        if (invitation.status !== "pending") {
            return res.status(400).json({ message: "Invitation already processed" });
        }

        const group = await Group.findById(groupId);
        if (!group) {
            return res.status(404).json({ message: "Group not found" });
        }

        if (status === "accepted" || status === "rejected") {
            if (String(invitation?.invitedTo) !== String(loggedInUser?._id)) {
                return res.status(403).json({ message: "Not authorized" });
            }

            invitation.status = status;
            await invitation.save();

            if (status === 'accepted') {

                await Group.findByIdAndUpdate(groupId, { $addToSet: { members: loggedInUser._id } });
                // await Invitation.findByIdAndDelete(requestId);

            }
        } else if (status === "cancelled") {
            if (String(invitation.invitedBy) !== String(loggedInUser._id)) {
                return res.status(403).json({ message: "Not authorized to cancel invite" });
            }

            invitation.status = "cancelled";
            await invitation.save();

        } else {
            return res.status(400).json({ message: "Invalid status" });
        }

        const logMap = {
            accepted: "USER_ACCEPTED_GROUP_INVITATION",
            rejected: "USER_REJECTED_GROUP_INVITATION",
            cancelled: "INVITATION_CANCELLED",
        };

        const logData = {
            action: logMap[status],
            description: `Invitation ${status}`,
            performedBy: loggedInUser?._id,
            targetUser: loggedInUser?._id,
            group: group?._id,
            meta: {
                invitation: invitation?._id,
                invitedBy: invitation?.invitedBy,
                invitedTo: invitation?.invitedTo,
                status
            },
        };
        await logEvent(logData);

        res.status(200).json({ message: `You have ${status} the Invitation of Group ${group.groupName}`, requestId, status })

    } catch (error) {
        res.status(500).json({ message: error.message || "Internal Server Error", })
    }
});

module.exports = inviteRouter;



