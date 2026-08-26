const { chromium } = require("playwright");

const { extractArticle } = require("./toiExtractor");
const { analyseLocation } = require("./crimeAnalyzer.js");
const { saveCrime } = require("./db");
const { checkCrimeKeywords } = require("./crimeKeywords");


async function scrapeTOI() {

    const browser = await chromium.launch({

        headless: true

    });


    const page = await browser.newPage();


    // -----------------------------------------
    // BLOCK UNNECESSARY RESOURCES
    // -----------------------------------------

    await page.route("**/*", route => {

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


    // -----------------------------------------
    // OPEN TOI DELHI PAGE
    // -----------------------------------------

    await page.goto(
        "https://timesofindia.indiatimes.com/city/delhi",
        {
            waitUntil: "domcontentloaded",
            timeout: 60000
        }
    );


    await page.waitForSelector(
        'a[href*="/city/delhi/"]'
    );


    // -----------------------------------------
    // GET ARTICLE LINKS
    // -----------------------------------------

    const links = await page.$$eval(
        "a",
        anchors =>
            anchors
                .map(a => a.href)
                .filter(
                    href =>
                        href.includes("/city/delhi/") &&
                        href.endsWith(".cms")
                )
    );


    const uniqueLinks = [
        ...new Set(links)
    ];


    console.log(
        `Found ${uniqueLinks.length} articles\n`
    );


    // -----------------------------------------
    // PROCESS ARTICLES
    // -----------------------------------------

    for (const url of uniqueLinks) {

        try {

            console.log("--------------------------------");

            console.log(
                "Opening:",
                url
            );


            // Open article
            await page.goto(
                url,
                {
                    waitUntil: "domcontentloaded",
                    timeout: 60000
                }
            );


            // -----------------------------------------
            // EXTRACT ARTICLE
            // -----------------------------------------

            const article =
                await extractArticle(page);


            console.log(
                "Title:",
                article.title
            );


            // -----------------------------------------
            // KEYWORD FILTER
            // -----------------------------------------

            const keywordResult =
                checkCrimeKeywords(article);


            if (!keywordResult.isCrime) {

                console.log(
                    "⏭️ No crime keywords found"
                );

                continue;

            }


            console.log(
                "🚨 Crime keywords found:",
                keywordResult.matchedKeywords
            );


            // -----------------------------------------
            // AI LOCATION EXTRACTION
            // -----------------------------------------

            console.log(
                "🤖 Finding location..."
            );


            const locationData =
                await analyseLocation(article);


            console.log(
                "📍 Location:",
                locationData.location
            );

            console.log(
                "🌐 Coordinates:",
                locationData.latitude,
                locationData.longitude
            );


            // -----------------------------------------
            // CHECK LOCATION
            // -----------------------------------------

            if (
                locationData.latitude === null ||
                locationData.longitude === null
            ) {

                console.log(
                    "⚠️ Location could not be determined"
                );

                continue;

            }


            // -----------------------------------------
            // SAVE
            // -----------------------------------------

            await saveCrime(
                article,
                locationData
            );


        } catch (err) {

            console.error(
                "\n❌ Error processing:",
                url
            );

            console.error(
                err.message
            );

        }

    }


    await browser.close();


    console.log(
        "\n✅ Scraping completed."
    );

}


module.exports = {
    scrapeTOI
};

scrapeTOI();