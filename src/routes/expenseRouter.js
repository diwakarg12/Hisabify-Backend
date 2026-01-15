const express = require('express');
const userAuth = require('../middlewares/userAuth.middleware');
const Expense = require('../models/expense.model');
const Group = require('../models/group.model');
const SplitExpense = require('../models/splitExpense.model');
const { addExpenseValidation } = require('../utils/apiValidation');
const cloudinary = require('../config/cloudinary');
const { updateExpense } = require('../utils/updateExpense');
const logEvent = require('../utils/logger');
const User = require('../models/user.model');

const expenseRouter = express.Router();

const addExpenseHandler = async (req, res) => {
    try {

        addExpenseValidation(req.body);
        const loggedInUser = req.user;
        let splitExp = null;
        const { amount, description, category, createdFor, date, receiptImage, splitwith = [] } = req.body;
        const { groupId } = req.params
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const group = groupId ? await Group.findById(groupId) : null;
        if (groupId && !group) {
            return res.status(404).json({ message: "Group Not Found" })
        }

        const personal = !groupId;

        const expenseData = {
            amount,
            description,
            category,
            createdFor,
            createdBy: loggedInUser._id,
            date: date || new Date().toISOString().split("T")[0],
            groupId: groupId || null,
            isPersonal: !groupId,
        }

        if (receiptImage && receiptImage?.startsWith("data:image")) {
            const uploadResponse = await cloudinary.uploader.upload(receiptImage);
            expenseData.receiptImage = uploadResponse.secure_url;
        };

        const newExpense = await Expense.create(expenseData);

        if (group) {
            let splitUsers = splitwith.length > 0 ? group.members.filter(m => splitwith.includes(m.toString())) : group.members;
            const amountPerUser = amount / splitUsers.length;

            const splitData = {
                expenseId: newExpense._id,
                splitBetween: splitUsers,
                splits: splitUsers.map(userId => ({
                    user: userId,
                    splittedAmount: amountPerUser,
                })),
            };

            splitExp = await SplitExpense.create(splitData);
        }

        await logEvent({
            action: personal ? 'PERSONAL EXPENSE ADDED' : 'GROUP EXPENSE ADDED',
            description: personal ? 'Personal Expense added successfully' : 'Group expense added successfully',
            performedBy: loggedInUser._id,
            targetUser: createdFor,
            group: group ? group._id : null,
            expense: splitExp ? splitExp._id : newExpense._id,
            meta: {
                amount,
                category,
                splitsBetween: splitwith,
            },
        });

        res.status(200).json({ message: "Expense Added successfully", expense: newExpense })

    } catch (error) {
        res.status(500).json({
            message: error.message || "Internal Server Error",
        });
    }
}

const getAllExpenseHandler = async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { groupId } = req.params;
        if (!loggedInUser || !loggedInUser?._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }
        let expenses;
        if (groupId) {
            const group = await Group.findById(groupId);
            if (!group || !group.members.includes(loggedInUser?._id)) {
                return res.status(404).json({ message: "Invalid GroupId" })
            }
            expenses = await Expense.find({ groupId: group?._id, isPersonal: false, isDeleted: false, }).lean().populate("createdFor", "firstName lastName email");

        } else {
            expenses = await Expense.find({ createdFor: loggedInUser?._id, isPersonal: true, isDeleted: false, }).lean().populate("createdFor", "firstName lastName email");
        }

        if (!expenses.length) {
            return res.status(200).json({ expense: [] });
        }

        // 🔥 Fetch all split data at once
        const expenseIds = expenses.map(e => e._id);

        const splitExpenses = await SplitExpense.find({
            expenseId: { $in: expenseIds },
            isDeleted: false,
        }).lean().populate("splits.user", "firstName lastName email");

        console.log("splitExpenses", splitExpenses)


        const splitMap = {};

        splitExpenses.forEach(se => {
            splitMap[se.expenseId.toString()] = se
        });
        console.log("splitMap", splitMap)

        const enrichedExpenses = expenses.map(exp => ({
            ...exp,
            splitInfo: splitMap[exp?._id.toString()] || null
        }))

        console.log("enrichedExpenses", enrichedExpenses)

        res.status(200).json({ message: "Success!", expense: enrichedExpenses })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
}

