const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: false,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

const sendOtpEmail = async (email, otp) => {
    const formattedOtp = otp.toString().split('').join(' ');

    await transporter.sendMail({
        from: `"RentFlow" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Your RentFlow Verification Code',

        text: `
RentFlow
Your trusted rental platform

Verify your sign-in

Hello,

We received a request to sign in to your RentFlow account.

Please use the verification code below to continue:

${formattedOtp}

Expires in 45 seconds

Enter this code on the RentFlow verification screen. For your security, never share this code with anyone, including RentFlow support.

If you didn't request this verification code, you can safely ignore this email. No changes will be made to your account.

Security Notice

RentFlow will never ask you to share your OTP, password, or other security credentials via email, phone, or chat.

RentFlow
Find. Rent. Live.

© 2026 RentFlow. All rights reserved.
This is an automated message. Please do not reply to this email.
        `.trim(),

        html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your RentFlow Verification Code</title>
</head>

<body style="
    margin: 0;
    padding: 0;
    background-color: #f5f5f5;
    font-family: Arial, Helvetica, sans-serif;
    color: #222222;
">

    <div style="
        width: 100%;
        padding: 40px 15px;
        box-sizing: border-box;
    ">

        <div style="
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            border: 1px solid #e5e5e5;
        ">

            <!-- Header -->
            <div style="
                padding: 28px 30px;
                text-align: center;
                background-color: #ff762f;
                color: #ffffff;
            ">
                <div style="
                    font-size: 28px;
                    font-weight: 700;
                    letter-spacing: 0.5px;
                ">
                    RentFlow
                </div>

                <div style="
                    margin-top: 6px;
                    font-size: 14px;
                    opacity: 0.95;
                ">
                    Your trusted rental platform
                </div>
            </div>

            <!-- Main Content -->
            <div style="padding: 40px 35px;">

                <h1 style="
                    margin: 0 0 20px;
                    text-align: center;
                    font-size: 24px;
                    color: #222222;
                ">
                    Verify your sign-in
                </h1>

                <p style="
                    margin: 0 0 18px;
                    font-size: 15px;
                    line-height: 1.7;
                    color: #444444;
                ">
                    Hello,
                </p>

                <p style="
                    margin: 0 0 18px;
                    font-size: 15px;
                    line-height: 1.7;
                    color: #444444;
                ">
                    We received a request to sign in to your
                    <strong>RentFlow</strong> account.
                </p>

                <p style="
                    margin: 0 0 25px;
                    font-size: 15px;
                    line-height: 1.7;
                    color: #444444;
                ">
                    Please use the verification code below to continue:
                </p>

                <!-- OTP -->
                <div style="
                    text-align: center;
                    margin: 30px 0;
                ">

                    <div style="
                        display: inline-block;
                        padding: 18px 28px;
                        background-color: #fff3ed;
                        border: 1px solid #ffd2bd;
                        border-radius: 10px;
                    ">
                        <div style="
                            font-size: 32px;
                            font-weight: 700;
                            letter-spacing: 8px;
                            color: #ff762f;
                            font-family: Arial, Helvetica, sans-serif;
                        ">
                            ${formattedOtp}
                        </div>
                    </div>

                    <div style="
                        margin-top: 14px;
                        font-size: 14px;
                        font-weight: 600;
                        color: #ff762f;
                    ">
                        Expires in 45 seconds
                    </div>

                </div>

                <p style="
                    margin: 25px 0 18px;
                    font-size: 15px;
                    line-height: 1.7;
                    color: #444444;
                ">
                    Enter this code on the RentFlow verification screen.
                    For your security, <strong>never share this code with anyone</strong>,
                    including RentFlow support.
                </p>

                <p style="
                    margin: 0 0 30px;
                    font-size: 14px;
                    line-height: 1.7;
                    color: #666666;
                ">
                    If you didn't request this verification code, you can safely
                    ignore this email. No changes will be made to your account.
                </p>

                <!-- Security Notice -->
                <div style="
                    padding: 18px 20px;
                    background-color: #fafafa;
                    border-left: 4px solid #ff762f;
                    border-radius: 6px;
                ">

                    <div style="
                        font-size: 14px;
                        font-weight: 700;
                        color: #222222;
                        margin-bottom: 7px;
                    ">
                        Security Notice
                    </div>

                    <div style="
                        font-size: 13px;
                        line-height: 1.6;
                        color: #666666;
                    ">
                        RentFlow will never ask you to share your OTP,
                        password, or other security credentials via email,
                        phone, or chat.
                    </div>

                </div>

            </div>

            <!-- Footer -->
            <div style="
                padding: 25px 30px;
                text-align: center;
                background-color: #fafafa;
                border-top: 1px solid #eeeeee;
            ">

                <div style="
                    font-size: 16px;
                    font-weight: 700;
                    color: #ff762f;
                ">
                    RentFlow
                </div>

                <div style="
                    margin-top: 5px;
                    font-size: 13px;
                    font-style: italic;
                    color: #777777;
                ">
                    Find. Rent. Live.
                </div>

                <div style="
                    margin-top: 18px;
                    font-size: 12px;
                    line-height: 1.6;
                    color: #999999;
                ">
                    © 2026 RentFlow. All rights reserved.<br>
                    This is an automated message. Please do not reply to this email.
                </div>

            </div>

        </div>

    </div>

</body>
</html>
        `,
    });
};

module.exports = {
    sendOtpEmail,
};