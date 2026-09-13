const mongoose = require("mongoose");

const customCategorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "CustomCategory Name is required."],
        trim: true
    },

    type: {
        type: String,
        enum: ["default", "personal", "group"],
        default: "personal"
    },

    // only for personal categories
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null
    },

    // only for group categories
    groupId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Group",
        default: null
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, { timestamps: true });

customCategorySchema.index(
    { name: 1, type: 1, userId: 1, groupId: 1 },
    { unique: true }
);

const CustomCategory = mongoose.model("CustomCategory", customCategorySchema);

module.exports = CustomCategory;