expenseRouter.post('/add', userAuth, addExpenseHandler);
expenseRouter.post('/add/:groupId', userAuth, addExpenseHandler);
expenseRouter.get('/getAllExpense', userAuth, getAllExpenseHandler);
expenseRouter.get('/getAllExpense/:groupId', userAuth, getAllExpenseHandler);

expenseRouter.patch('/edit/:expenseId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { expenseId } = req.params;
        if (!loggedInUser || !loggedInUser?._id) {
            res.status(401).json({ message: "You are not Authorized, Please login again" })
        }

        const { amount, description, category, date, receiptImage, splitwith = [] } = req.body;

        const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
        if (!expense) {
            return res.status(404).json({ message: "No expense found" })
        } else if (expense?.createdFor?.toString() !== loggedInUser?._id?.toString() || expense?.createdBy?.toString() !== loggedInUser?._id?.toString()) {
            return res.status(401).json({ message: "You are not authorized to edit this Expense" })
        }

        expense.amount = amount;
        expense.category = category;
        expense.description = description;
        expense.date = date;

        if (receiptImage && receiptImage?.startsWith("data:image")) {
            const uploadResponse = await cloudinary.uploader.upload(receiptImage);
            expense.receiptImage = uploadResponse.secure_url;
        };

        await expense.save();
        if (expense?.groupId) {
            const group = await Group?.findById(expense?.groupId);

            const splitUsers = splitwith?.length > 0 ? group.members.filter(m => splitwith?.includes(m?.toString())) : group?.members;

            const amountPerUser = amount / splitUsers?.length;

            await SplitExpense.findOneAndUpdate(
                { expenseId },
                {
                    splitBetween: splitUsers,
                    splits: splitUsers.map(userId => ({
                        user: userId,
                        splittedAmount: amountPerUser
                    })),
                },
                { new: true }
            );
        }

        const logData = {
            action: 'EXPENSE_UPDATED',
            description: 'Expense updated successfully',
            performedBy: loggedInUser?._id,
            targetUser: loggedInUser?._id,
            expense: expense?._id,
            meta: {},
        };

        await logEvent(logData);

        res.status(200).json({ message: "expense edited successfully", updatedExpense: expense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error.message })
    }

});

expenseRouter.delete('/delete/:expenseId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { expenseId } = req.params;
        if (!loggedInUser || !loggedInUser?._id) {
            return res.status(401).json({ message: "You are not Authorized, Please login again" })
        }

        const expense = await Expense.findOne({
            _id: expenseId,
            isDeleted: false
        });

        if (!expense) {
            return res.status(404).json({ message: "No expense Found to Delete " })
        }

        if (expense?.createdFor?.toString() !== loggedInUser?._id.toString() || expense?.createdBy?.toString() !== loggedInUser?._id?.toString()) {
            return res.status(403).json({ message: "You are not allowed to delete this expense" })
        }

        expense.isDeleted = true;
        await expense.save();

        let splitExpense = null;

        if (!expense?.isPersonal) {
            splitExpense = await SplitExpense.findOneAndUpdate(
                { expenseId: expenseId, isDeleted: false },
                { isDeleted: true },
                { new: true }
            ).populate('splitBetween', 'firstName, lastName email')
        }

        const logData = {
            action: 'EXPENSE_DELETED',
            description: 'Expense Deleted successfully',
            performedBy: loggedInUser?._id,
            targetUser: expense?.createdFor,
            expense: expenseId,
            meta: {
                isPersonal: expense?.isPersonal,
                // splitExpense: splitExpense?._id || null,
                splitsBetween: splitExpense ? splitExpense?.splitBetween.map(user => user.email) : [],
            }
        };
        await logEvent(logData);

        res.status(200).json({ message: "Expense Deleted successfully", expenseId: expenseId, })
    } catch (error) {
        res.status(500).json({ message: error.message })
    }
});

module.exports = expenseRouter;
