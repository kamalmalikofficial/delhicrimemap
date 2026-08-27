const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY
});


// ============================================================
// GET 50 ARTICLE LINKS BY SCROLLING
// ============================================================

async function getAmarArticleLinks(page, target = 50) {

    await page.goto(
        "https://www.amarujala.com/delhi",
        {
            waitUntil: "domcontentloaded",
            timeout: 60000
        }
    );

    const links = new Set();

    let previousCount = 0;
    let stableRounds = 0;

    while (
        links.size < target &&
        stableRounds < 8
    ) {

        const currentLinks = await page.$$eval(
            "a",
            anchors =>
                anchors
                    .map(a => ({
                        url: a.href,
                        title: a.innerText.trim()
                    }))
                    .filter(x => {

                        if (!x.url || !x.title) {
                            return false;
                        }

                        if (x.title.length <= 15) {
                            return false;
                        }

                        try {

                            const url = new URL(x.url);

                            // Must be Amar Ujala
                            if (
                                url.hostname !==
                                "www.amarujala.com"
                            ) {
                                return false;
                            }

                            // Must be a Delhi article
                            if (
                                !url.pathname.startsWith(
                                    "/delhi/"
                                )
                            ) {
                                return false;
                            }

                            // Don't accept homepage
                            if (
                                url.pathname === "/delhi/"
                            ) {
                                return false;
                            }

                            return true;

                        } catch {
                            return false;
                        }
                    })
        );


        for (const item of currentLinks) {

            if (links.size >= target) {
                break;
            }

            try {

                const url = new URL(item.url);

                url.search = "";
                url.hash = "";

                if (
                    url.hostname ===
                        "www.amarujala.com" &&
                    url.pathname.startsWith("/delhi/") &&
                    url.pathname !== "/delhi/"
                ) {

                    links.add(url.toString());
                }

            } catch {
                // Ignore malformed URLs
            }
        }


        console.log(
            `Amar Ujala links found: ${links.size}/${target}`
        );


        if (links.size === previousCount) {
            stableRounds++;
        } else {
            stableRounds = 0;
        }

        previousCount = links.size;


        if (links.size >= target) {
            break;
        }


        await page.evaluate(() => {

            window.scrollTo(
                0,
                document.body.scrollHeight
            );

        });


        await page.waitForTimeout(2000);
    }


    console.log(
        `\nFinal Amar Ujala article links: ${links.size}\n`
    );

    return [...links].slice(0, target);
}



// ============================================================
// EXTRACT ARTICLE
// ============================================================

async function extractAmarArticle(page) {

    const title =
        await page
            .locator("h1")
            .first()
            .innerText();


    const body =
        await page
            .locator("body")
            .innerText();


    const lines = body
        .split("\n")
        .map(x => x.trim())
        .filter(x => x.length > 30)
        .filter(
            x =>
                !x.includes("Advertisement") &&
                !x.includes("Subscribe") &&
                !x.includes("डाउनलोड") &&
                !x.includes("ऐप")
        );


    const text =
        lines
            .slice(0, 2)
            .join("\n\n");


    if (!text) {
        return null;
    }


    console.log(
        "🇮🇳 Hindi article extracted"
    );


    return {
        title,
        text,
        url: page.url()
    };
}



// ============================================================
// HINDI → ENGLISH
// ============================================================

async function translateToEnglish(
    title,
    text,
    retries = 3
) {

    const prompt = `

Translate the following Hindi news article into English.

Do not summarize.

Preserve the meaning and important location names.

Return ONLY valid JSON.

Format:

{
  "title": "English title",
  "text": "English article text"
}

Hindi title:

${title}

Hindi article:

${text}

`;


    for (let attempt = 1; attempt <= retries; attempt++) {

        try {

            const response =
                await ai.models.generateContent({

                    model: "gemini-3.5-flash-lite",

                    contents: prompt
                });


            let result =
                response.text.trim();


            result =
                result
                    .replace(/^```json\s*/i, "")
                    .replace(/^```\s*/i, "")
                    .replace(/\s*```$/i, "")
                    .trim();


            try {

                return JSON.parse(result);

            } catch (err) {

                console.error(
                    "❌ Translation JSON error:",
                    err.message
                );

                return {
                    title,
                    text
                };
            }


        } catch (err) {

            const message =
                err?.message || String(err);


            // Gemini rate limit
            if (
                message.includes("429") ||
                message.includes("RESOURCE_EXHAUSTED") ||
                message.includes("quota")
            ) {

                const waitTime =
                    30000 * attempt;

                console.log(
                    `⏳ Gemini rate limit. Waiting ${waitTime / 1000}s...`
                );

                await new Promise(
                    resolve =>
                        setTimeout(
                            resolve,
                            waitTime
                        )
                );

                continue;
            }


            console.error(
                "❌ Gemini translation error:",
                message
            );

            return {
                title,
                text
            };
        }
    }


    console.log(
        "❌ Gemini failed after retries"
    );


    return {
        title,
        text
    };
}



// ============================================================
// DELAY
// ============================================================

async function wait(ms) {

    return new Promise(
        resolve =>
            setTimeout(resolve, ms)
    );
}



module.exports = {
    getAmarArticleLinks,
    extractAmarArticle,
    translateToEnglish,
    wait
};