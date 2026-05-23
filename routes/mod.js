const express = require("express");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const router = express.Router();

const uploadsDir = path.join(__dirname, "..", "uploads");
const blacklistDirectory = path.join(__dirname, "..", "data");
const blacklistFilePath = path.join(blacklistDirectory, "gif-blacklist.json");

if (!fs.existsSync(blacklistDirectory)) {
    fs.mkdirSync(blacklistDirectory, { recursive: true });
}

if (!fs.existsSync(blacklistFilePath)) {
    fs.writeFileSync(
        blacklistFilePath,
        JSON.stringify({ blockedHashes: [] }, null, 2),
        "utf8"
    );
}

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

function getFileHash(filePath) {
    const fileBuffer = fs.readFileSync(filePath);

    return crypto
        .createHash("sha256")
        .update(fileBuffer)
        .digest("hex");
}

function readBlacklist() {
    try {
        console.log("Blacklist-Pfad:", blacklistFilePath);
        console.log("Blacklist-Datei existiert:", fs.existsSync(blacklistFilePath));

        if (!fs.existsSync(blacklistFilePath)) {
            return { blockedHashes: [] };
        }

        const rawData = fs.readFileSync(blacklistFilePath, "utf8");
        console.log("Blacklist-Rohinhalt:", rawData);

        const parsedData = JSON.parse(rawData);
        console.log("Blacklist-Parsed:", parsedData);

        if (!Array.isArray(parsedData.blockedHashes)) {
            console.log("blockedHashes ist kein Array");
            return { blockedHashes: [] };
        }

        return parsedData;
    } catch (error) {
        console.error("Fehler beim Lesen der Blacklist:", error);
        return { blockedHashes: [] };
    }
}

function writeBlacklist(blacklist) {
    fs.writeFileSync(
        blacklistFilePath,
        JSON.stringify(blacklist, null, 2),
        "utf8"
    );
}

function buildNextGifResponse(nextGif) {
    if (nextGif) {
        return {
            name: nextGif.name,
            path: nextGif.path,
            modifiedTime: nextGif.modifiedTime,
            isFallback: false
        };
    }

    return {
        name: "default.gif",
        path: "/defaults/default.gif",
        modifiedTime: null,
        isFallback: true
    };
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
            nextGif: buildNextGifResponse(nextGif)
        });
    } catch (error) {
        console.error("Fehler beim Skippen:", error);

        return res.status(500).json({
            success: false,
            message: "Fehler beim Skippen des aktuellen GIFs."
        });
    }
});

router.post("/blacklist-current", (req, res) => {
    try {
        const files = getGifFilesSortedByNewest();

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Kein hochgeladenes GIF zum Blacklisten gefunden."
            });
        }

        const currentGif = files[0];
        const currentHash = getFileHash(currentGif.fullPath);
        const blacklist = readBlacklist();

        if (!blacklist.blockedHashes.includes(currentHash)) {
            blacklist.blockedHashes.push(currentHash);
            writeBlacklist(blacklist);
        }

        fs.unlinkSync(currentGif.fullPath);

        const remainingFiles = getGifFilesSortedByNewest();
        const nextGif = remainingFiles[0] || null;

        return res.json({
            success: true,
            message: "Aktuelles GIF wurde geblacklistet und geskipt.",
            blacklistedFile: currentGif.name,
            hash: currentHash,
            nextGif: buildNextGifResponse(nextGif)
        });
    } catch (error) {
        console.error("Fehler beim Blacklisten des aktuellen GIFs:", error);

        return res.status(500).json({
            success: false,
            message: "Fehler beim Blacklisten des aktuellen GIFs."
        });
    }
});

module.exports = router;