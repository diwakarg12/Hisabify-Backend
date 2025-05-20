const express = require('express');
const userAuth = require('../middlewares/userAuth.middleware');
const Expense = require('../models/expense.model');
const { addExpenseValidation } = require('../utils/apiValidation');

const expenseRouter = express.Router();

expenseRouter.post('/add-expense', userAuth, async (req, res) => {
    try {
        addExpenseValidation(req.body);
        const loggedInUserId = req.user._id;
        const { amount, description, category, createdFor, isPersonal, groupId, receiptImage } = req.body;
        if (!loggedInUserId) {
            res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        if (isPersonal == false || !groupId) {
            res.status(404).json({ message: "Please provide either GroupId or isPersonal flag" })
        }

        const expenseData = {
            amount: amount,
            description: description,
            category: category,
            createdFor: createdFor,
            isPersonal: isPersonal
        }

        if (!isPersonal && groupId) {
            expenseData.groupId = groupId
        };
        if (receiptImage) {
            expenseData.receiptImage = receiptImage
        };

        const newExpense = new Expense(expenseData);
        await newExpense.save();

        res.status(200).json({ message: "Expense Added successfully", expense: newExpense })

    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error });
    }
});

expenseRouter.patch('/edit-expense:/expenseId', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        const expenseId = req.params.expenseId;
        const { amount, description, category, receiptImage } = req.body;
        if (!loggedInUserId) {
            res.status(401).json({ message: "You are not Authorized, Please login again" })
        }

        const expense = await Expense.findById(expenseId);
        if (!expense) {
            res.status(404).json({ message: "No expense found with the given expenseId" })
        } else if (expense.createdFor.toString() !== loggedInUserId.toString()) {
            res.status(401).json({ message: "You are not authorized to edit this Expense" })
        }

        if (amount !== expense.amount) expense.amount = amount;
        if (description !== expense.description) expense.description = description;
        if (category !== expense.category) expense.category = category;
        if (receiptImage !== expense.receiptImage) expense.receiptImage = receiptImage;

        await expense.save();

        res.status(200).json({ message: "expense edited successfully" })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

expenseRouter.post('/delete-expense:/expenseId', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        const expenseId = req.params.expenseId;
        if (!loggedInUserId) {
            res.status(401).json({ message: "You are not Authorized, Please login again" })
        }
        const expense = await Expense.findByIdAndDelete(expenseId);
        if (!expense) {
            res.status(404).json({ message: "No expense Found with this ExpenseId" })
        }

        res.status(200).json({ message: "Expense Deleted successfully", expense: expense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

expenseRouter.get('/personal-expense', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        if (!loggedInUserId) {
            res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        const personalExpense = await Expense.find({
            createdFor: loggedInUserId,
            isPersonal: true,
            groupId: { $exists: false }
        }).sort({ createdAt: -1 })

        res.status(200).json({ message: `You have ${personalExpense.length} personal expense`, personalExpense: personalExpense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});

expenseRouter.get('/group-expense:/groupId', userAuth, async (req, res) => {
    try {

        const loggedInUserId = req.user._id;
        const groupId = req.params.groupId;
        if (!loggedInUserId) {
            res.status(401).json({ message: "You are not Authorized, Please Login " })
        }

        const groupExpense = await Expense.find({
            createdFor: loggedInUserId,
            groupId: groupId,
            isPersonal: false
        }).populate('groupId', 'groupName').sort({ createdAt: -1 });

        res.status(200).jsonn({ message: `You have ${groupExpense.length} expense in the Group ${groupExpense.groupId.groupName}`, groupExpense: groupExpense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});