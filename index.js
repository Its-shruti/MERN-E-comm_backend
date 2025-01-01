const express = require('express');
const multer = require('multer');
const cors = require('cors');
const http = require('http');
require('dotenv').config();                 // For storing email credentials securely
const bcrypt = require('bcrypt');


require('./DB/MogooseConfig');                          //importing user - configuration file
const ProductModel = require('./DB/ProductConfig');      //importing product - configuration file
const UserModel = require('./DB/UserConfig');
const CartModel = require('./DB/CartConfig');


const Jwt = require('jsonwebtoken');
const jwtKey = process.env.JWT_KEY;

const app = express();

app.use(express.json());
app.use(cors());

app.use('/uploadedImg', express.static('uploadedImg'));   //to show saved book image




//! user Signup API ----------------------------------------------------------------
app.post('/register', async (req, res)=>{

    const {firstName, lastName, userMail, userPass} = req.body;
    const existUser = await UserModel.findOne({userMail});          //check if user already exist

    try{
        if(!firstName || !userMail || !userPass){
            return res.status(400).json({error: "Enter your data properly"});
        }
        else if(existUser){
            return res.status(400).json({error: "User already exists"});
        }
        //securing the password - converting into hashcode (bcrypt-library)
        const hashPassword = await bcrypt.hash(userPass, 16);
        const data = new UserModel({
            firstName,
            lastName, 
            userMail, 
            userPass: hashPassword
        });
        let result = await data.save();

        result = result.toObject();
        delete result.userPass;

        //userid is not an inbuilt property of req. It is a custom property that you are adding to the req object in your middleware.
        Jwt.sign({userId: result._id}, jwtKey, (err, token)=>{
            if(err){
                res.json({result: "Something went wrong, please try after sometime..."})
            }
            else{
                res.send({result, auth: token, ok: true});
            }
        })

    }catch(error){
        res.status(500).json({error: "Something went wrong..."});
    }
    
})






//! Login user API -----------------------------------------------------------------
app.post('/login', async (req, res)=>{
    const {userMail, userPass} = req.body;

    if(!userMail && !userPass){
        return res.status(400).send("email and password are required");
    }
    else{
        if(userMail  && userPass){
            const userRes = await UserModel.findOne({userMail})   //give complete data(obj) as response
            // if(bcrypt.compare(userPass))
            if(userRes && await bcrypt.compare(userPass, userRes.userPass)){
                Jwt.sign({userId: userRes._id}, jwtKey, (err, token)=> {
                    if(err){
                        res.send({error: "Something went wrong, please again later"});
                    }else{
                        res.send({firstName: userRes.firstName, lastName: userRes.lastName, userMail: userRes.userMail, userId: userRes._id, auth: token, ok: true});
                    }
                })
            }
            else{
                return res.status(400).send({error: "User not found"});
            }
        }
    }
})






//! Upload file API ----------------------------------------------------------
const upload = multer({
    storage: multer.diskStorage({
        destination: function(req, file, cb){
            cb(null, "uploadedImg");
        },
        filename: function(req, file, cb){
            cb(null, `${Date.now()}_${file.originalname}`)
        }
    })
}).single("bookImg");

//API-route for upload file
app.post('/upload', verifyToken, upload, async (req, res)=>{

    const {bookName, bookDesc, bookAuth, bookEd, bookPrice, bookQuan, bookCat } = req.body;

    try{
        if(!bookName || !bookDesc || !bookAuth || !bookEd || !bookPrice || !bookQuan || !bookCat || !req.file){
            return res.status(400).json({message: "All fields are required"})
        }
        const newBookData = new ProductModel({
            bookName,
            bookDesc,
            bookAuth,
            bookEd,
            bookCat,
            bookPrice: Number(req.body.bookPrice),
            bookQuan: Number(req.body.bookQuan),
            filePath: req.file.path,
            fileType: req.file.mimetype,
            userId: req.userId
        })
        const result = await newBookData.save();
        res.json({result, ok: true});
    }catch(error){
        res.status(500).json({error: error.message})
    }
})





