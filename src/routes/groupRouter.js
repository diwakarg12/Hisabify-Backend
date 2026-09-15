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

        const { groupName, description, members = [], dummyMembers = [], categories } = req.body;

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

        const defaultCategories = ["Food & Dining", "Rent & Bills", "Travel & Fuel", "Shopping", "Entertainment", "Medical"];
        const finalCategories = Array.isArray(categories) && categories.length > 0
            ? Array.from(new Set(categories.map(c => String(c).trim()).filter(Boolean)))
            : defaultCategories;

        const group = await Group.create({
            groupName,
            description,
            createdBy: user._id,
            members: [...members, user._id],
            dummyMembers: dummyMembers.map(name => ({
                name,
                createdBy: user._id
            })),
            categories: finalCategories
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

groupRouter.get('/searchUser/:query?', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const searchQuery = req.params.query || req.query.query || "";

        if (!loggedInUser) {
            return res.status(401).json({ message: "You are not authorized, please login" });
        }

        if (!searchQuery.trim()) {
            return res.status(200).json({ message: "No query provided", users: [], user: null });
        }

        const searchRegex = new RegExp(searchQuery.trim(), "i");
        const users = await User.find({
            _id: { $ne: loggedInUser._id },
            $or: [
                { firstName: searchRegex },
                { lastName: searchRegex },
                { email: searchRegex }
            ]
        }).select("_id firstName lastName email phone gender profile").limit(15);

        if (!users || users.length === 0) {
            return res.status(404).json({ message: "No users found matching query", users: [], user: null });
        }

        res.status(200).json({ message: "Users found successfully", users, user: users[0] });
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
        const { groupName, description, categories } = req.body;

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

        // Preserve existing categories so old expenses are never corrupted
        const existingCats = group.categories || [];
        const incomingCats = Array.isArray(categories) ? categories.map(c => String(c).trim()).filter(Boolean) : [];
        const mergedCategories = Array.from(new Set([...existingCats, ...incomingCats]));
        group.categories = mergedCategories;

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

        const isCreator = String(loggedInUser._id) === String(group.createdBy);
        if (!isCreator) {
            return res.status(403).json({ message: "Only the group owner can delete this group" });
        }

        group.isDeleted = true;
        await group.save();

        await logEvent({
            action: "GROUP_DELETED",
            description: 'Group deleted by owner',
            performedBy: loggedInUser._id,
            group: group._id,
            meta: { groupName: group.groupName },
        });

        res.status(200).json({
            message: "Group deleted successfully",
            group,
        });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

module.exports = groupRouter;