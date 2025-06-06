const mongoose = require('mongoose');

const invitationSchema = new mongoose.Schema({
    groupId: {
        type: mongoose.Schema.ObjectId,
        ref: "Group",
        require: [true, "Group id is Required"]
    },
    invitedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        require: [true, "InvitedBy is Required"]
    },
    invitedTo: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        require: [true, "InvitedUser is Required"]
    },
    status: {
        type: String,
        enum: {
            values: ["pending", "accepted", "rejected"],
            message: "{VALUE} is not a Valid Status"
        },
        default: "pending"
    }

}, { timestamps: true });

invitationSchema.index({ groupId: 1 });
invitationSchema.index({ invitedBy: 1 });
invitationSchema.index({ invitedUser: 1 });

const Invitation = new mongoose.model("Invitation", invitationSchema);
module.exports = Invitation;