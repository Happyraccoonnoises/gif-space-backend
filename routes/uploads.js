const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const router = express.Router();

const uploadDirectory = path.join(__dirname, "..", "uploads");
const fallbackGifName = "default.gif";
const fallbackDirectory = path.join(__dirname, "..", "defaults");
const fallbackGifPath = path.join(fallbackDirectory, fallbackGifName);
const blacklistFilePath = path.join(__dirname, "..", "data", "gif-blacklist.json");

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, "-").toLowerCase();
        cb(null, `${timestamp}-${safeName}`);
    }
});

const fileFilter = (req, file, cb) => {
    const isGifMimeType = file.mimetype === "image/gif";
    const hasGifExtension = path.extname(file.originalname).toLowerCase() === ".gif";

    if (isGifMimeType && hasGifExtension) {
        cb(null, true);
    } else {
        cb(new Error("Nur GIF-Dateien sind erlaubt."), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 25 * 1024 * 1024,
        fieldSize: 25 * 1024 * 1024
    }
});

function getGifFilesSortedByNewest() {
    return fs.readdirSync(uploadDirectory)
        .filter(file => path.extname(file).toLowerCase() === ".gif")
        .map(file => {
            const fullPath = path.join(uploadDirectory, file);
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

function deleteOlderGifs() {
    const files = getGifFilesSortedByNewest();

    if (files.length <= 2) {
        return;
    }

    const filesToDelete = files.slice(2);

    for (const file of filesToDelete) {
        try {
            fs.unlinkSync(file.fullPath);
            console.log(`Altes GIF gelöscht: ${file.name}`);
        } catch (error) {
            console.error(`Fehler beim Löschen von ${file.name}:`, error);
        }
    }
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

router.post("/gif", upload.single("gifFile"), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: "Keine Datei hochgeladen."
        });
    }

    try {
        const uploadedFilePath = path.join(uploadDirectory, req.file.filename);
        const fileHash = getFileHash(uploadedFilePath);
        const blacklist = readBlacklist();

        console.log("Upload-Hash:", fileHash);
        console.log("Blacklist-Hashes:", blacklist.blockedHashes);
        console.log("Hash ist geblockt:", blacklist.blockedHashes.includes(fileHash));

        if (blacklist.blockedHashes.includes(fileHash)) {
            fs.unlinkSync(uploadedFilePath);

            return res.status(403).json({
                success: false,
                message: "Dieses GIF ist geblacklistet und wurde abgelehnt."
            });
        }

        deleteOlderGifs();

        return res.status(201).json({
            success: true,
            message: "GIF erfolgreich hochgeladen.",
            file: {
                originalName: req.file.originalname,
                storedName: req.file.filename,
                size: req.file.size,
                mimeType: req.file.mimetype,
                path: `/uploads/${req.file.filename}`,
                hash: fileHash
            }
        });
    } catch (error) {
        console.error("Fehler bei der Upload-Prüfung:", error);

        if (req.file) {
            const uploadedFilePath = path.join(uploadDirectory, req.file.filename);

            if (fs.existsSync(uploadedFilePath)) {
                fs.unlinkSync(uploadedFilePath);
            }
        }

        return res.status(500).json({
            success: false,
            message: "Fehler bei der Verarbeitung des Uploads."
        });
    }
});

router.get("/latest", (req, res) => {
    try {
        const files = getGifFilesSortedByNewest();

        if (files.length === 0) {
            if (!fs.existsSync(fallbackGifPath)) {
                return res.status(404).json({
                    success: false,
                    message: "Kein GIF und kein Fallback vorhanden."
                });
            }

            return res.json({
                success: true,
                latestGif: {
                    name: fallbackGifName,
                    path: `/defaults/${fallbackGifName}`,
                    modifiedTime: null,
                    isFallback: true
                }
            });
        }

        res.json({
            success: true,
            latestGif: {
                name: files[0].name,
                path: files[0].path,
                modifiedTime: files[0].modifiedTime,
                isFallback: false
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Fehler beim Laden des neuesten GIFs."
        });
    }
});

router.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        return res.status(400).json({
            success: false,
            message: `Upload-Fehler: ${error.code} - ${error.message}`
        });
    }

    if (error) {
        return res.status(400).json({
            success: false,
            message: error.message || "Unbekannter Upload-Fehler."
        });
    }

    next();
});

module.exports = router;