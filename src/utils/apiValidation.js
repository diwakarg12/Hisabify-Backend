const validator = require('validator');
const mongoose = require('mongoose');

const signupValidation = (data) => {
    const { firstName, lastName, email, phone, gender, age, password } = data;
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
    } else if (!validator.isInt(age.toString(), { min: 18, max: 100 })) {
        throw new Error("Invalid Age");
    } else if (!validator.isStrongPassword(password)) {
        throw new Error("Password is not Strong");
    }
}

const loginValidation = (data) => {
    if (!validator.isEmail(data.email)) {
        throw new Error("Invalid Email");
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
    const updatable = ["firstName", "lastName", "phone", "gender", "age", "profile"];
    const isUpdatable = Object.keys(data).every(req => updatable.includes(req));

    if (!isUpdatable) {
        throw new Error("Invalid update request");
    } else if (data.firstName && !validator.isLength(data.firstName, { min: 3, max: 20 })) {
        throw new Error("FirstName should be between 3 to 20 character long");
    } else if (data.lastName && !validator.isLength(data.lastName, { min: 3, max: 20 })) {
        throw new Error("LastName should be between 3 to 20 character long");
    } else if (data.phone && !validator.isMobilePhone(data.phone)) {
        throw new Error("Phone Number is not Valid");
    } else if (data.age && !validator.isInt(data.age.toString(), { min: 18, max: 100 })) {
        throw new Error("You are not Eligible");
    } else if (data.profile && !isValidImageUrlOrBase64(data.profile)) {
        throw new Error("Invalid Profile URL");
    }
};

const addExpenseValidation = (data) => {
    const validCaterogies = [];
    if (data.amount && !validator.isNumeric(data.amount) && !validator.isInt(data.amount.toString(), { min: 0, max: 999999999 })) {
        throw new Error("Amount is Invalid, Please Enter Valid Amount");
    } else if (data.description && !validator.isLength(data.description, { min: 10, max: 999999 })) {
        throw new Error("Description is should between 10 to 999999 characters");
    } else if (data.category && !validCaterogies.includes(data.category)) {
        throw new Error("Invalid Category, Please enter valid Category");
    } else if (data.createdFor && !mongoose.Types.ObjectId.isValid(data.createdFor)) {
        throw new Error("Invalid CreatedFor userId");
    } else if (!validator.isBoolean(data.isPersonal)) {
        throw new Error("isPersonal is not Boolean");
    } else if (data.groupId && !mongoose.Types.ObjectId.isValid(data.groupId)) {
        throw new Error("Invalid GroupId");
    } else if (data.receiptImage) {
        if (!isValidImageUrlOrBase64(data.receiptImage)) {
            throw new Error("Invalid Profile URL");
        }
    }
};

module.exports = {
    signupValidation,
    loginValidation,
    updatePasswordValidation,
    updateProfileValidation,
    addExpenseValidation
}