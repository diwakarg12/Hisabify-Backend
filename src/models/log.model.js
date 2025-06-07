const express = require('express');
const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
    action: {
        type: String,
        require: [true, "Action is required"]
    },
    description: {
        type: String,
        require: [true, "Description is required"]
    },
    meta: {
        type: mongoose.Schema.Types.Mixed,
        require: [true, "meta Data is required"]
    },
    performedBy: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        require: [true, "performedBy user is required"]
    },
    targetUser: {
        type: mongoose.Schema.ObjectId,
        ref: "User",
        default: null
    },
    group: {
        type: mongoose.Schema.ObjectId,
        ref: "Group",
        default: null
    },
    expense: {
        type: mongoose.Schema.ObjectId,
        ref: "Expense",
        default: null
    }
}, { timestamps: true });

const Log = new mongoose.model("Log", logSchema);

module.exports = Log;