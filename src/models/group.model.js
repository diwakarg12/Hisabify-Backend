const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    groupName: {
        type: String,
        required: [true, "Group name is Required"]
    },
    description: {
        type: String,
        required: [true, 'Group Description is Required']
    },
    createdBy: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "User"
    },
    isDeleted: {
        type: Boolean,
        default: false
    },
    members: [{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],

}, { timestamps: true });

groupSchema.index({ members: 1, isDeleted: 1 });
groupSchema.index({ _id: 1, isDeleted: 1 });

const Group = new mongoose.model("Group", groupSchema);

module.exports = Group;