const mongoose = require('mongoose');

const messageSchema = mongoose.Schema({
    userId: {
        type: mongoose.Schema.ObjectId,
        required: [true, "user is required"],
        ref: "User"
    },
    title: {
        type: String,
        required: [true, "Title is Required"]
    },
    message: {
        type: String,
        required: [true, 'message is Required']
    },
    isDeleted: {
        type: Boolean,
        default: false
    }
});

messageSchema.index({ userId: 1, isDeleted: 1 });

const Message = new mongoose.model("message", messageSchema);

module.exports = Message;

