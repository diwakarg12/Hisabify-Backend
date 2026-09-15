const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
    amount: {
        type: Number,
        required: [true, "Amount is Required"]
    },
    description: {
        type: String,
        required: [true, "Description is Required"]
    },
    date: {
        type: String,
        default: () => new Date().toISOString().split('T')[0]
    },
    category: {
        type: String,
        default: "other"
    },
    categoryId: {
        type: mongoose.Schema.ObjectId,
        ref: "CustomCategory",
        required: false,
        default: null
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        required: [true, "expense creator is Required"],
        ref: "User"
    },
    createdFor: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        default: null
    },
    isPersonal: {
        type: Boolean,
        default: true
    },
    groupId: {
        type: mongoose.Schema.ObjectId,
        ref: "Group",
        default: null
    },
    receiptImage: {
        type: String,
        default: ""
    },
    isDeleted: {
        type: Boolean,
        default: false
    }

}, { timestamps: true });

expenseSchema.pre("save", function (next) {
    if (!this.isPersonal && !this.groupId) {
        return next(new Error("Group Id is Required for Group Expense"))
    }
    next();
});

expenseSchema.index({ createdBy: 1 });
expenseSchema.index({ createdFor: 1 });
expenseSchema.index({ groupId: 1 });
expenseSchema.index({ date: 1 });
expenseSchema.index({ isPersonal: 1 });
expenseSchema.index({ categoryId: 1 });

const Expense = new mongoose.model("Expense", expenseSchema);
module.exports = Expense;