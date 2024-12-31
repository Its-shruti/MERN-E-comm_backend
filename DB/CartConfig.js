const mongoose = require('mongoose');

const CartSchema = new mongoose.Schema({
    "cartName": String,
    "cartQuan": Number,
    "cartAuth": String,
    "cartEdit": String,
    "prodId": String,
    "totalPrice": Number,
    "userId":{
        type: mongoose.Schema.Types.ObjectId,
        require: true
    } 
})

module.exports = mongoose.model('cartProducts', CartSchema);