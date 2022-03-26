require("dotenv").config();
const mongoose = require("mongoose");

const connectionString = process.env.MONGO_URL;
mongoose.connect(connectionString);
const db = mongoose.connection;

const eventSchema = new mongoose.Schema({
    _id: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true,
        index: true,
    },
    blockNumber: {
        type: Number,
        required: true,
        index: true,
    },
    blockHash: {
        type: String,
        required: true,
    },
    transactionHash: {
        type: String,
        required: true,
    },
    transactionIndex: {
        type: Number,
    },
    from: {
        type: String,
        required: true,
        index: true,
    },
    to: {
        type: String,
        required: true,
        index: true,
    },
    value: {
        type: String,
        required: true,
    },
    removed: {
        type: Boolean,
    },
});

module.exports = {
    getDb: function () {
        return db;
    },

    eventModel: mongoose.model("event", eventSchema, "events"),
};
