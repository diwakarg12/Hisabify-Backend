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

expenseRouter.post('/add/:groupId?', userAuth, async (req, res) => {
    try {

        addExpenseValidation(req.body);
        const loggedInUser = req.user;
        const { amount, description, category, createdFor, date, receiptImage, splitwith = [] } = req.body;
        const { groupId } = req.params
        if (!loggedInUser || !loggedInUser._id) {
            res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        if (isPersonal == false || !groupId) {
            res.status(404).json({ message: "Please mention if it for personal or Group!" })
        }

        const group = await Group.findById(groupId).populate('members');
        if (isPersonal === false && !group) {
            res.status(404).json({ message: "Please mention the type of GroupId" })
        }

        const expenseData = {
            amount: amount,
            description: description,
            category: category,
            createdFor: createdFor,
            createdBy: loggedInUser._id,
            date: date || new Date(),
            groupId: groupId || null
        }

        if (groupId) {
            expenseData.isPersonal = false
        };

        if (receiptImage && receiptImage.startWith("data:image")) {
            const uploadResponse = await cloudinary.uploader.upload(receiptImage);
            expenseData.receiptImage = uploadResponse.secure_url;
        };

        console.log('Expense: ', expenseData)
        const newExpense = new Expense(expenseData);
        await newExpense.save();

        if (group) {
            let splitUsers = splitwith.length > 0 ? group.members.filter(m => splitwith.includes(m._id.toString())) : group.members;

            const amountPerUser = amount / splitwith.length;

            const splits = await splitUsers.map(user => ({
                user: user._id,
                amount: amountPerUser
            }));

            const splitExpense = await SplitExpense.create({
                expenseId: newExpense._id,
                splitsBetween: splitUsers.map(user => user._id),
                splits: splits
            });
            console.log('SplitExpense', splitExpense)
        }

        const logData = {
            action: isPersonal ? 'PERSONAL EXPENSE ADDED' : 'GROUP EXPENSE ADDED',
            description: isPersonal ? 'Personal Expense added successfully' : 'Group expense added successfully',
            performedBy: loggedInUser._id,
            targetUser: createdFor,
            group: group.groupName,
            expense: newExpense._id,
            meta: {
                amount: amount,
                category: category,
                splitsBetween: splitwith,
            },
        };
        await logEvent(logData);

        res.status(200).json({ message: "Expense Added successfully", expense: newExpense })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error });
    }
});

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
                splitsBetween: splitExpense.splitsBetween.map(user => user.email),
                splits: splits
            }
        };
        await logEvent(logData);

        res.status(200).json({ message: "Expense Deleted successfully", expense: expense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

expenseRouter.get('/getAllExpense/:groupId?', userAuth, async (req, res) => {
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
            const groupExpense = await Expense.find({ groupId: group._id, isPersonal: false });
            if (!groupExpense || groupExpense.length == 0) {
                return res.status(404).json({ message: "No Expense Found in this Group" })
            }

            res.status(200).json({ message: `Your Group ${group.groupName} has ${groupExpense.length} Expenses`, expense: groupExpense });
        } else {
            const personalExpense = await Expense.find({ createdFor: loggedInUser._id, isPersonal: true });
            if (!personalExpense || personalExpense.length == 0) {
                return res.status(404).json({ message: "You have not added Any Expense" })
            }

            res.status(200).json({ message: `You have ${personalExpense.length} in your expense list`, expense: personalExpense })
        }

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
})
