const mongoose = require('mongoose');

const splitExpenseSchema = new mongoose.Schema({
    expenseId: {
        type: mongoose.Schema.ObjectId,
        required: [true, 'expenseId is required'],
        ref: 'Expense'
    },
    splitBetween: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null   // null for dummy users
        },
        dummyId: {
            type: mongoose.Schema.ObjectId,
            default: null   // null for real users
        }
    }],
    splits: [{
        user: {
            type: mongoose.Schema.ObjectId,
            ref: 'User',
            default: null   // NOT required — dummy users won't have this
        },
        dummyId: {
            type: mongoose.Schema.ObjectId,
            default: null
        },
        name: {
            type: String,
            default: null   // populated for dummy users, null for real users
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

splitExpenseSchema.index({ expenseId: 1 });

const SplitExpense = new mongoose.model('SplitExpense', splitExpenseSchema);
module.exports = SplitExpense;
