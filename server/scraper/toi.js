/*require("dotenv").config();
const { chromium } = require("playwright");
const { extractArticle } = require("./toiExtractor");
const { isCrime } = require("./crimeFilter");
const { getCoordinates } = require("./crimeAnalyzer");
const { connectDB, saveCrime } = require("./db");

async function scrapeTOI() {
    await connectDB();
    const browser = await chromium.launch({
        headless: true
    });

    const page = await browser.newPage();

    try {
        await page.goto(
            "https://timesofindia.indiatimes.com/city/delhi",
            {
                waitUntil: "domcontentloaded",
                timeout: 60000
            }
        );

        const links = await page.$$eval("a", (anchors) =>
            anchors
                .map((a) => ({
                    title: a.innerText.trim(),
                    url: a.href
                }))
                .filter(
                    (article) =>
                        article.title.length > 20 &&
                        article.url.includes(
                            "timesofindia.indiatimes.com/city/delhi/"
                        ) &&
                        article.url.includes("/articleshow/")
                )
        );

        console.log(`Found ${links.length} article links\n`);

        for (const article of links) {
            

            await page.goto(article.url, {
                waitUntil: "domcontentloaded",
                timeout: 60000
            });

            const extracted = await extractArticle(page);
            if (!isCrime(extracted)) {
                console.log("\nTITLE:");
                console.log(extracted.title);
                console.log("NOT CRIME → SKIPPED\n");
                continue;
            }

            console.log("CRIME → SEND TO AI\n");

            console.log("\nTITLE:");
            console.log(extracted.title);

            const coordinates = await getCoordinates(extracted);

            console.log("Coordinates:", coordinates);
            await saveCrime(extracted, coordinates);

            console.log("\n========================================\n");
        }
    } catch (error) {
        console.error("Scraping failed:", error.message);
    } finally {
        await browser.close();
    }
}

scrapeTOI();*/


/*require("dotenv").config();
const { chromium } = require("playwright");
const { extractArticle } = require("./toiExtractor");
const { isCrime } = require("./crimeFilter");
const { getCoordinates } = require("./crimeAnalyzer");
const { connectDB, saveCrime } = require("./db");

async function scrapeTOI() {
    await connectDB();
    const browser = await chromium.launch({ headless: true });
    
    // Create dedicated pages: one for scanning listings, one for extracting content
    const listingPage = await browser.newPage();
    const articlePage = await browser.newPage();

    const TOTAL_PAGES = 3; // Adjust how many pages you want to scrape
    const processedUrls = new Set(); // Prevent duplicate processing

    try {
        for (let pageNum = 1; pageNum <= TOTAL_PAGES; pageNum++) {
            // Construct paginated URL (Page 1 vs Page N)
            const listUrl = pageNum === 1 
                ? "https://timesofindia.indiatimes.com/city/delhi"
                : `https://timesofindia.indiatimes.com/city/delhi/${pageNum}`;

            console.log(`\n--- Fetching Listing Page ${pageNum}: ${listUrl} ---`);

            await listingPage.goto(listUrl, {
                waitUntil: "domcontentloaded",
                timeout: 60000
            });

            const links = await listingPage.$$eval("a", (anchors) =>
                anchors
                    .map((a) => ({
                        title: a.innerText.trim(),
                        url: a.href
                    }))
                    .filter(
                        (article) =>
                            article.title.length > 20 &&
                            article.url.includes("timesofindia.indiatimes.com/city/delhi/") &&
                            article.url.includes("/articleshow/")
                    )
            );

            console.log(`Found ${links.length} potential articles on page ${pageNum}`);

            for (const article of links) {
                // Deduplication check
                if (processedUrls.has(article.url)) continue;
                processedUrls.add(article.url);

                try {
                    await articlePage.goto(article.url, {
                        waitUntil: "domcontentloaded",
                        timeout: 60000
                    });

                    const extracted = await extractArticle(articlePage);

                    if (!isCrime(extracted)) {
                        console.log(`[SKIPPED] ${extracted.title}`);
                        continue;
                    }

                    console.log(`\n[CRIME DETECTED] ${extracted.title}`);
                    const coordinates = await getCoordinates(extracted);
                    console.log("Coordinates:", coordinates);
                    
                    await saveCrime(extracted, coordinates);
                    console.log("========================================\n");
                } catch (err) {
                    console.error(`Failed to process article (${article.url}):`, err.message);
                }
            }
        }
    } catch (error) {
        console.error("Scraping workflow failed:", error.message);
    } finally {
        await browser.close();
    }
}

scrapeTOI();*/