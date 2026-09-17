const nodemailer = require('nodemailer');

const sendResetOtp = async (email, otp) => {
    const emailUser = process.env.EMAIL_USER?.trim();
    // Remove spaces from Google App Password if present (e.g. "kbrg zrvp uoep nqgv" -> "kbrgzrvpuoepnqgv")
    const emailPass = process.env.EMAIL_PASS ? process.env.EMAIL_PASS.replace(/\s+/g, '') : '';

    if (!emailUser || !emailPass) {
        throw new Error("Email configuration error: EMAIL_USER or EMAIL_PASS is missing in server environment variables.");
    }

    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: emailUser,
            pass: emailPass,
        },
    });

    const mailOptions = {
        from: emailUser,
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