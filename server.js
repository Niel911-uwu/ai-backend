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

        if (!apiKey || !url) {
            return res.status(400).json({ error: "Missing apiKey or url" });
        }

        // 1. Fetch website content
        const siteRes = await fetch(url);

        if (!siteRes.ok) {
            return res.status(400).json({ error: "Failed to fetch website" });
        }

        const html = await siteRes.text();

        // 2. Clean text
        const extractedText = html.replace(/<[^>]*>/g, " ").slice(0, 12000);

        // 3. Call Groq API
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
                        content: "Return ONLY valid JSON with keys: category, conf, count, overview, audience, offerings, weaknesses, opportunities"
                    },
                    {
                        role: "user",
                        content: `Analyze this website:\n\n${extractedText}`
                    }
                ],
                temperature: 0.2
            })
        });

        // 4. Handle API failure
        if (!response.ok) {
            const errText = await response.text();
            console.log("GROQ ERROR:", errText);
            return res.status(500).json({ error: "Groq API failed", details: errText });
        }

        const data = await response.json();

        // 5. Extract AI response safely
        const raw = data.choices?.[0]?.message?.content;

        if (!raw) {
            console.log("EMPTY AI RESPONSE:", data);
            return res.status(500).json({
                error: "Empty AI response",
                rawResponse: data
            });
        }

        // 6. Parse JSON safely
        let parsed;

        try {
            parsed = JSON.parse(raw);
        } catch (err) {
            console.log("JSON PARSE FAILED:", raw);

            parsed = {
                category: "Unknown",
                conf: "?",
                count: "N/A",
                overview: raw,
                audience: "N/A",
                offerings: "N/A",
                weaknesses: "N/A",
                opportunities: "N/A"
            };
        }

        // 7. Return final structured result
        return res.json(parsed);

    } catch (err) {
        console.error("BACKEND ERROR:", err);
        return res.status(500).json({ error: "Internal server error" });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
    console.log(`Backend running on port ${PORT}`);
});
