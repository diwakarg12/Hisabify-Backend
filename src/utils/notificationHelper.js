const Group = require('../models/group.model');
const User = require('../models/user.model');
const Notification = require('../models/notification.model');
const logEvent = require('./logger');

/**
 * Notifies all members of a group except the sender when an expense is added, updated, or deleted.
 */
const notifyGroupMembers = async ({ groupId, senderId, action, expense }) => {
  try {
    if (!groupId) return;

    const group = await Group.findById(groupId).lean();
    if (!group) return;

    const sender = await User.findById(senderId).select('firstName lastName').lean();
    const senderName = sender ? `${sender.firstName} ${sender.lastName || ''}`.trim() : 'A member';

    // Get all group members excluding the sender
    const recipientIds = (group.members || [])
      .map((id) => id.toString())
      .filter((id) => id !== senderId.toString());

    if (recipientIds.length === 0) return;

    let title = '';
    let message = '';
    const expenseTitle = expense?.description || expense?.category || 'expense';
    const amount = expense?.amount || 0;

    if (action === 'ADDED') {
      title = `New expense in ${group.groupName}`;
      message = `${senderName} added "${expenseTitle}" of ₹${amount} in ${group.groupName}`;
    } else if (action === 'UPDATED') {
      title = `Expense updated in ${group.groupName}`;
      message = `${senderName} updated "${expenseTitle}" in ${group.groupName}`;
    } else if (action === 'DELETED') {
      title = `Expense removed in ${group.groupName}`;
      message = `${senderName} deleted "${expenseTitle}" from ${group.groupName}`;
    }

    // Create notifications for all recipients in bulk
    const notificationDocs = recipientIds.map((recipientId) => ({
      recipient: recipientId,
      sender: senderId,
      groupId: group._id,
      expenseId: expense?._id || null,
      action,
      title,
      message,
      amount,
      isRead: false,
    }));

    await Notification.insertMany(notificationDocs);

    // Create activity log entries for each target member
    for (const recipientId of recipientIds) {
      await logEvent({
        action: `GROUP_EXPENSE_${action}`,
        description: message,
        performedBy: senderId,
        targetUser: recipientId,
        group: group._id,
        expense: expense?._id || null,
        meta: { amount, category: expense?.category, groupName: group.groupName },
      });
    }
  } catch (error) {
    console.error('Failed to send group member notifications:', error.message);
  }
};

module.exports = { notifyGroupMembers };
