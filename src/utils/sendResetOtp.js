const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
    },
});

const sendResetOtp = async (email, otp) => {

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: 'Hisabify Password Reset OTP',
        html: `
            <h2>Password Reset OTP</h2>
            <p>Your OTP is:</p>
            <h1>${otp}</h1>
            <p>This OTP will expire in 15 minutes.</p>
        `,
    };

    await transporter.sendMail(mailOptions);

    console.log('OTP Email Sent');
};

module.exports = sendResetOtp;