//! Getting added data on seller page ---------------------------------------------------------
app.get("/getsellerdata", verifyToken, async (req, res)=>{
    const userId = req.query.userId;
    const data = await ProductModel.find({userId: userId});
    if(data){
        res.send({data, ok: true});
    }
    else{
        res.send({message: "Something went wrong..."});
    }
})





//!geting data on update-data-page (basis of id) --------------------------------------------------
app.get('/getbookdata/:id', verifyToken, async (req, res)=>{
    const data = await ProductModel.findOne({_id: req.params.id});
    if(data){
        res.send({data, ok: true});
    }
    else{
        res.send({message: "something went wrong..."});
    }
})




//! updating data (by seller) -------------------------------------------------------------
app.put('/updatedata/:id', verifyToken, async (req, res)=>{
    const existingProduct = await ProductModel.findById(req.params.id);
        if (!existingProduct) {
            return res.status(404).send({ error: "Product not found" });
        }

        // Merge existing data with new data
        const updatedData = {
            ...existingProduct._doc, // Existing data
            ...req.body,            // New data from request
        };
    let result = await ProductModel.updateOne(
        {_id: req.params.id},
        {$set: updatedData}
    )
    if(result.modifiedCount > 0){
        res.send({message: "Data updated successfully...", ok: true});
    }else{
        res.send({error: "No changes were made", ok: false});
    }
});




//! deleting data (seller page) ----------------------------------------------------------
app.delete('/deletedata/:id', verifyToken, async (req, res)=>{
    const result = await ProductModel.deleteOne({_id: req.params.id});
    if(result.deletedCount == 1){
        res.send({message: "data deleted successfully", ok: true});
    }else{
        res.send({error: "Opps, something went wrong"});
    }
})





//! Forget password (updating password on user's request) -----------------------------------------
app.post('/forgetpass', async (req, res)=>{
    const {userMail, userPass} = req.body;

    const existUser = await UserModel.findOne({userMail: userMail});

    if(!userMail || !userPass){
        return res.status(400).json({message: "All fields are required"});
    }
    else if(!existUser){
        return res.status(400).json({message: "No such user exist"});
    }
    else{
        const result = await UserModel.updateOne(
            {userMail: userMail},
            {$set: {userPass: await bcrypt.hash(userPass, 16)}}
        )
        delete result.userPass;
        if(!result.modifiedCount){
            res.send({ok: true, message: "failed to update password"});
        }else{
            res.status(200).json({ok: true, message: "password updated successfully"});
        }
    }
    
});






//! Search Functionality ---------------------------------------------------------------
app.get('/search/:searchterm', async (req, res)=>{
    const searchTerm = req.params.searchterm;
    const result = await ProductModel.find({
        "$or": [
            {bookAuth: {$regex: searchTerm}},
            {bookName: {$regex: searchTerm}},
            {bookDesc: {$regex: searchTerm}},
            {bookEd: {$regex: searchTerm}}
        ]
    });
    if(result.length > 0){
        res.send({result, ok: true});
    }else{
        res.send({message: "No data Found", ok: false});
    }
})





//! getting detail-page data ----------------------------------------------------------
app.get('/detail/:id', async (req, res)=>{
    const id = req.params.id;
    const result = await ProductModel.findById(id);
    if(result){
        res.send({ok: true, result});
    }
    else{
        res.send({message: "OOPs.. Unable to get data"});
    }
})





//! getting list of recommended products -----------------------------------------------
app.get('/recomm/:id', async (req, res)=>{
    const id = req.params.id;
    let result = await ProductModel.findById(id);

    let recommResult = await ProductModel.find({
        "$or": [
            {bookAuth: {$regex: result.bookAuth, $options: "i"}},
            {bookName: {$regex: result.bookName, $options: "i"}},
            {bookEd: {$regex: result.bookEd, $options: "i"}},
            {bookPrice: result.bookPrice}
        ]
    });
    if(recommResult.length>0){
        res.send({recommResult, ok: true});
    }else{
        res.send({message: "No recommded product found", ok: false});
    }
});






