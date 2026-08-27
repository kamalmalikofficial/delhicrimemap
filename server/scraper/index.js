require("dotenv").config();

const { chromium } = require("playwright");

const { extractArticle: extractTOIArticle } = require("./toiExtractor");
const { extractAmarArticle, getAmarArticleLinks } = require("./amarExtractor");

const { getWard } = require("./crimeAnalyzer");
const { connectDB, saveCrime } = require("./db");
const { isCrime } = require("./crimeFilter");

async function processArticle(article, source) {
    try {
        console.log("--------------------------------");
        console.log(`SOURCE: ${source}`);
        console.log("TITLE:", article.title);

        const keywordResult = isCrime(article);

        const crimeDetected =
            typeof keywordResult === "object"
                ? keywordResult.isCrime
                : keywordResult;

        if (!crimeDetected) {
            console.log("⏭️ No crime keywords found → SKIPPED");
            return;
        }

        console.log(
            "🚨 Crime keywords found:",
            keywordResult.matchedKeywords || "CRIME DETECTED"
        );

        console.log("🤖 Finding ward...");

        const wardNo = await getWard(article);

        if (!wardNo) {
            console.log("❌ Ward could not be determined → SKIPPED");
            return;
        }

        console.log(`📍 Ward found: ${wardNo}`);

        await saveCrime(article, wardNo);

        console.log("💾 Crime saved to DB");

    } catch (err) {
        console.error("❌ Error processing article:", err.message);
    }
}


// ============================================================
// TOI SCRAPER
// ============================================================

async function scrapeTOI(browser) {

    console.log("\n\n================ TOI SCRAPER ================\n");

    const listingContext = await browser.newContext();
    const articleContext = await browser.newContext();

    const listingPage = await listingContext.newPage();

    // Block unnecessary resources
    const blockResources = async (context) => {

        await context.route("**/*", route => {

            const request = route.request();
            const type = request.resourceType();
            const url = request.url();

            if (
                ["image", "font", "media", "stylesheet"].includes(type)
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

    };

    await blockResources(listingContext);
    await blockResources(articleContext);

    const TOTAL_PAGES = 3;

    const processedUrls = new Set();

    try {

        for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {

            const listUrl =
                pageNum === 1
                    ? "https://timesofindia.indiatimes.com/city/delhi"
                    : `https://timesofindia.indiatimes.com/city/delhi/${pageNum}`;

            console.log("\n==============================================");
            console.log(`TOI PAGE ${pageNum}`);
            console.log("==============================================\n");

            try {

                await listingPage.goto(listUrl, {
                    waitUntil: "domcontentloaded",
                    timeout: 60000
                });

            } catch (err) {

                console.log(
                    `⚠️ Could not load TOI page ${pageNum} → SKIPPED`
                );

                continue;
            }

            const articleLinks = await listingPage.$$eval(
                "a",
                anchors =>
                    anchors
                        .map(a => a.href)
                        .filter(
                            href =>
                                href.includes("/city/delhi/") &&
                                href.endsWith(".cms") &&
                                href.includes("/articleshow/")
                        )
            );

            const pageUniqueLinks = [
                ...new Set(articleLinks)
            ];

            console.log(
                `Found ${pageUniqueLinks.length} articles`
            );

            for (const url of pageUniqueLinks) {

                if (processedUrls.has(url)) {
                    continue;
                }

                processedUrls.add(url);

                const articlePage =
                    await articleContext.newPage();

                try {

                    console.log("\nOpening TOI:", url);

                    await articlePage.goto(url, {
                        waitUntil: "domcontentloaded",
                        timeout: 30000
                    });

                    const article =
                        await extractTOIArticle(articlePage);

                    await processArticle(
                        article,
                        "TOI"
                    );

                } finally {

                    await articlePage.close();

                }
            }
        }

    } finally {

        await listingContext.close();
        await articleContext.close();

    }

    console.log("\n✅ TOI scraping completed\n");
}


// ============================================================
// AMAR UJALA SCRAPER
// ============================================================

async function scrapeAmarUjala(browser) {

    console.log("\n\n================ AMAR UJALA ================\n");

    const context = await browser.newContext();

    const page = await context.newPage();

    // Block unnecessary resources
    await context.route("**/*", route => {

        const request = route.request();
        const type = request.resourceType();
        const url = request.url();

        if (
            ["image", "font", "media", "stylesheet"].includes(type)
        ) {
            return route.abort();
        }

        if (
            url.includes("doubleclick") ||
            url.includes("google-analytics") ||
            url.includes("googlesyndication")
        ) {
            return route.abort();
        }

        route.continue();

    });

    try {

        const urls =
            await getAmarArticleLinks(page, 50);

        console.log(
            `\nFound ${urls.length} Amar Ujala articles\n`
        );

        for (let i = 0; i < urls.length; i++) {

            const url = urls[i];

            const articlePage =
                await context.newPage();

            try {

                console.log(
                    `\n[${i + 1}/${urls.length}] Opening Amar Ujala`
                );

                console.log(url);

                await articlePage.goto(url, {
                    waitUntil: "domcontentloaded",
                    timeout: 30000
                });

                const article =
                    await extractAmarArticle(articlePage);

                if (!article) {

                    console.log(
                        "❌ Could not extract article → SKIPPED"
                    );

                    continue;
                }

                await processArticle(
                    article,
                    "AMAR UJALA"
                );

            } catch (err) {

                console.error(
                    "❌ Amar Ujala article error:",
                    err.message
                );

            } finally {

                await articlePage.close();

            }
        }

    } finally {

        await context.close();

    }

    console.log("\n✅ Amar Ujala scraping completed\n");
}


// ============================================================
// MAIN
// ============================================================

async function scrape() {

    try {

        await connectDB();

        const browser =
            await chromium.launch({
                headless: true
            });

        try {

            // First TOI
            await scrapeTOI(browser);

            // Then Amar Ujala
            await scrapeAmarUjala(browser);

        } finally {

            await browser.close();

        }

        console.log(
            "\n\n✅ EVERYTHING COMPLETED SUCCESSFULLY\n"
        );

    } catch (err) {

        console.error(
            "\n❌ Scraper failed:",
            err.message
        );
    }
}


scrape();

module.exports = {
    scrape,
    scrapeTOI,
    scrapeAmarUjala
};





