const { google } = require('googleapis');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

const oAuth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET,
  process.env.REDIRECT_URI
);

oAuth2Client.setCredentials({
  refresh_token: process.env.REFRESH_TOKEN,
});

async function createTransporter() {
  try {
    const { token } = await oAuth2Client.getAccessToken();
    if (!token) {
      throw new Error("Failed to obtain access token");
    }
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: process.env.SENDER_EMAIL,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        refreshToken: process.env.REFRESH_TOKEN,
        accessToken: token,
      },
    });
  } catch (error) {
    console.error('Error creating transporter:', error.message || error);
    throw error;
  }
}

async function sendEmail(user, subject, path) {
  try {
    const transporter = await createTransporter();

    const token = jwt.sign({ id: user.id }, process.env.JWT_SECRET_KEY, { expiresIn: '1h' });
    const link = `${process.env.BASE_URL}/${path}?token=${token}`;

    const mailOptions = {
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject,
      html: `<p>Please verify your email by clicking on the link below:</p><a href="${link}">${link}</a>`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`${subject} email sent:`, info.response);
  } catch (err) {
    console.error(`Error sending ${subject} email:`, err.message || err);
  }
}

async function sendVerificationEmail(user) {
  return sendEmail(user, 'Verify Your Email Address', 'verify-email');
}

async function sendResetPasswordEmail(user) {
  return sendEmail(user, 'Reset Your Password', 'reset-password');
}

module.exports = { sendVerificationEmail, sendResetPasswordEmail };
