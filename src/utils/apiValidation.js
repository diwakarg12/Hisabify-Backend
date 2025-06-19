const validator = require('validator');
const mongoose = require('mongoose');


const isValidDOB = (dob) => {
    if (!(dob instanceof Date)) {
        throw new Error("Invalid Date of Birth. Must be a valid Date object.");
    }
    const today = new Date();
    if (dob > today) {
        throw new Error("Date of Birth cannot be in the future.");
    }
    const age = (today - dob) / (1000 * 60 * 60 * 24 * 365.25); // approx years
    if (age < 16 || age > 80) {
        throw new Error("You must be between 16 and 80 years old.");
    }
};

const signupValidation = (data) => {
    const { firstName, lastName, email, phone, gender, dob, password } = data;
    const parsedDob = new Date(dob);
    const allowedGender = ["male", "female", "other"];

    if (!validator.isLength(firstName, { min: 3, max: 20 })) {
        throw new Error("FirstName should be between 3 to 20 character long");
    } else if (!validator.isLength(lastName, { min: 3, max: 20 })) {
        throw new Error("LastName should be between 3 to 20 character long");
    } else if (!validator.isEmail(email)) {
        throw new Error("Invalid Email");
    } else if (!validator.isMobilePhone(phone)) {
        throw new Error("Invalid Phone Number");
    } else if (!allowedGender.includes(gender)) {
        throw new Error("Invalid Gender");
    } else if (!validator.isStrongPassword(password)) {
        throw new Error("Password is not Strong");
    } else if (parsedDob) {
        isValidDOB(parsedDob);
    }
};

const loginValidation = (data) => {
    const isEmail = validator.isEmail(data.email);
    const isPhone = validator.isMobilePhone(data.email, 'any');
    if (!isEmail && !isPhone) {
        throw new Error("Enter a valid email or phone number");
    } else if (!validator.isStrongPassword(data.password)) {
        throw new Error("Please check password again");
    }
};

const updatePasswordValidation = (data) => {
    if (!validator.isStrongPassword(data.currentPassword)) {
        throw new Error("Please check password again");
    } else if (!validator.isStrongPassword(data.newPassword)) {
        throw new Error("Please check password again");
    }
};

const isValidImageUrlOrBase64 = (str) => {
    const isImageUrl = validator.isURL(str, { require_protocol: true }) && /\.(jpg|jpeg|png|gif|bmp|webp|svg)$/i.test(str);
    const isBase64 = /^data:image\/(png|jpeg|jpg|gif|bmp|webp);base64,/i.test(str);
    return isImageUrl || isBase64;
}

const updateProfileValidation = (data) => {
    const updatable = ["firstName", "lastName", "dob", "gender", "occupation", "income", "profile"];
    const isUpdatable = Object.keys(data).every(req => updatable.includes(req));
    const allowedGender = ["male", "female", "other"];

    const { firstName, lastName, dob, gender, income, occupation, profile } = data;

    if (!isUpdatable) {
        throw new Error("Invalid update request");
    } else if (firstName && !validator.isLength(firstName, { min: 3, max: 20 })) {
        throw new Error("FirstName should be between 3 to 20 characters");
    } else if (lastName && !validator.isLength(lastName, { min: 3, max: 20 })) {
        throw new Error("LastName should be between 3 to 20 characters");
    } else if (income && !validator.isNumeric(income.toString())) {
        throw new Error("Income is not valid");
    } else if (occupation === undefined || occupation === null || occupation === "") {
        throw new Error("Occupation is required");
    } else if (gender && !allowedGender.includes(gender.toLowerCase())) {
        throw new Error("Invalid gender");
    } else if (profile && !isValidImageUrlOrBase64(profile)) {
        throw new Error("Invalid profile URL or image");
    } else if (dob) {
        isValidDOB(dob);
    }
};


const addExpenseValidation = (data) => {
    const { amount, description, category, createdFor, isPersonal, groupId, receiptImage, date } = data;
    const validCaterogies = ["shopping", "Food & Dining", "Groceries", "Restaurants", "Education", "Travel", "Entertainment", "Health & Wellness", "Gifts & Donations", "Miscellaneous"];
    if (amount && !validator.isNumeric(amount) && !validator.isInt(amount.toString(), { min: 0, max: 999999999 })) {
        throw new Error("Amount is Invalid, Please Enter Valid Amount");
    } else if (description && !validator.isLength(description, { min: 10, max: 999999 })) {
        throw new Error("Description is should between 10 to 999999 characters");
    } else if (category && !validCaterogies.includes(category)) {
        throw new Error("Invalid Category, Please Select valid Category");
    } else if (createdFor && !mongoose.Types.ObjectId.isValid(createdFor)) {
        throw new Error("Invalid CreatedFor userId");
    } else if (!validator.isBoolean(isPersonal)) {
        throw new Error("isPersonal is Invalid");
    } else if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
        throw new Error("Invalid GroupId");
    } else if (receiptImage) {
        if (!isValidImageUrlOrBase64(data.receiptImage)) {
            throw new Error("Invalid Profile URL");
        };
    } else if (date) {
        if (validator.isDate(date, { format: 'YYYY-MM-DD', strictMode: true })) {
            const newDate = new Date(date);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (newDate > today) {
                throw new Error("You can't choose future date");
            }
        } else {
            throw new Error("Invalid Date Format");
        }
    }
};

const logValidation = (data) => {
    const { action, description, meta, performedBy, targetUser, group, expense } = data;

    if (action && !validator.isLength(action, { min: 3 })) {
        throw new Error("Action should a string and should more than 3 character");
    } else if (description && !validator.isLength(description, { min: 10 })) {
        throw new Error("Description should be more than 10 characters");
    } else if (meta && !Object.prototype.toString.call(meta) === '[object Object]') {
        throw new Error("Invalid meta Data");
    } else if (performedBy && !mongoose.isValidObjectId(performedBy)) {
        throw new Error("CreatedBy is not Valid ObjectId");
    } else if (targetUser && !mongoose.isValidObjectId(targetUser)) {
        throw new Error("targetUser is not Valid ObjectId");
    } else if (group && !mongoose.isValidObjectId(group)) {
        throw new Error("Group us ot a valid ObjectId");
    } else if (expense && !mongoose.isValidObjectId(expense)) {
        throw new Error("Expense is not a valid ObjectId");
    }

}

module.exports = {
    signupValidation,
    loginValidation,
    updatePasswordValidation,
    updateProfileValidation,
    addExpenseValidation,
    logValidation
}