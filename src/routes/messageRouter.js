const express = require('express')
const Message = require("../models/message.model");
const userAuth = require('../middlewares/userAuth.middleware');
const User = require('../models/user.model');
const logEvent = require('../utils/logger')

const messageRouter = express.Router();

messageRouter.post("/send", userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser?._id && !loggedInUser) {
            return res.status(401).json({ message: "You are not Authorized, Please Login" })
        }

        const { title, message } = req.body;

        const result = await Message.create({
            userId: loggedInUser?._id,
            title,
            message
        });

        const logData = {
            action: "Message SENT",
            description: "Message sent Successfully",
            performedBy: loggedInUser?._id,
            group: null,
            meta: {
                title: title,
                message: message
            },
        };

        await logEvent(logData)

        res.status(200).json({ message: "Message sent successfully!", message: result })

    } catch (error) {
        res.status(500).json({ message: error.message })
    }
})

messageRouter.post("/delete/:id", userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        const { id } = req.params;
        if (!loggedInUser?._id || !loggedInUser) {
            res.status(401).json({ message: "user is not Authorized, Please Login" })
        }

        const messages = await Message.findById(id);
        if (!messages) {
            res.status(404).json({ message: "No Message Found" })
        };

        messages.isDeleted = true;
        messages.save();

        res.status(200).json({ message: "Message Deleted Successfully", message: messages })

    } catch (error) {
        res.status(500).json({ message: "Something went wrong", error: error.message })
    }
})

messageRouter.get("/getAll", userAuth, async (req, res) => {
    try {

        const loggedInUser = req.user;
        if (!loggedInUser?._id || !loggedInUser) {
            res.status(401).json({ message: "user is not Authorized, Please Login" })
        }

        const messages = await Message.find({ isDeleted: false });

        res.status(200).json({ message: `You Got ${messages.length} messages`, messages })

    } catch (error) {
        res.status(500).json({ message: "Something went Wrong", error: error.message })
    }
});

module.exports = messageRouter;