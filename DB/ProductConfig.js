const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    "bookName": {
        type: String,
        required: true,
        trim: true
    },
    "bookDesc": {
        type: String,
        required: true,
        trim: true
    },
    "bookAuth": {
        type: String,
        required: true,
        trim: true
    },
    "bookEd": {
        type: String,
        required: true,
        trim: true
    },
    "bookPrice": {
        type: Number,
        required: true,
    },
    "bookQuan": {
        type: Number,
        required: true,
        trim: true
    },
    "bookCat": {
        type: String,
        required: true
    },
    "filePath": {
        type: String,
        required: true
    },
    "fileType": {
        type: String,
        required: true
    },
    "uploadAt": {
        type: Date,
        default: Date.now
    },
    "userId": {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
})


module.exports = mongoose.model('products', productSchema);