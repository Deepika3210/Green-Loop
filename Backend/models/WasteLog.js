const mongoose = require('mongoose');

const wasteSchema = new mongoose.Schema({

    user_id: String,
    product_id: String,
    quantity: Number,
    total_weight: Number,
    status: String

}, {
    timestamps: true
});

module.exports = mongoose.model('WasteLog', wasteSchema);