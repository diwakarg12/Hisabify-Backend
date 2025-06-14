const updateExpense = (body, expense, logData) => {
    const fieldsToUpdate = ['amount', 'description', 'category', 'createdFor', 'receiptImage', 'date'];

    fieldsToUpdate.forEach(field => {
        if (body[field] !== undefined && body[field] !== expense[field]) {
            logData.meta[field] = {
                old: expense[field], new: body[field]
            }
            expense[field] = body[field];
        }
    });
};

module.exports = {
    updateExpense
}