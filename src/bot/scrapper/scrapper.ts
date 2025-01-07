import puppeteer, { Browser, Page } from "puppeteer";

export interface ScrapperOptions {
  searchValue: string;
  maxRecords: number;
}

export class Scrapper {
  private browser!: Browser;
  private page!: Page;
  private options: ScrapperOptions;

  constructor(options: ScrapperOptions) {
    this.options = options;
  }

  // Initialize Puppeteer
  public async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true, // Run in headless mode
    });
    this.page = await this.browser.newPage();
    console.log("Browser initialized!");
  }

  // Navigate to a URL
  public async navigateTo(url: string): Promise<void> {
    if (!this.page)
      throw new Error("Scrapper is not initialized. Call init() first.");
    await this.page.goto(url, { waitUntil: "networkidle2" });
    console.log(`Navigated to ${url}`);
  }

  // Perform a search using the searchValue
  public async performSearch(selector: string): Promise<void> {
    if (!this.page)
      throw new Error("Scrapper is not initialized. Call init() first.");

    await this.page.type(selector, this.options.searchValue); // Type the search value
    await this.page.keyboard.press("Enter"); // Press Enter
    await this.page.waitForNavigation({ waitUntil: "networkidle2" });
    console.log(`Search performed for: ${this.options.searchValue}`);
  }

  // Scrape data from the page
  public async scrapeData(recordSelector: string): Promise<string[]> {
    if (!this.page)
      throw new Error("Scrapper is not initialized. Call init() first.");

    const records = await this.page.$$eval(
      recordSelector,
      (elements, maxRecords) => {
        return elements
          .slice(0, maxRecords)
          .map((el) => el.textContent?.trim() || "");
      },
      this.options.maxRecords
    );

    console.log(`Scraped ${records.length} records.`);
    return records;
  }

  // Close the browser
  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      console.log("Browser closed!");
    }
  }
}
