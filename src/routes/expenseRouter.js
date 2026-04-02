const express = require('express');
const userAuth = require('../middlewares/userAuth.middleware');
const Expense = require('../models/expense.model');
const Group = require('../models/group.model');
const SplitExpense = require('../models/splitExpense.model');
const { addExpenseValidation } = require('../utils/apiValidation');
const cloudinary = require('../config/cloudinary');
const logEvent = require('../utils/logger');

const expenseRouter = express.Router();

// ─── Helper: build splitUsers array from request body or group members ──────────
// Each item in the returned array is { userId?, dummyId?, name? }
const buildSplitUsers = (splitwith, group) => {
    if (splitwith && splitwith.length > 0) {
        // Frontend sends array of { userId } or { dummyId, name }
        return splitwith;
    }
    // Default: split across all real + dummy members of the group
    const realUsers = group.members.map(id => ({ userId: id }));
    const dummyUsers = (group.dummyMembers || []).map(d => ({
        dummyId: d._id,
        name: d.name
    }));
    return [...realUsers, ...dummyUsers];
};

// ─── Helper: validate that dummy IDs in splitUsers actually exist in the group ──
const validateDummyUsers = (splitUsers, group) => {
    for (const u of splitUsers) {
        if (u.dummyId) {
            const exists = (group.dummyMembers || []).some(
                d => String(d._id) === String(u.dummyId)
            );
            if (!exists) throw new Error(`Invalid dummy user: ${u.dummyId}`);
        }
    }
};

// ─── Helper: build SplitExpense data from splitUsers and amount ──────────────────
const buildSplitData = (expenseId, splitUsers, amount) => {
    const amountPerUser = amount / splitUsers.length;
    return {
        expenseId,
        splitBetween: splitUsers.map(u => ({
            user: u.userId || null,
            dummyId: u.dummyId || null
        })),
        splits: splitUsers.map(u => ({
            user: u.userId || null,
            dummyId: u.dummyId || null,
            name: u.name || null,
            splittedAmount: amountPerUser
        }))
    };
};

