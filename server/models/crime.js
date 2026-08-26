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

        fingerprint: {
            type: String,
            unique: true,
            sparse: true,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("crime", crimeSchema);