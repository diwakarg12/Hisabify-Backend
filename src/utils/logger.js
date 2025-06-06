const Log = require('../models/log.model');
const { logValidation } = require('./apiValidation');

const logEvent = async (logData) => {
    try {
        logValidation(logData)
        const { action, description, meta, performedBy, targetUser, group, expense } = logData;
        const log = await Log.crete({
            action: action,
            description: description,
            meta: meta,
            performedBy: performedBy,
            targetUser: targetUser,
            group: group,
            expense: expense
        })

        console.log('Log has been created', log)
    } catch (error) {
        throw new Error("Error: ", error.message);
    }
}