//! Add to cart functionality (data-saving) -----------------------------------------------------------
app.post('/addtocart/:id/:userId', verifyToken, async (req, res)=>{
    const id = req.params.id;
    const userId = req.params.userId;

    const data = await ProductModel.findById(id);

    const existProduct = await CartModel.findOne({
        prodId: id,
        userId: userId
    });

    if(existProduct){
        return res.send({message: "Product already exist in cart"});
    }

    const result = new CartConfig({
        cartName: data.bookName,
        cartQuan: Number(1),
        cartAuth: data.bookAuth,
        cartEdit: data.bookEd,
        totalPrice: Number(data.bookPrice),
        userId: userId,
        prodId: id
    });
    const finalResult = await result.save();
    if(finalResult){
        res.send({ok: true, message: "Product added to cart", finalResult})
    }else{
        res.send({ok: false, message: "Something went wrong"})
    }
});





//! Getting cart product --------------------------------------------------
app.get('/getcartdata/:userId', verifyToken, async (req, res)=>{

    const userId = req.params.userId;

    const result = await CartModel.find({userId: userId});
    if(result.length>0){
        res.send({result, ok: true, message: "Your cart items"});
    }else{
        res.send({ok: false, message: "Your cart is empty"});
    }
});





//! delete cart product -----------------------------------------------------------
app.delete('/deletecart/:id', verifyToken, async (req, res)=>{
    const id = req.params.id;
    const result = await CartModel.deleteOne({_id: id});

    if(result.deletedCount == 1){
        res.send({message: "Product deleted successfully...", ok: true});
    }else{
        res.send({error: "⚠ Something went wrong ⚠", ok:false});
    }
});





//! saving the user increment or decrement cart quantity into database ----------------------
app.put('/savequantity/:id/:quantity', async(req, res)=>{
    const quan = Number(req.params.quantity);
    const id = req.params.id;
    const result = await CartModel.updateOne(
        {_id: id},
        {$set: {cartQuan: quan}}
    );
    res.send(result);
})





//! getting total quantity of product ------------------------------------------------------
app.get('/getquantity/:prodId', async (req, res)=>{

    const prodId = req.params.prodId;
    const result = await ProductModel.findById(prodId);
    if(result){
        res.send({ok: true, quan: result.bookQuan})
    }else{
        res.send({ok: false, message: "Something went wrong"});
    }
})





//! contact-us API for data sending through mail ----------------------------------------------------------
const sendMailServer = require('./controllers/sendMail');
const { ok } = require('assert');
const { default: mongoose } = require('mongoose');
const { error } = require('console');
const CartConfig = require('./DB/CartConfig');

app.post('/sendmail', sendMailServer);

const server = http.createServer((req, res)=>{
    if (req.method === 'POST' && req.url === '/sendmail'){
    sendMailServer(req, res)
    }
    else{
        console.warn("wrong wrong");
    }
})















//! Middleware for varifying Token ----------------------------------------
function verifyToken(req, res, next){
    let token = req.headers['authorization'];              //get the sent token (through postman)
    if(token){                                              //if token is sent
        token = token.split(' ')[1];                           //remove bearer from token (sent through postman) - array conversion
        console.warn("middleware called.. ", token[1]);

        Jwt.verify(token, jwtKey, (err, decoded)=>{
            if(err){
                if(err.name === "TokenExpiredError"){
                    return res.status(401).send({result: "Session expired. Please log in again."});
                }else{
                    return res.status(401).send({result: "Please provide a valid token."});
                }
            }
            else{
                req.userId = decoded.userId;
                next();
            }
        })
    }
    else{                                   //if there is not token
        res.status(403).send({result: "Please add token with headers"});
    }
    console.warn("middleware called ", token);
}



app.listen(4500);
