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
            return res.status(401).json({ message: "You are not authorized, please login" });
        }

        const { groupName, description, members = [], dummyMembers = [] } = req.body;

        const user = await User.findById(loggedInUser._id);
        if (!user) {
            return res.status(401).json({ message: "User is not Authorized, please Login First" });
        }

        const existingGroup = await Group.findOne({ groupName, isDeleted: false });
        if (existingGroup) {
            return res.status(409).json({ message: "Group Already Exists, please use another name" });
        }

        // Dummy user duplication check (case-insensitive)
        const uniqueDummy = new Set(dummyMembers.map(n => n.toLowerCase()));
        if (uniqueDummy.size !== dummyMembers.length) {
            return res.status(400).json({ message: "Duplicate dummy user names are not allowed" });
        }

        const group = await Group.create({
            groupName,
            description,
            createdBy: user._id,
            members: [...members, user._id],
            dummyMembers: dummyMembers.map(name => ({
                name,
                createdBy: user._id
            }))
        });

        await logEvent({
            action: 'GROUP_CREATED',
            description: 'Group created successfully',
            performedBy: loggedInUser._id,
            group: group._id,
            meta: { groupName: group.groupName },
        });

        res.status(200).json({ message: "Group Created Successfully", group });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Add a dummy user to an existing group (admin only)
groupRouter.post('/add-dummy/:groupId', userAuth, async (req, res) => {
    try {
        const { groupId } = req.params;
        const { name } = req.body;
        const loggedInUser = req.user;

        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not authorized, please login" });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({ message: "Dummy user name is required" });
        }

        // ✅ Fixed: was Group.findByOne (typo bug) — corrected to Group.findOne
        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group) {
            return res.status(404).json({ message: "Group Not Found" });
        }

        if (String(group.createdBy) !== String(loggedInUser._id)) {
            return res.status(403).json({ message: "Only admin can add dummy users" });
        }

        // Case-insensitive duplicate check
        const exists = group.dummyMembers.some(
            d => d.name.toLowerCase() === name.trim().toLowerCase()
        );
        if (exists) {
            return res.status(400).json({ message: "A dummy user with this name already exists in the group" });
        }

        group.dummyMembers.push({ name: name.trim(), createdBy: loggedInUser._id });
        await group.save();

        await logEvent({
            action: 'DUMMY_USER_ADDED',
            description: 'Dummy user added to group',
            performedBy: loggedInUser._id,
            group: group._id,
            meta: { dummyName: name.trim() },
        });

        res.status(200).json({ message: "Dummy user added successfully", dummyMembers: group.dummyMembers });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

// Remove a dummy user from group (admin only)
groupRouter.delete('/remove-dummy/:groupId/:dummyId', userAuth, async (req, res) => {
    try {
        const { groupId, dummyId } = req.params;
        const loggedInUser = req.user;

        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not authorized, please login" });
        }

        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group) {
            return res.status(404).json({ message: "Group Not Found" });
        }

        if (String(group.createdBy) !== String(loggedInUser._id)) {
            return res.status(403).json({ message: "Only admin can remove dummy users" });
        }

        const dummyExists = group.dummyMembers.some(d => String(d._id) === String(dummyId));
        if (!dummyExists) {
            return res.status(404).json({ message: "Dummy user not found in this group" });
        }

        group.dummyMembers = group.dummyMembers.filter(d => String(d._id) !== String(dummyId));
        await group.save();

        res.status(200).json({ message: "Dummy user removed successfully", dummyMembers: group.dummyMembers });

    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

groupRouter.get('/searchUser/:email', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { email } = req.params;

        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not authorized, please login" });
        }

        const user = await User.findOne({ email }).select(
            "_id firstName lastName email phone gender profile"
        );
        if (!user) {
            return res.status(404).json({ message: "No user found with this email" });
        }

        res.status(200).json({ message: "User found successfully", user });
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
            .lean()
            .populate('createdBy', 'firstName lastName email profile')
            .populate('members', 'firstName lastName email profile');

        res.status(200).json({ message: `You are in ${groups.length} Groups`, groups });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

groupRouter.put('/update/:groupId', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { groupId } = req.params;
        const { groupName, description } = req.body;

        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const group = await Group.findById(groupId);
        if (!group || group.isDeleted) {
            return res.status(404).json({ message: "No Group Found" });
        }

        if (String(group.createdBy) !== String(loggedInUser._id)) {
            return res.status(403).json({ message: "Only admin can update the group" });
        }

        group.groupName = groupName;
        group.description = description;
        await group.save();

        await logEvent({
            action: 'GROUP_UPDATED',
            description: 'Group updated successfully',
            performedBy: loggedInUser._id,
            group: group._id,
            meta: { updatedGroupName: group.groupName },
        });

        res.status(200).json({ message: "Group updated Successfully", group });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

groupRouter.post('/remove-user/:groupId/:userId', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { groupId, userId } = req.params;

        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, please Login" });
        }

        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group) {
            return res.status(404).json({ message: "No Group Found" });
        }

        if (group.createdBy.toString() !== loggedInUser._id.toString()) {
            return res.status(403).json({ message: "Only Admin can remove any user" });
        }

        if (!group.members.some(m => m.toString() === userId)) {
            return res.status(404).json({ message: "User doesn't exist in the Group" });
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user._id.toString() === group.createdBy.toString()) {
            return res.status(400).json({ message: "Admin cannot be removed" });
        }

        group.members = group.members.filter(member => member.toString() !== userId);
        await group.save();

        await logEvent({
            action: 'USER_REMOVED_FROM_GROUP',
            description: 'User removed from Group successfully',
            performedBy: loggedInUser._id,
            targetUser: user._id,
            group: group._id,
            meta: {
                groupName: group.groupName,
                removedUser: `${user.firstName} ${user.lastName}`,
                removedUserEmail: user.email
            },
        });

        res.status(200).json({
            message: `${user.firstName} has been removed`,
            groupId,
            userId,
            removedAt: new Date().toISOString(),
        });
    } catch (error) {
        res.status(500).json({ message: error?.message });
    }
});

groupRouter.delete('/delete/:groupId', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { groupId } = req.params;

        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please login Again" });
        }

        const group = await Group.findOne({ _id: groupId, isDeleted: false });
        if (!group) {
            return res.status(404).json({ message: "No Group Found" });
        }

        const isMember = group.members.some(member => member.toString() === loggedInUser._id.toString());
        if (!isMember) {
            return res.status(403).json({ message: "You are not a member of this Group" });
        }

        const isCreator = loggedInUser._id.toString() === group.createdBy.toString();

        if (isCreator) {
            group.isDeleted = true;
        } else {
            group.members = group.members.filter(member => member.toString() !== loggedInUser._id.toString());
        }
        await group.save();

        await logEvent({
            action: isCreator ? "GROUP_DELETED" : "GROUP_LEFT",
            description: isCreator ? 'Group deleted by creator' : "User left the group",
            performedBy: loggedInUser._id,
            group: group._id,
            meta: { groupName: group.groupName },
        });

        res.status(200).json({
            message: isCreator ? "Group deleted successfully" : "You left the group",
            group,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = groupRouter;