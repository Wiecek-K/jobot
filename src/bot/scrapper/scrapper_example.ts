import { ScrapperOptions, Scrapper } from "./scrapper";

(async () => {
  const scrapperOptions: ScrapperOptions = {
    searchValue: "Puppeteer tutorial",
    maxRecords: 5,
  };

  const scrapper = new Scrapper(scrapperOptions);

  try {
    await scrapper.init();
    await scrapper.navigateTo("https://example.com");
    await scrapper.performSearch("#search-input"); // Replace with actual search input selector
    const data = await scrapper.scrapeData(".record-class"); // Replace with actual record selector
    console.log("Scraped Data:", data);
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await scrapper.close();
  }
})();
