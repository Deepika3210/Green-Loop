const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({

    name: {
        type: String,
        required: true
    },

    brand: {
        type: String,
        required: true
    },

    barcode: {
        type: String,
        required: true,
        unique: true
    },

    points: {
        type: Number,
        default: 0
    },

    weight: {
        type: Number,
        default: 0
    }

});

module.exports =
    mongoose.model('Product', productSchema);