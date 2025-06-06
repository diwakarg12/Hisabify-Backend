const updateExpense = (body, expense) => {
    const fieldsToUpdate = ['amount', 'description', 'category', 'createdFor', 'receiptImage', 'date'];

    fieldsToUpdate.forEach(field => {
        if (req.body[field] !== undefined && req.body[field] !== expense[field]) {
            expense[field] = req.body[field];
        }
    });
}

module.exports = {
    updateExpense
}