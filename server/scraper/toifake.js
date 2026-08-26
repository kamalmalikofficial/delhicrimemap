const { chromium } = require("playwright");
const { extractArticle } = require("./toiExtractor");
const { analyseArticle } = require("./crimeAnalyzer.js");
const { saveCrime } = require("./db");

async function scrapeTOI() {
    const browser = await chromium.launch({
        headless: true,
    });

    const page = await browser.newPage();

    // Block unnecessary resources
    await page.route("**/*", (route) => {
        const request = route.request();
        const type = request.resourceType();
        const url = request.url();

        if (
            type === "image" ||
            type === "font" ||
            type === "media"
        ) {
            return route.abort();
        }

        if (
            url.includes("googlesyndication") ||
            url.includes("doubleclick") ||
            url.includes("google-analytics") ||
            url.includes("adservice") ||
            url.includes("taboola") ||
            url.includes("outbrain")
        ) {
            return route.abort();
        }

        route.continue();
    });

    await page.goto(
        "https://timesofindia.indiatimes.com/city/delhi",
        {
            waitUntil: "domcontentloaded",
            timeout: 60000,
        }
    );

    await page.waitForSelector('a[href*="/city/delhi/"]');

    const links = await page.$$eval("a", (anchors) =>
        anchors
            .map((a) => a.href)
            .filter(
                (href) =>
                    href.includes("/city/delhi/") &&
                    href.endsWith(".cms")
            )
    );

    const uniqueLinks = [...new Set(links)];

    console.log(`Found ${uniqueLinks.length} articles\n`);

    for (const url of uniqueLinks) {
        try {
            console.log("--------------------------------");
            console.log("Opening:", url);

            await page.goto(url, {
                waitUntil: "domcontentloaded",
                timeout: 60000,
            });

            const article = await extractArticle(page);
            const ai = await analyseArticle(article);

            console.log(ai);

            if (!ai.isCrime) {
                console.log("⏭️ Not a crime\n");
                continue;
            }

            await saveCrime(article, ai);

        } catch (err) {
            console.error("Error:", url);
            console.error(err.message);
        }
    }

    await browser.close();
}

module.exports = { scrapeTOI };