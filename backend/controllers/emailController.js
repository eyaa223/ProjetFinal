import nodemailer from 'nodemailer';
console.log("EMAIL =>", process.env.EMAIL);
console.log("EMAIL_PASSWORD =>", process.env.EMAIL_PASSWORD);
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD
  }
});

export const sendEmail = async (to, subject, html) => {
  await transporter.sendMail({
    from: `"DonAct" <${process.env.EMAIL}>`,
    to,
    subject,
    html
  });
};