const mongoose = require('mongoose');

const splitExpenseSchema = new mongoose.Schema({
    expenseId: {
        type: mongoose.Schema.ObjectId,
        require: [true, 'expenseId is required'],
        ref: 'Expense'
    },
    splitBetween: [{
        type: mongoose.Schema.ObjectId,
        ref: 'User'
    }],
    splits: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            require: [true, 'split user is required']
        },
        splittedAmount: {
            type: Number,
            required: [true, 'splitted amount is required']
        }
    }],
    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

const SplitExpense = new mongoose.model('SplitExpense', splitExpenseSchema);

module.exports = SplitExpense;