const nodemailer = require('nodemailer');
const express = require('express');
const cors = require('cors')
const app = express();
app.use(express.json())
app.use(cors())


const sendMailServer = (req, res) => {
    const {firstName, lastName, userMsg, userMail} = req.body;

    // required field
    if(!firstName || !userMsg || !userMail){
        return res.status(400).json({error: "all fields are required"});
    }

    // Email-sending function
    const transporter = nodemailer.createTransport({
        service: "gmail",
        secure: true,
        port: 465,
        auth: {
            user: "sbrutikumari@gmail.com", // Sender's email
            pass: "etso vzim cskq guir",    // Gmail App Password
        }
    });

    //define mail options
    const mailoptions = {
        from: userMail,
        to: "sbrutikumari@gmail.com",
        text: userMsg,                  //body
        subject: `New form submission from ${firstName} ${lastName}`
    }

    // Send the email
    transporter.sendMail(mailoptions, (error, info)=>{
        if(error){
            return res.status(500).json({ error: "Something went wrong. Please try again later.", ok: false });
        }
        else{
            return res.status(200).json({ message: "Email sent successfully.", ok: true });;
        }
    })
}


module.exports = sendMailServer;