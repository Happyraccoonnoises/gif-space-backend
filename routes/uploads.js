const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

const uploadDirectory = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDirectory)) {
    fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDirectory);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const safeName = file.originalname.replace(/\s+/g, '-').toLowerCase();
        cb(null, `${timestamp}-${safeName}`);
    }
});

const fileFilter = (req, file, cb) => {
    const isGifMimeType = file.mimetype === 'image/gif';
    const hasGifExtension = path.extname(file.originalname).toLowerCase() === '.gif';

    if (isGifMimeType && hasGifExtension) {
        cb(null, true);
    } else {
        cb(new Error('Nur GIF-Dateien sind erlaubt.'), false);
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

router.post('/gif', upload.single('gifFile'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({
            success: false,
            message: 'Keine Datei hochgeladen.'
        });
    }

    res.status(201).json({
        success: true,
        message: 'GIF erfolgreich hochgeladen.',
        file: {
            originalName: req.file.originalname,
            storedName: req.file.filename,
            size: req.file.size,
            mimeType: req.file.mimetype,
            path: `/uploads/${req.file.filename}`
        }
    });
});

router.get('/latest', (req, res) => {
    try {
        const files = fs.readdirSync(uploadDirectory)
            .filter(file => path.extname(file).toLowerCase() === '.gif')
            .map(file => {
                const fullPath = path.join(uploadDirectory, file);
                const stats = fs.statSync(fullPath);

                return {
                    name: file,
                    path: `/uploads/${file}`,
                    modifiedTime: stats.mtimeMs
                };
            })
            .sort((a, b) => b.modifiedTime - a.modifiedTime);

        if (files.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Noch keine GIFs vorhanden.'
            });
        }

        res.json({
            success: true,
            latestGif: files[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Fehler beim Laden des neuesten GIFs.'
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
            message: error.message || 'Unbekannter Upload-Fehler.'
        });
    }

    next();
});

module.exports = router;