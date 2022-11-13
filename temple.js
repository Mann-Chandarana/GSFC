//jshint esversion:6
require('dotenv').config();
const express = require("express");
const dotenv = require("dotenv");
const app = express();
const cors = require("cors");
const bodyParser = require("body-parser");
const crypto = require("crypto");
const Razorpay = require("razorpay");
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const prompt = require("prompt-sync");

const cookieParser = require("cookie-parser");
const sessions = require('express-session');
// const fileUpload = require('express-fileupload');
// app.use(fileUpload()); // Don't forget this line!
const multer = require("multer");
const {
    GridFsStorage
} = require("multer-gridfs-storage");
const { stringify } = require('querystring');


//Middlewares
app.use(express.static("public"));
app.use(cors());
app.use(express.json());
app.use(
    bodyParser.urlencoded({
        extended: false,
    })
);
app.use(bodyParser.json());
app.set("view engine", "ejs");

///////////////////////////////////////////// Creating session
const oneDay = 1000 * 60 * 60 * 24;
app.use(sessions({
    secret: "thisismysecrctekeyfhrgfgrfrty84fwir767",
    saveUninitialized: true,
    cookie: { maxAge: oneDay },
    resave: false
}));

app.use(cookieParser());

////////// Starting of backend

app.get("/", function (req, res) {
    session = req.session;
    let date = new Date().getFullYear();
    if (session.userid) {
        res.render('index', { islogin: false, date: date });
    }
    else {
        res.render('index', { islogin: true, date: date });
    }
});

app.get("/donation", function (req, res) {
    res.sendFile(__dirname + "/donation.html");
});

app.post("/", function (req, res) {
    // console.log(req.body.email);

    var output =
        `You have a new contact request
          contact Details
          Name : ${req.body.name}
          Email : ${req.body.email}
          Phone : ${req.body.phone}
          Message
         ${req.body.message}`;

    var transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        // service: 'gmail',
        auth: {
            user: process.env.MAIL_IDE,
            pass: process.env.PASSWORD
        }
    });

    var mailOptions = {
        from: req.body.email,
        to: 'ftct.gsfc@gmail.com',
        subject: `Message from ${req.body.name}`,
        text: output
    };

    transporter.sendMail(mailOptions, function (err, info) {
        if (err) {
            console.log(err);
        }
        else {
            res.sendFile(__dirname + "/mail_success.html")
        }
    });
});

app.get("/file", function (req, res) {
    session = req.session;
    if (session.userid) {

        res.sendFile(__dirname + "/file1.html")
    }
    else {
        res.sendFile(__dirname + "/login.html");
    }

});

require("dotenv")
    .config();

const mongouri = 'mongodb+srv://admin-Mann:Test-123@cluster0.ghh2aew.mongodb.net/templledb1';

/************************* Uploading file to the server *****************************/
try {
    mongoose.connect(mongouri, {
        useUnifiedTopology: true,
        useNewUrlParser: true
    });
} catch (error) {
    handleError(error);
}
process.on('unhandledRejection', error => {
    console.log('unhandledRejection', error.message);
});

//creating bucket
var bucket;
mongoose.connection.on("connected", () => {
    var client = mongoose.connections[0].client;
    var db = mongoose.connections[0].db;
    bucket = new mongoose.mongo.GridFSBucket(db, {
        bucketName: "newBucket"
    });
});

app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));

const storage = new GridFsStorage({
    url: mongouri,
    file: (req, file) => {
        return new Promise((resolve, reject) => {
            const filename = file.originalname;
            const fileInfo = {
                filename: filename,
                bucketName: "newBucket"
            };
            resolve(fileInfo);
        });
    }
});

const upload = multer({
    storage
});

/************************* End of file uploading *****************************/

/************************* Creating schema for users *****************************/

const itemSchema = {
    name_event: String,
    date_event: String
}

const Item = mongoose.model("Item", itemSchema);

/************************* Ending schema for users schema for users *****************************/

// app.post("/upload", upload.single("file"), (req, res) => {
//     res.status(200).sendFile(__dirname + "/file_uploaded_succ.html");
// });
app.post("/upload", upload.single("file"), (req, res) => {

    const name = req.body.name;
    const date = req.body.date;

    const item1 = new Item({
        name_event: name,
        date_event: date
    })

    item1.save();

    res.status(200).sendFile(__dirname + "/file_uploaded_succ.html");
});

/////////////////////////// To retrieve data from given file

app.get('/pdf/:filename', (req, res) => {
    const file = bucket
        .find({
            filename: req.params.filename
        })
        .toArray((err, files) => {
            if (!files || files.length === 0) {
                return res.status(404)
                    .json({
                        err: "no files exist"
                    });
            }
            bucket.openDownloadStreamByName(req.params.filename)
                .pipe(res);
        });
});

////////// a variable to save a session
var session;


app.get('/pdfFiles', (req, res) => {
    bucket.find().toArray(async (err, files) => {

        let arr = []
        arr = await Item.find({});
        // console.log(arr)
        session = req.session;
        if (session.userid) {

            res.render('pdf', { files: files, islogin: true, founded: arr });
        }
        else {
            res.render('pdf', { files: files, islogin: false, founded: arr });
        }

        // }
    });
});

////////////  Delete function 
app.post('/delete/:id', (req, res) => {

    const [post_id,file_id] = (req.params.id).split("_");
    
    Item.findByIdAndDelete(file_id,(err,docs)=>{
        if (err) {
            console.log(err);
            // return res.status(404).json({err:err});
        }    
    })

    bucket.delete(mongoose.Types.ObjectId(post_id), (err, files) => {
        if (!err) {
            console.log("Successfully deleted document");
            res.redirect('/pdfFiles');
        }
        else {
            console.log(err);
            return res.status(404).json({ err: err });
        }
    })

});

//////////////////////////////////////////// Login system
app.post("/submit_pass", (req, res) => {
    let password = req.body.pass;
    let email_id = req.body.email;

    if (((email_id == process.env.MAIL_ID) && (password == process.env.PASS))) {
        session = req.session;
        session.userid = email_id;
        // console.log(req.session);
        // console.log(Document);
        res.redirect("/");
    }

    else {
        res.sendFile(__dirname + "/failure.html");
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy();
    res.redirect("/");
});

app.listen(process.env.PORT || 3000, function () {
    console.log("Server has started successfully");
});