const express = require("express");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const apiRoutes = require("./routes/api");
const paymentRoutes = require("./routes/payments");
const uploadRoutes = require("./routes/uploads");

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
    "http://localhost:5500",
    "http://127.0.0.1:5500",
    "http://localhost:63342",
    "http://127.0.0.1:63342",
    "https://happyraccoonnoises.github.io"
];

app.use(cors({
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST"]
}));

app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend läuft.");
});

app.use("/api", apiRoutes);
app.use("/payments", paymentRoutes);
app.use("/uploads", uploadRoutes);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.listen(PORT, () => {
    console.log(`Server läuft auf http://localhost:${PORT}`);
});