// ─── ADD EXPENSE ──────────────────────────────────────────────────────────────────
const addExpenseHandler = async (req, res) => {
    try {
        addExpenseValidation(req.body);
        const loggedInUser = req.user;

        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const { amount, description, category, createdFor, date, receiptImage, splitwith = [] } = req.body;
        const { groupId } = req.params;

        const group = groupId ? await Group.findById(groupId) : null;
        if (groupId && !group) {
            return res.status(404).json({ message: "Group Not Found" });
        }

        const expenseData = {
            amount,
            description,
            category,
            createdFor,
            createdBy: loggedInUser._id,
            date: date || new Date().toISOString().split("T")[0],
            groupId: groupId || null,
            isPersonal: !groupId,
        };

        if (receiptImage && receiptImage.startsWith("data:image")) {
            const uploadResponse = await cloudinary.uploader.upload(receiptImage);
            expenseData.receiptImage = uploadResponse.secure_url;
        }

        const newExpense = await Expense.create(expenseData);

        let splitExp = null;
        if (group) {
            const splitUsers = buildSplitUsers(splitwith, group);
            validateDummyUsers(splitUsers, group);
            splitExp = await SplitExpense.create(buildSplitData(newExpense._id, splitUsers, amount));
        }

        await logEvent({
            action: !groupId ? 'PERSONAL_EXPENSE_ADDED' : 'GROUP_EXPENSE_ADDED',
            description: !groupId ? 'Personal expense added successfully' : 'Group expense added successfully',
            performedBy: loggedInUser._id,
            targetUser: createdFor,
            group: group ? group._id : null,
            expense: newExpense._id,
            meta: { amount, category, splitsBetween: splitwith },
        });

        res.status(200).json({ message: "Expense Added successfully", expense: newExpense });

    } catch (error) {
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── GET ALL EXPENSES ─────────────────────────────────────────────────────────────
const getAllExpenseHandler = async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { groupId } = req.params;

        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        let expenses;
        if (groupId) {
            const group = await Group.findById(groupId);
            if (!group || !group.members.some(m => m.toString() === loggedInUser._id.toString())) {
                return res.status(404).json({ message: "Invalid GroupId or you are not a member" });
            }
            expenses = await Expense.find({ groupId: group._id, isPersonal: false, isDeleted: false })
                .lean()
                .populate("createdFor", "firstName lastName email")
                .populate("createdBy", "firstName lastName email");
        } else {
            expenses = await Expense.find({ createdFor: loggedInUser._id, isPersonal: true, isDeleted: false })
                .lean()
                .populate("createdFor", "firstName lastName email");
        }

        if (!expenses.length) {
            return res.status(200).json({ expense: [] });
        }

        const expenseIds = expenses.map(e => e._id);

        // ✅ Fixed: populate splitBetween.user (not splitBetween directly) since it's now [{user, dummyId}]
        const splitExpenses = await SplitExpense.find({
            expenseId: { $in: expenseIds },
            isDeleted: false,
        })
            .lean()
            .populate("splits.user", "firstName lastName email")
            .populate("splitBetween.user", "firstName lastName email");

        const splitMap = {};
        splitExpenses.forEach(se => {
            splitMap[se.expenseId.toString()] = se;
        });

        const enrichedExpenses = expenses.map(exp => ({
            ...exp,
            splitInfo: splitMap[exp._id.toString()] || null
        }));

        res.status(200).json({ message: "Success!", expense: enrichedExpenses });

    } catch (error) {
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
};

// ─── EDIT EXPENSE ─────────────────────────────────────────────────────────────────
expenseRouter.patch('/edit/:expenseId', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { expenseId } = req.params;

        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please login again" });
        }

        const { amount, description, category, date, receiptImage, splitwith = [] } = req.body;

        const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
        if (!expense) {
            return res.status(404).json({ message: "No expense found" });
        }

        // Only the user who created the expense can edit it
        if (expense.createdBy.toString() !== loggedInUser._id.toString()) {
            return res.status(403).json({ message: "You are not authorized to edit this Expense" });
        }

        expense.amount = amount;
        expense.category = category;
        expense.description = description;
        expense.date = date;

        if (receiptImage && receiptImage.startsWith("data:image")) {
            const uploadResponse = await cloudinary.uploader.upload(receiptImage);
            expense.receiptImage = uploadResponse.secure_url;
        }

        await expense.save();

        // ✅ Fixed: now handles dummy members in split update
        if (expense.groupId) {
            const group = await Group.findById(expense.groupId);
            if (!group) {
                return res.status(404).json({ message: "Associated group not found" });
            }

            const splitUsers = buildSplitUsers(splitwith, group);
            validateDummyUsers(splitUsers, group);

            await SplitExpense.findOneAndUpdate(
                { expenseId, isDeleted: false },
                buildSplitData(expenseId, splitUsers, amount),
                { new: true }
            );
        }

        await logEvent({
            action: 'EXPENSE_UPDATED',
            description: 'Expense updated successfully',
            performedBy: loggedInUser._id,
            expense: expense._id,
            meta: { amount, category },
        });

        res.status(200).json({ message: "Expense edited successfully", updatedExpense: expense });

    } catch (error) {
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
});

// ─── DELETE EXPENSE ───────────────────────────────────────────────────────────────
expenseRouter.delete('/delete/:expenseId', userAuth, async (req, res) => {
    try {
        const loggedInUser = req.user;
        const { expenseId } = req.params;

        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please login again" });
        }

        const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
        if (!expense) {
            return res.status(404).json({ message: "No expense found to delete" });
        }

        // Only the creator can delete
        if (expense.createdBy.toString() !== loggedInUser._id.toString()) {
            return res.status(403).json({ message: "You are not allowed to delete this expense" });
        }

        expense.isDeleted = true;
        await expense.save();

        let splitExpense = null;
        if (!expense.isPersonal) {
            // ✅ Fixed: populate splitBetween.user instead of splitBetween
            splitExpense = await SplitExpense.findOneAndUpdate(
                { expenseId, isDeleted: false },
                { isDeleted: true },
                { new: true }
            )
                .populate("splitBetween.user", "firstName lastName email")
                .lean();
        }

        await logEvent({
            action: 'EXPENSE_DELETED',
            description: 'Expense deleted successfully',
            performedBy: loggedInUser._id,
            targetUser: expense.createdFor,
            expense: expenseId,
            meta: {
                isPersonal: expense.isPersonal,
                splitsBetween: splitExpense
                    ? splitExpense.splitBetween.map(s =>
                        s.user ? s.user.email : `dummy:${s.dummyId}`
                    )
                    : [],
            }
        });

        res.status(200).json({ message: "Expense deleted successfully", expenseId });

    } catch (error) {
        res.status(500).json({ message: error.message || "Internal Server Error" });
    }
});

expenseRouter.post('/add', userAuth, addExpenseHandler);
expenseRouter.post('/add/:groupId', userAuth, addExpenseHandler);
expenseRouter.get('/getAllExpense', userAuth, getAllExpenseHandler);
expenseRouter.get('/getAllExpense/:groupId', userAuth, getAllExpenseHandler);

module.exports = expenseRouter;