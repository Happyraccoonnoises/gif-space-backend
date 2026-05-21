const express = require("express");

const router = express.Router();

router.get("/ping", (req, res) => {
    res.json({
        success: true,
        message: "API läuft.",
        timestamp: new Date().toISOString()
    });
});

router.post("/test", (req, res) => {
    res.json({
        success: true,
        received: req.body
    });
});

module.exports = router;