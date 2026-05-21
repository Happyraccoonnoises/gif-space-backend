const express = require("express");

const router = express.Router();

router.post("/create-checkout", async (req, res) => {
    try {
        const { amount, description } = req.body;

        if (!amount || !description) {
            return res.status(400).json({
                success: false,
                message: "amount und description sind erforderlich."
            });
        }

        const apiKey = process.env.SUMUP_API_KEY;
        const merchantCode = process.env.SUMUP_MERCHANT_CODE;
        const currency = process.env.SUMUP_CURRENCY || "EUR";
        const redirectUrl = process.env.SUMUP_REDIRECT_URL || "";

        if (!apiKey || !merchantCode) {
            return res.status(500).json({
                success: false,
                message: "SumUp ist noch nicht konfiguriert. API Key oder Merchant Code fehlt.",
                configMissing: true,
                checkoutDraft: {
                    amount,
                    currency,
                    checkout_reference: `gif-add-space-${Date.now()}`,
                    description,
                    merchant_code: merchantCode || "",
                    redirect_url: redirectUrl
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: "SumUp-Konfiguration gefunden. Echter API-Call wird später eingebaut.",
            configured: true,
            checkoutDraft: {
                amount,
                currency,
                checkout_reference: `gif-add-space-${Date.now()}`,
                description,
                merchant_code: merchantCode,
                redirect_url: redirectUrl
            }
        });

    } catch (error) {
        console.error("Fehler in /payments/create-checkout:", error);

        return res.status(500).json({
            success: false,
            message: "Interner Fehler beim Vorbereiten des Checkouts."
        });
    }
});

module.exports = router;