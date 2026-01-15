const express = require('express');
const Group = require('../models/group.model');
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const logEvent = require('../utils/logger');
const groupRouter = express.Router();

groupRouter.post('/create', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not authorized, please login", });
        }
        const { groupName, description, members } = req.body;

        const user = await User.findById(loggedInUser._id);
        if (!user) {
            return res.status(401).json({ message: "user is not Authorized, please Login First" })
        }

        const existingGroup = await Group.findOne({ groupName: groupName, isDeleted: false });
        if (existingGroup) {
            return res.status(409).json({ message: "Group Already Exists, please use another name" });
        };
        const group = await Group.create({
            groupName: groupName,
            description: description,
            createdBy: user._id,
            members: [...members, user._id]
        });

        const logData = {
            action: 'GROUP_CREATED',
            description: 'Group created successfully',
            performedBy: loggedInUser._id,
            group: group._id,
            meta: {
                groupName: group.groupName,
            },
        };
        await logEvent(logData)

        res.status(200).json({ message: "Group Created Successfully", group })

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

groupRouter.get('/searchUser/:email', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { email } = req.params;

        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not authorized, please login", });
        }

        const user = await User.findOne({ email }).select(
            "_id firstName lastName email phone gender profile"
        );
        if (!user) {
            return res.status(404).json({
                message: "No user found with this email",
            });
        }

        res.status(200).json({ message: `user getting successfully`, user });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

groupRouter.get('/view', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const groups = await Group.find({ members: loggedInUser._id, isDeleted: false })
            .populate('createdBy', 'firstName lastName email profile')
            .populate('members', 'firstName lastName email profile');


        res.status(200).json({ message: `You are Added in ${groups.length} Groups`, groups: groups })
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

groupRouter.put('/update/:groupId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId } = req.params;
        const { groupName, description } = req.body;
        console.log("GroupName", groupName, description)
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const group = await Group.findById(groupId);
        if (!group || group.isDeleted) {
            return res.status(404).json({ message: "NO Group Found" });
        }

        group.groupName = groupName
        group.description = description
        await group.save();

        const logData = {
            action: 'GROUP_UPDATED',
            description: 'Group updated successfully',
            performedBy: loggedInUser._id,
            group: group._id,
            meta: {
                updatedGroupName: group.groupName
            },
        };
        await logEvent(logData)

        res.status(200).json({ message: "Group updated Successfully", group: group })

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
})

groupRouter.post('/remove-user/:groupId/:userId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId, userId } = req.params;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, please Login" })
        }

        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group || group.isDeleted) {
            return res.status(404).json({ message: "NO Group Found" });
        }

        if (!group.members.includes(userId)) {
            return res.status(404).json({ message: "User doesn't exist in the Group" })
        }

        if (group.createdBy.toString() !== loggedInUser._id.toString()) {
            return res.status(403).json({ message: "Only Admin can Remove any user" })
        };

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "This user is not Found in this Group" });
        }

        if (user._id.toString() === group.createdBy.toString()) {
            return res.status(400).json({ message: "Admin cannot be removed" })
        };

        group.members = group.members.filter(member => member.toString() !== user._id.toString());
        await group.save();

        const logData = {
            action: 'USER_REMOVED_FROM_GROUP',
            description: 'User removed from Group successfully',
            performedBy: loggedInUser._id,
            targetUser: user._id,
            group: group._id,
            meta: {
                groupName: group.groupName,
                removedUser: user.firstName + " " + user.lastName,
                removedUserEmail: user.email
            },
        };
        await logEvent(logData)

        res.status(200).json({
            message: `${user.firstName} has been removed`,
            groupId,
            userId,
            removedAt: new Date().toISOString(),
        });

    } catch (error) {
        res.status(500).json({ message: error?.message })
    }
});

groupRouter.delete('/delete/:groupId', userAuth, async (req, res) => {
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

        const isMember = group?.members?.some(member => member?.toString() === loggedInUser?._id?.toString());
        if (!isMember) {
            return res.status(403).json({ message: "You are not the member of this Group" })
        }

        const isCreator = loggedInUser?._id?.toString() === group?.createdBy?.toString()

        if (!isCreator) {
            group.isDeleted = true;
            await group.save();
        } else {
            group.members = group.members.filter(member => member.toString() !== loggedInUser._id.toString());
            await group.save();
        }

        const logData = {
            action: isCreator ? "GROUP_DELETED" : "GROUP_LEFT",
            description: isCreator ? 'Group deleted By Creator' : "User left the group",
            performedBy: loggedInUser?._id,
            group: group?._id,
            meta: {
                groupName: group?.groupName,
            },
        };
        await logEvent(logData)

        res.status(200).json({
            message: isCreator
                ? "Group deleted successfully"
                : "You left the group",
            group,
        });

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
});

module.exports = groupRouter;