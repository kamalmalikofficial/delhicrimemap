async function extractArticle(page) {
    const title = await page.locator("h1").innerText();

    const body = await page
        .locator('[data-articlebody="1"]')
        .innerText();

    const cleanedText = body
        .split("\n")
        .map((text) => text.trim())
        .filter((text) => text.length > 20)
        .filter(
            (text) =>
                !text.includes("Image used for representational purpose") &&
                !text.includes("Image Credit") &&
                !text.includes("Photo Credit") &&
                !text.includes("You Can Also Check:") &&
                !text.includes("Stay updated with the latest Delhi news") &&
                !text.includes("Download the TOI App")
        );

    const uniqueText = [...new Set(cleanedText)];

    const articleText = uniqueText
        .slice(0, 2)
        .join("\n\n");

    return {
        title,
        text: articleText,
        url: page.url()
    };
}

module.exports = { extractArticle };