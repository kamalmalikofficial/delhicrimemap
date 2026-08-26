const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});

async function getCoordinates(article) {
    const prompt = `
You are a geolocation extractor.

Read the following Delhi crime news article and identify the location where the crime/incident occurred.

Return ONLY valid JSON in this exact format:

{
    "latitude": number,
    "longitude": number
}

Rules:
- Return coordinates only.
- Do not return the location name.
- Do not return explanations.
- The coordinates must represent the incident location, not the news office, court, police headquarters, or another unrelated place.
- If the exact location of crime cannot be determined, return:
{
    "latitude": null,
    "longitude": null
}

Title:
${article.title}

Article:
${article.text}
`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });


        const text = response.text
            .trim()
            .replace(/^```json\s*/, "")
            .replace(/```$/, "")
            .trim();


        const result = JSON.parse(text);

        return {
            latitude: result.latitude,
            longitude: result.longitude
        };
    } catch (error) {
        console.error("AI coordinate extraction failed:", error.message);

        return {
            latitude: null,
            longitude: null
        };
    }
}

module.exports = { getCoordinates };


//model: "gemini-3.5-flash-lite",