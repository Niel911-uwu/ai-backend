const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend is running 🚀");
});

app.post("/analyze", async (req, res) => {
    try {
        const { apiKey, url } = req.body;

        // 1. Fetch website content
        const siteRes = await fetch(url);
        const html = await siteRes.text();

        // 2. Clean text
        const extractedText = html.replace(/<[^>]*>/g, " ").slice(0, 12000);

        // 3. Call Groq
        const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + apiKey
            },
            body: JSON.stringify({
                model: "llama3-70b-8192",
                response_format: { type: "json_object" },
                messages: [
                    {
                        role: "system",
                        content: "Analyze website and return JSON with: category, conf, count, overview, audience, offerings, weaknesses, opportunities"
                    },
                    {
                        role: "user",
                        content: `Analyze this website:\n\n${extractedText}`
                    }
                ],
                temperature: 0.2
            })
        });

        const data = await response.json();

        // 4. Clean JSON response
        let raw = data.choices?.[0]?.message?.content || "{}";
        raw = raw.replace(/^```json\s*/i, "").replace(/```$/i, "").trim();

        let parsed;
        try {
            parsed = JSON.parse(raw);
        } catch {
            parsed = { overview: raw };
        }

        res.json(parsed);

    } catch (err) {
        console.error("BACKEND ERROR:", err);
        res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
});
