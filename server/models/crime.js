const mongoose = require("mongoose");

const crimeSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
        },

        wardNo: {
            type: String,
            required: true,
        },

        url: {
            type: String,
            unique: true,
            required: true,
        },

        publishedAt: {
            type: Date,
        },
    },
    {
        timestamps: true,
    }
);

module.exports = mongoose.model("crime", crimeSchema);