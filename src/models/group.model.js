const mongoose = require('mongoose');

const groupSchema = new mongoose.Schema({
    groupName: {
        type: String,
        require: [true, "Group name is Required"]
    },

    createdBy: {
        type: mongoose.Schema.ObjectId,
        required: true,
        ref: "User"
    },
    members: [{
        type: mongoose.Schema.ObjectId,
        ref: "User"
    }],

}, { timestamps: true });

groupSchema.index({ name: 1 });
groupSchema.index({ createdBy: 1 });
groupSchema.index({ members: 1 });

const Group = new mongoose.model("Group", groupSchema);

module.exports = Group;