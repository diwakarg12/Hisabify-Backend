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
            console.log('SplitExpense', splitExp)
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
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }
        if (groupId) {
            const group = await Group.findById(groupId);
            if (!group || !group.members.some(member => member.toString() === loggedInUser._id.toString())) {
                return res.status(404).json({ message: "Invalid GroupId" })
            }
            const groupExpense = await Expense.find({ groupId: group._id, isPersonal: false, isDeleted: false, });
            if (!groupExpense || groupExpense.length == 0) {
                return res.status(404).json({ message: "No Expense Found in this Group" })
            }

            res.status(200).json({ message: `Your Group ${group.groupName} has ${groupExpense.length} Expenses`, expense: groupExpense });
        } else {
            const personalExpense = await Expense.find({ createdFor: loggedInUser._id, isPersonal: true, isDeleted: false, });
            if (!personalExpense || personalExpense.length == 0) {
                return res.status(404).json({ message: "You have not added Any Expense" })
            }

            res.status(200).json({ message: `You have ${personalExpense.length} in your expense list`, expense: personalExpense })
        }

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
        if (!loggedInUser || !loggedInUser._id) {
            res.status(401).json({ message: "You are not Authorized, Please login again" })
        }

        const expense = await Expense.findOne({ _id: expenseId, isDeleted: false });
        if (!expense) {
            res.status(404).json({ message: "No expense found" })
        } else if (expense.createdFor.toString() !== loggedInUser._id.toString()) {
            res.status(401).json({ message: "You are not authorized to edit this Expense" })
        }

        const logData = {
            action: 'EXPENSE_UPDATED',
            description: 'Expense updated successfully',
            performedBy: loggedInUser._id,
            targetUser: loggedInUser._id,
            expense: expense._id,
            meta: {},
        };
        updateExpense(req.body, expense, logData)
        const updatedExpense = await expense.save();

        await logEvent(logData);

        res.status(200).json({ message: "expense edited successfully", updatedExpense: updatedExpense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }

});

expenseRouter.post('/delete/:expenseId', userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { expenseId } = req.params;
        if (!loggedInUser || !loggedInUser._id) {
            return res.status(401).json({ message: "You are not Authorized, Please login again" })
        }

        const expense = await Expense.findOneAndUpdate(
            { _id: expenseId, createdFor: loggedInUser._id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        ).populate('createdFor', 'firstName lastName email');
        if (!expense) {
            return res.status(404).json({ message: "No expense Found for you to Delete " })
        }

        const splitExpense = await SplitExpense.findOneAndUpdate(
            { expenseId: expense._id, isDeleted: false },
            { isDeleted: true },
            { new: true }
        ).populate('splitBetween', 'firstName, lastName email')

        const logData = {
            action: 'EXPENSE_DELETED',
            description: 'Expense Deleted successfully',
            performedBy: loggedInUser._id,
            targetUser: loggedInUser._id,
            expense: expense._id,
            meta: {
                splitExpense: splitExpense._id,
                splitsBetween: splitExpense?.splitBetween.map(user => user.email) || [],
            }
        };
        await logEvent(logData);

        res.status(200).json({ message: "Expense Deleted successfully", expense: expense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

// expenseRouter.get('/getAllExpense/:groupId?', userAuth, async (req, res) => {

// })

module.exports = expenseRouter;
