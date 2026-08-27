const mongoose = require("mongoose");
const Crime = require("../models/crime");

require("dotenv").config();

async function connectDB() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log("MongoDB connected");
    } catch (error) {
        console.error("cant connect to db");
        console.error(error);
        process.exit(1);
    }
}

async function saveCrime(article, wardNo) {

    try {

        // Don't save the same article twice
        const exists = await Crime.exists({
            url: article.url
        });

        if (exists) {
            console.log("Already exists → SKIPPED");
            return;
        }

        await Crime.create({
            title: article.title,
            wardNo: wardNo,
            url: article.url,
            publishedAt: new Date()
        });

        console.log("Crime saved:", article.title);

    } catch (error) {

        console.error(
            "Error saving crime:",
            error.message
        );
    }
}

module.exports = {
    connectDB,
    saveCrime
};