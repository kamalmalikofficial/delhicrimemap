const express = require('express');
const app = express();
const cors = require("cors");
const dotenv = require('dotenv');

dotenv.config();

const connectdb = require("./config/db");
const crimeroutes = require("./routes/route");
 // 1. Import the scheduler

app.use(express.json());
app.use(cors());

app.use("/api/crime", crimeroutes);

const port = 3000;

app.get('/', (req, res) => {
    res.send(" hello world! \n delhi crime map ");
});

// 2. Wrap server startup inside an async block to ensure DB connects first
async function startServer() {
    try {
        await connectdb(); // Ensure your config/db exports an async function or returns a promise
        console.log("Database connected successfully.");

        app.listen(port, () => {
            console.log(`Server running on port ${port}`);
            
            
        });
    } catch (err) {
        console.error("Database connection failed. Server not started.", err);
        process.exit(1);
    }
}

startServer();