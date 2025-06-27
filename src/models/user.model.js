const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: {
        type: String,
        require: [true, "firstName is requireed"]
    },
    lastName: {
        type: String
    },
    email: {
        type: String,
        require: [true, "Email is Required"],
        unique: true
    },
    phone: {
        type: String,
        require: [true, "Phone is Required"],
        unique: true
    },
    gender: {
        type: String,
        enum: {
            values: ["male", "female", "Others"],
            message: "{VALUE} is Required"
        }
    },
    dob: {
        type: Date,
        require: [true, "Age is required"],
    },
    profile: {
        type: String,
        default: "https://cdn.vectorstock.com/i/2000v/51/87/student-avatar-user-profile-icon-vector-47025187.avif"
    },
    password: {
        type: String,
        require: [true, "Password is Required"]
    },
    income: {
        type: Number,
        default: 0,
        min: 0
    },
    occupation: {
        type: String,
        default: "Not Assigned"
    }
}, { timestamps: true });

userSchema.index({ firstName: 1 });
userSchema.index({ lastName: 1 });

const User = new mongoose.model("User", userSchema);

module.exports = User;