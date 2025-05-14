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
        default: Date.now
    },
    category: {
        type: String,
        enum: {
            values: [""],
            message: "${VALUE} is not a valid Category"
        },
        default: "Others"
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        required: [true, "expense creator is Required"]
    },
    createdFor: {
        type: mongoose.Schema.ObjectId,
        required: [true, "Contributor is Required"]
    },
    isPersonal: {
        type: Boolean,
        required: [true, "IsPersonal flag is Required"]
    },
    groupId: {
        type: mongoose.Schema.ObjectId,
        ref: "Group"
    },
    receiptImage: {
        type: String,
        default: ""
    },

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

const Expense = new mongoose.model("Expense", expenseSchema);
module.exports = Expense;