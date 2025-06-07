const express = require('express');
const userAuth = require('../middlewares/userAuth.middleware');
const Expense = require('../models/expense.model');
const { addExpenseValidation } = require('../utils/apiValidation');
const cloudinary = require('../config/cloudinary');
const { updateExpense } = require('../utils/updateExpense');

const expenseRouter = express.Router();

expenseRouter.post('/add', userAuth, async (req, res) => {
    try {
        addExpenseValidation(req.body);
        const loggedInUser = req.user;
        const { amount, description, category, createdFor, date, isPersonal, groupId, receiptImage } = req.body;
        if (!loggedInUser || !loggedInUser._id) {
            res.status(401).json({ message: "You are not Authorized, Please Login" });
        }

        if (isPersonal == false || !groupId) {
            res.status(404).json({ message: "Please mention if it for personal or Group!" })
        }

        const expenseData = {
            amount: amount,
            description: description,
            category: category,
            createdFor: createdFor,
            createdBy: loggedInUser._id,
            date: date,
        }

        if (!isPersonal && groupId) {
            expenseData.groupId = groupId
        };
        if (receiptImage && receiptImage.startWith("data:image")) {
            const uploadResponse = await cloudinary.uploader.upload(receiptImage);
            expenseData.receiptImage = uploadResponse.secure_url;
        };

        console.log('Expense: ', expenseData)
        const newExpense = new Expense(expenseData);
        await newExpense.save();

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

        updateExpense(req.body, expense)
        await expense.save();

        res.status(200).json({ message: "expense edited successfully" })
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
        );
        if (!expense) {
            return res.status(404).json({ message: "No expense Found for you to Delete " })
        }

        res.status(200).json({ message: "Expense Deleted successfully", expense: expense })
    } catch (error) {
        res.status(500).json({ message: "Error: ", error: error })
    }
});
