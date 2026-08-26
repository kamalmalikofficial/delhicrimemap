const mongoose = require("mongoose");

const crimeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },

        latitude: {
            type: Number,
            required: true,
        },

        longitude: {
            type: Number,
            required: true,
        },

        url: {
            type: String,
            unique: true,
            required: true,
        },

        source: {
            type: String,
            default: "toi",
        },

        publishedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

const Crime = mongoose.model("crime", crimeSchema);

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
}

async function saveCrime(article, coordinates) {
    if (
        coordinates.latitude === null ||
        coordinates.longitude === null
    ) {
        console.log("Invalid coordinates → not saving");
        return;
    }

    const exists = await Crime.exists({
        url: article.url,
    });

    if (exists) {
        console.log("Already exists → skipped");
        return;
    }

    await Crime.create({
        title: article.title,
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        url: article.url,
        source: "toi",
    });

    console.log("Crime saved to MongoDB");
}

module.exports = {
    connectDB,
    saveCrime,
};