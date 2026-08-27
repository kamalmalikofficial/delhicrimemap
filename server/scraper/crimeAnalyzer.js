const { GoogleGenAI } = require("@google/genai");
const fs = require("fs");
const path = require("path");

require("dotenv").config();

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// -----------------------------------------
// LOAD DELHI WARD GEOJSON
// -----------------------------------------

const wardFile = path.join(
    __dirname,
    "../data/Delhi_Wards.geojson"
);

const wardData = JSON.parse(
    fs.readFileSync(wardFile, "utf-8")
);

const wards = wardData.features.map(feature => ({
    wardNo: feature.properties.Ward_No,
    wardName: feature.properties.Ward_Name
}));



const wardList = wards
    .map(ward => `${ward.wardNo} : ${ward.wardName}`)
    .join("\n");


// -----------------------------------------
// FIND WARD
// -----------------------------------------

async function getWard(article) {

    try {

        const prompt = `
You are identifying the municipal ward in Delhi where a crime incident occurred.

ARTICLE TITLE:
${article.title}

ARTICLE TEXT:
${article.text}

AVAILABLE DELHI WARDS:

${wardList}


TASK:

Identify the Delhi municipal ward in which the crime incident occurred.

Match the incident location to the most appropriate ward from the AVAILABLE DELHI WARDS list.

IMPORTANT RULES:

1. Return ONLY a Ward_No from the provided list.
2. Never invent a Ward_No.
3. Do not return coordinates.
4. Do not return a ward name.
5. If the article does not provide enough location information to determine the ward, but crime happen give the best ward you think or check its history yourself.
6. If you are uncertain between multiple wards, return best one.
7. The Ward_No must exactly match one of the Ward_No values provided above.
8. Return valid JSON only.
9. Do not use markdown or code fences.

OUTPUT FORMAT:

{
    "wardNo": "123"
}

If the ward cannot be determined:

{
    "wardNo": null
}
`;


        const response = await ai.models.generateContent({
            model: "gemini-3.5-flash-lite",
            contents: prompt
        });


        let text = response.text.trim();


        // -----------------------------------------
        // REMOVE ```json IF GEMINI ADDS IT
        // -----------------------------------------

        text = text
            .replace(/^```json\s*/i, "")
            .replace(/^```\s*/i, "")
            .replace(/\s*```$/i, "")
            .trim();


        const result = JSON.parse(text);


        // -----------------------------------------
        // AI COULD NOT FIND WARD
        // -----------------------------------------

        if (!result.wardNo) {

            console.log(
                "❌ Ward could not be determined"
            );

            return null;
        }


        // -----------------------------------------
        // VERIFY AI RESPONSE
        // -----------------------------------------

        const validWard = wards.find(
            ward =>
                String(ward.wardNo) ===
                String(result.wardNo)
        );


        if (!validWard) {

            console.log(
                "❌ AI returned invalid Ward_No:",
                result.wardNo
            );

            return null;
        }


        console.log(
            `📍 Ward found: ${validWard.wardNo} - ${validWard.wardName}`
        );


        return validWard.wardNo;


    } catch (error) {

        console.error(
            "AI ward extraction failed:",
            error.message
        );

        return null;
    }
}


module.exports = {
    getWard
};