const express = require('express');
const userAuth = require('../middlewares/userAuth.middleware');
const Notification = require('../models/notification.model');

const notificationRouter = express.Router();

// GET all notifications for the logged-in user
notificationRouter.get('/getAll', userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    if (!loggedInUser || !loggedInUser._id) {
      return res.status(401).json({ message: 'You are not authorized, please login' });
    }

    const notifications = await Notification.find({ recipient: loggedInUser._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'firstName lastName profile')
      .populate('groupId', 'groupName')
      .lean();

    const unreadCount = await Notification.countDocuments({
      recipient: loggedInUser._id,
      isRead: false,
    });

    res.status(200).json({
      message: 'Notifications fetched successfully',
      notifications,
      unreadCount,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark single notification as read
notificationRouter.put('/markAsRead/:id', userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { id } = req.params;

    if (!loggedInUser || !loggedInUser._id) {
      return res.status(401).json({ message: 'You are not authorized, please login' });
    }

    const notification = await Notification.findOneAndUpdate(
      { _id: id, recipient: loggedInUser._id },
      { isRead: true },
      { new: true }
    );

    res.status(200).json({ message: 'Notification marked as read', notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Mark all notifications as read
notificationRouter.put('/markAllRead', userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    if (!loggedInUser || !loggedInUser._id) {
      return res.status(401).json({ message: 'You are not authorized, please login' });
    }

    await Notification.updateMany(
      { recipient: loggedInUser._id, isRead: false },
      { isRead: true }
    );

    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete a notification
notificationRouter.delete('/:id', userAuth, async (req, res) => {
  try {
    const loggedInUser = req.user;
    const { id } = req.params;

    if (!loggedInUser || !loggedInUser._id) {
      return res.status(401).json({ message: 'You are not authorized, please login' });
    }

    await Notification.deleteOne({ _id: id, recipient: loggedInUser._id });

    res.status(200).json({ message: 'Notification deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = notificationRouter;
