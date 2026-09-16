const validator = require('validator');
const mongoose = require('mongoose');


const isValidDOB = (dob) => {
    const dobDate = dob instanceof Date ? dob : new Date(dob);

    if (isNaN(dobDate.getTime())) {
        throw new Error("Invalid Date of Birth. Must be a valid Date object.");
    }

    const today = new Date();
    if (dobDate > today) {
        throw new Error("Date of Birth cannot be in the future.");
    }

    const age = (today - dobDate) / (1000 * 60 * 60 * 24 * 365.25);
    if (age < 16 || age > 80) {
        throw new Error("You must be between 16 and 80 years old.");
    }
};


const signupValidation = (data) => {
    const { firstName, lastName, email, phone, gender, dob, password } = data;
    const parsedDob = dob ? new Date(dob) : null;
    const allowedGender = ["male", "female", "other"];
    const phoneStr = String(phone || '').trim();

    if (!firstName || !validator.isLength(String(firstName).trim(), { min: 3, max: 20 })) {
        throw new Error("First name must be between 3 and 20 characters long");
    } else if (!lastName || !validator.isLength(String(lastName).trim(), { min: 3, max: 20 })) {
        throw new Error("Last name must be between 3 and 20 characters long");
    } else if (!email || !validator.isEmail(String(email).trim())) {
        throw new Error("Please enter a valid email address (e.g. name@example.com)");
    } else if (!phoneStr) {
        throw new Error("Phone number is required");
    } else if (!phoneStr.startsWith('+')) {
        throw new Error("Please include country code (+91) before phone number (e.g. +919876543210)");
    } else if (!validator.isMobilePhone(phoneStr, 'any')) {
        throw new Error("Invalid phone number format. Please enter a valid mobile number with country code (e.g. +919876543210)");
    } else if (!gender || !allowedGender.includes(String(gender).toLowerCase())) {
        throw new Error("Invalid gender selected. Please select Male, Female, or Other");
    } else if (!password || !validator.isStrongPassword(String(password))) {
        throw new Error("Password must be at least 8 characters long and contain uppercase, lowercase, numbers, and special characters.");
    } else if (parsedDob) {
        isValidDOB(parsedDob);
    }
};

const loginValidation = (data) => {
    const input = String(data.email || '').trim();
    if (!input) {
        throw new Error("Email or phone number is required");
    }
    const isEmail = validator.isEmail(input);
    const isPhone = validator.isMobilePhone(input, 'any');
    if (!isEmail && !isPhone) {
        throw new Error("Please enter a valid email address or phone number with country code (e.g. +919876543210)");
    } else if (!data.password) {
        throw new Error("Password is required");
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
    const imageExtensions = [
        'jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'avif', 'ico', 'tiff', 'tif', 'heic', 'heif', 'jfif', 'pjpeg', 'pjp', 'raw', 'eps'
    ];

    const imageRegex = new RegExp(`\\.(${imageExtensions.join('|')})$`, 'i');
    const isImageUrl = validator.isURL(str, { require_protocol: true }) && imageRegex.test(str);

    const base64Regex = /^data:image\/(jpg|jpeg|png|gif|bmp|webp|svg|avif|ico|tiff|tif|heic|heif|jfif|pjpeg|pjp|raw|eps);base64,/i;
    const isBase64 = base64Regex.test(str);

    return isImageUrl || isBase64;
};

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
    } else if (description && !validator.isLength(description, { min: 5, max: 999999 })) {
        throw new Error("Description is should between 10 to 999999 characters");
    } else if (category && !validCaterogies.includes(category)) {
        throw new Error("Invalid Category, Please Select valid Category");
    } else if (createdFor && !mongoose.Types.ObjectId.isValid(createdFor)) {
        throw new Error("Invalid CreatedFor userId");
    } else if (groupId && !mongoose.Types.ObjectId.isValid(groupId)) {
        throw new Error("Invalid GroupId");
    } else if (receiptImage) {
        if (!isValidImageUrlOrBase64(data.receiptImage)) {
            throw new Error("Invalid Profile URL");
        };
    } else if (date) {
        if (validator.isDate(date, { format: 'YYYY-MM-DD', strictMode: true })) {
            const newDate = new Date(date + "T00:00:00");
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
        throw new Error("Group is not a valid ObjectId");
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