const express = require('express');
const Group = require('../models/group.model');
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const logEvent = require('../utils/logger');
const groupRouter = express.Router();

groupRouter.post('/create', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
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
        console.log('Group', group);

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

        res.status(200).json({ message: "Group Created Successfully", group: group })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});

groupRouter.get('/view', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const groups = await Group.find({ members: loggedInUser._id })
            .populate('createdBy', 'firstName lastName email')
            .populate('members', 'firstName lastName email');

        res.status(200).json({ message: `You are Added in ${groups.length} Groups`, groups: groups })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message });
    }
});

groupRouter.post('/update/:groupId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId } = req.params;
        const { groupName } = req.body;
        if (!loggedInUser || !loggedInUser.Id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const group = await Group.findById(groupId);
        if (!group || group.isDeleted) {
            return res.status(404).json({ message: "NO Group Found" });
        }

        group.groupName == groupName
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
        res.status(500).json({ message: "Error: ", error: error.message });
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

        const logData = {
            action: 'GROUP_DELETED',
            description: 'Group deleted successfully',
            performedBy: loggedInUser._id,
            group: group._id,
            meta: {
                groupName: group.groupName,
            },
        };
        await logEvent(logData)

        res.status(200).json({ message: `${group.createdBy.equals(loggedInUser._id)} ?Group Deleted Successfully! : You left the group`, group: group });

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message })
    }
});

module.exports = groupRouter;