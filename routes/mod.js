const express = require("express");
const fs = require("fs");
const path = require("path");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");

function getGifFilesSortedByNewest() {
    if (!fs.existsSync(uploadsDir)) {
        return [];
    }

    return fs.readdirSync(uploadsDir)
        .filter((file) => path.extname(file).toLowerCase() === ".gif")
        .map((file) => {
            const fullPath = path.join(uploadsDir, file);
            const stats = fs.statSync(fullPath);

            return {
                name: file,
                fullPath,
                path: `/uploads/${file}`,
                modifiedTime: stats.mtimeMs
            };
        })
        .sort((a, b) => b.modifiedTime - a.modifiedTime);
}

router.post("/skip", (req, res) => {
    try {
        const files = getGifFilesSortedByNewest();

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Kein hochgeladenes GIF zum Skippen gefunden."
            });
        }

        const currentGif = files[0];

        fs.unlinkSync(currentGif.fullPath);

        const remainingFiles = getGifFilesSortedByNewest();
        const nextGif = remainingFiles[0] || null;

        return res.json({
            success: true,
            message: "Aktuelles GIF wurde geskipt.",
            skippedFile: currentGif.name,
            nextGif: nextGif
                ? {
                    name: nextGif.name,
                    path: nextGif.path,
                    modifiedTime: nextGif.modifiedTime,
                    isFallback: false
                }
                : {
                    name: "default.gif",
                    path: "/defaults/default.gif",
                    modifiedTime: null,
                    isFallback: true
                }
        });
    } catch (error) {
        console.error("Fehler beim Skippen:", error);

        return res.status(500).json({
            success: false,
            message: "Fehler beim Skippen des aktuellen GIFs."
        });
    }
});

module.exports = router;