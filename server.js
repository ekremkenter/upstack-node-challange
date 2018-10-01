require('dotenv').config();

const express = require('express');
const mysql = require('mysql');
const randomstring = require('randomstring');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const app = express();
app.use(bodyParser.json());

const port = process.env.PORT || 3000;
const {EMAIL_USER, EMAIL_PWD} = process.env;
const connection = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB
})

connection.connect((err) => {
    if (err) {
        console.log(err);
    } else {
        console.log('Connected to DB')
    }
})

app.get('/register', (req, res)=>{
    res.sendFile(__dirname + '/public/register.html')
})
app.post('/api/register', (req, res) => {
    //get email and password from request body
    const {
        email,
        username
    } = req.body;
    const code = randomstring.generate(10);

    connection.query(`INSERT INTO users (username, email, verification_code) VALUES ('${username}', '${email}', '${code}')`, (err, results, fields) => {
        if (err) {
            console.log(err);
            res.sendStatus(500);
            return;
        }

        console.log(results);
        const subject = 'Your registration link';
        const mail = `Please confirm your registration here: <a href="${req.protocol}://${req.get('host')}/confirm/${code}">Click here</a>`
        sendEmail(email,subject,mail).then(info=>{
            res.json({
                message: 'OK'
            })
        }).catch(err=>{
            console.log(err);
            res.status(500).send({
                message: err
            })
        });

        //send email logic
    })


})

app.get('/confirm/:code', async (req, res)=>{
    const {code} = req.params;

    console.log(`Code recieved ${code}`);
    try{
        await getUserWithCode(code);
        await validateUser(code);

        res.sendFile(__dirname + '/public/ok.html')
    }catch(err){
        res.sendFile(__dirname + '/public/notok.html')
    }

})

app.listen(port, () => console.log(`App started on port ${port}`))


function sendEmail(to, subject, mail) {
    return new Promise((resolve, reject)=>{
        var transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PWD
            }
        });
        const mailOptions = {
            from: EMAIL_USER,
            to: to,
            subject: subject,
            html: mail
        };
        transporter.sendMail(mailOptions, function (err, info) {
            if(err)
              reject(err);
            else
              resolve(info);
         });
    })

}

function getUserWithCode(code){
    return new Promise((resolve, reject)=>{
        connection.query(`SELECT username, email from users WHERE verification_code='${code}' AND verified=0`, (err, results)=>{
            if(err){
                reject(err);
            }else{
                if(results && results[0]){
                    resolve({
                        user: results[0]
                    })
                }else{
                    reject(new Error('Invalid code'))
                }
            }
        })
    })
}

function validateUser(code){
    return new Promise((resolve, reject)=>{
        connection.query(`UPDATE users SET verified=1 WHERE verification_code='${code}' AND verified=0`, (err, results)=>{
            if(err){
                reject(err);
            }else{
                resolve();
            }
        })
    })
}
