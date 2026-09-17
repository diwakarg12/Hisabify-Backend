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

    const emailHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Hisabify Password Reset OTP</title>
    </head>
    <body style="margin: 0; padding: 0; background-color: #F8F9FA; font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #16181D;">
      <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #F8F9FA; padding: 40px 16px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 520px; background-color: #FFFFFF; border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px -5px rgba(31, 122, 108, 0.08), 0 8px 10px -6px rgba(0, 0, 0, 0.04); border: 1px solid #E5E9E8;">
              
              <!-- Top Accent Banner -->
              <tr>
                <td style="background: linear-gradient(135deg, #1F7A6C 0%, #176054 100%); height: 8px;"></td>
              </tr>

              <!-- Header with Hisabify Logo -->
              <tr>
                <td align="center" style="padding: 32px 32px 20px 32px;">
                  <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                    <tr>
                      <td align="center">
                        <div style="background-color: #E6F4F1; border-radius: 12px; width: 44px; height: 44px; display: inline-block; vertical-align: middle; line-height: 44px; text-align: center;">
                          <span style="font-size: 22px; color: #1F7A6C; font-weight: 800; font-family: Arial, sans-serif;">H</span>
                        </div>
                        <span style="font-size: 24px; font-weight: 800; color: #16181D; letter-spacing: -0.5px; margin-left: 10px; vertical-align: middle; display: inline-block;">
                          Hisab<span style="color: #1F7A6C;">ify</span>
                        </span>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>

              <!-- Body Content -->
              <tr>
                <td style="padding: 0 36px 36px 36px; text-align: center;">
                  <h2 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 700; color: #16181D; letter-spacing: -0.3px;">
                    Password Reset Request
                  </h2>
                  <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 1.6; color: #6B7280;">
                    We received a request to reset your password for your <strong>Hisabify</strong> account. Use the code below to set up a new password:
                  </p>

                  <!-- OTP Display Box -->
                  <div style="background-color: #E6F4F1; border: 2px dashed #1F7A6C; border-radius: 16px; padding: 22px 16px; margin: 0 0 28px 0;">
                    <span style="font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px; color: #1F7A6C; display: block; margin-bottom: 8px;">
                      Your One-Time Verification Code
                    </span>
                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; color: #1F7A6C; letter-spacing: 10px; display: inline-block; margin-left: 10px;">
                      ${otp}
                    </span>
                  </div>

                  <!-- Timer & Security Info -->
                  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                    <tr>
                      <td style="background-color: #FEF3C7; border-radius: 12px; padding: 14px 16px; text-align: left;">
                        <table role="presentation" border="0" cellspacing="0" cellpadding="0">
                          <tr>
                            <td style="font-size: 18px; padding-right: 10px; vertical-align: top;">⏱️</td>
                            <td style="font-size: 13px; line-height: 1.5; color: #92400E; font-weight: 500;">
                              This OTP is valid for <strong>15 minutes</strong>. For security purposes, never share this code with anyone.
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>

                  <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9CA3AF;">
                    If you did not request a password reset, you can safely ignore this email. Your password will remain unchanged.
                  </p>
                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td style="background-color: #F8F9FA; border-top: 1px solid #E9ECEF; padding: 20px 36px; text-align: center; font-size: 12px; color: #9CA3AF;">
                  <p style="margin: 0 0 6px 0; font-weight: 600; color: #6B7280;">
                    Hisabify — Smart Expense Tracking & Management
                  </p>
                  <p style="margin: 0;">
                    &copy; ${new Date().getFullYear()} Hisabify. All rights reserved.
                  </p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `;

    const mailOptions = {
        from: `Hisabify <${emailUser}>`,
        to: email,
        subject: `Hisabify Password Reset OTP`,
        html: emailHtml,
    };

    await transporter.sendMail(mailOptions);
    console.log('OTP Email Sent');
};

module.exports = sendResetOtp;