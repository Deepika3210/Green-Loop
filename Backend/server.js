const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const Product = require('./models/Product');
const User = require('./models/User');
const WasteLog = require('./models/WasteLog');

const app = express();

app.use(cors());
app.use(express.json());


// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB Connected"))
.catch((err) => console.log(err));


// Home Route
app.get('/', (req, res) => {
    res.send("Green Loop API Running");
});


// =============================
// CREATE USER
// =============================
app.post('/create-user', async (req, res) => {

    try {

        const { name, email } = req.body;

        const user = new User({
            name,
            email
        });

        await user.save();

        res.json({
            message: "User Created",
            user
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});


// =============================
// SCAN PRODUCT
// =============================
// =============================
// SCAN PRODUCT
// =============================
app.post('/scan-product', async (req, res) => {

    try {

        const rawBarcode = req.body.barcode;

        // Convert barcode to string and remove spaces/special characters
        const barcode = String(rawBarcode || '')
            .trim()
            .replace(/\D/g, '');

        console.log("Scanned barcode:", barcode);

        const product = await Product.findOne({
            barcode: barcode
        });

        if (!product) {

            console.log("Product not found:", barcode);

            return res.status(404).json({
                message: "Product Not Found",
                scannedBarcode: barcode
            });

        }

        console.log("Product found:", product.brand);

        res.json(product);

    } catch (error) {

        console.log(error);

        res.status(500).json({
            error: error.message
        });

    }
});

// =============================
// SUBMIT WASTE
// =============================
app.post('/submit-waste', async (req, res) => {

    try {

        const {
            user_id,
            barcode,
            quantity
        } = req.body;

        const product = await Product.findOne({ barcode });

        if (!product) {

            return res.json({
                message: "Invalid Product"
            });

        }

        // AI Verification Simulation
        const aiVerification = "Verified";

        // Points Calculation
        const totalPoints = product.points * quantity;

        // Save Waste Log
        const waste = new WasteLog({

            user_id,
            product_id: product._id,
            quantity,
            total_weight: product.weight * quantity,
            status: aiVerification

        });

        await waste.save();

        // Update User Points
        await User.findByIdAndUpdate(
            user_id,
            {
                $inc: {
                    points: totalPoints
                }
            }
        );

        // Blockchain Simulation
        const blockchainHash =
            "BLK-" + Math.floor(Math.random() * 1000000);

        res.json({

            message: "Waste Submitted Successfully",
            verification: aiVerification,
            blockchainHash,
            pointsEarned: totalPoints

        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});


// =============================
// RECYCLING HISTORY
// =============================
app.get('/history/:user_id', async (req, res) => {

    try {

        const history = await WasteLog.find({
            user_id: req.params.user_id
        });

        res.json(history);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});


// =============================
// USER PROFILE
// =============================
app.get('/user/:id', async (req, res) => {

    try {

        const user = await User.findById(req.params.id);

        res.json(user);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }

});


const PORT = 5000;

app.listen(PORT,'0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
// ============================================================
// DASHBOARD STATISTICS
// ============================================================

app.get('/dashboard/stats', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const totalRecyclingRecords = await WasteLog.countDocuments();

        const wasteRecords = await WasteLog.find();

        let totalWeight = 0;
        let totalPoints = 0;

        for (const record of wasteRecords) {

            totalWeight += Number(record.total_weight || 0);

            const product = await Product.findById(record.product_id);

            if (product) {
                totalPoints +=
                    Number(product.points || 0) *
                    Number(record.quantity || 0);
            }
        }

        res.json({
            totalUsers,
            totalRecyclingRecords,
            totalWeight,
            totalPoints
        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


// ============================================================
// GET ALL PRODUCTS
// ============================================================

app.get('/products', async (req, res) => {

    try {

        const products = await Product.find();

        res.json(products);

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


// ============================================================
// MANUFACTURER DASHBOARD
// ============================================================

app.get('/manufacturer/dashboard', async (req, res) => {

    try {

        const products = await Product.find();
        const wasteRecords = await WasteLog.find();

        let totalRecycledWeight = 0;
        let totalPoints = 0;

        for (const record of wasteRecords) {

            totalRecycledWeight +=
                Number(record.total_weight || 0);

            const product =
                await Product.findById(record.product_id);

            if (product) {

                totalPoints +=
                    Number(product.points || 0) *
                    Number(record.quantity || 0);
            }
        }

        res.json({

            totalProducts: products.length,

            totalRecycledWeight,

            totalWasteRecords:
                wasteRecords.length,

            totalPoints

        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});


// ============================================================
// GOVERNMENT DASHBOARD
// ============================================================

app.get('/government/dashboard', async (req, res) => {

    try {

        const totalUsers =
            await User.countDocuments();

        const totalProducts =
            await Product.countDocuments();

        const totalRecyclingRecords =
            await WasteLog.countDocuments();

        const wasteRecords =
            await WasteLog.find();

        let totalWeight = 0;

        for (const record of wasteRecords) {

            totalWeight +=
                Number(record.total_weight || 0);
        }

        res.json({

            totalUsers,

            totalProducts,

            totalRecyclingRecords,

            totalWeight

        });

    } catch (error) {

        res.status(500).json({
            error: error.message
        });

    }
});