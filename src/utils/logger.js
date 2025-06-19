const Log = require('../models/log.model');
const { logValidation } = require('./apiValidation');

const logEvent = async (data) => {
    try {
        console.log('Log', data)
        logValidation(data)
        const { action, description, meta, performedBy, targetUser = null, group = null, expense = null } = data;
        const log = await Log.create({
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
        throw new Error("Log Event Failed: " + error.message);
    }
};

module.exports = logEvent;
