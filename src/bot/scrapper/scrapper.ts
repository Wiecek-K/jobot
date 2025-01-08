import puppeteer, { Browser, Page } from 'puppeteer'

export interface ScrapperOptions {
  searchValue: string
  maxRecords: number
  viewPort?: { width: number; height: number }
}

export interface JobOfferScrappedData {
  title: string
  description: string
  company: string
  salary: string
  offerURL: string
  technologies: string[]
  addedAt: string
}

interface JobOfferSelectors {
  title: string
  description: string
  company: string
  salary?: string
  technologies?: string
  addedAt?: string
}

export class Scrapper {
  private browser!: Browser
  private page!: Page
  private options: ScrapperOptions

  constructor(options: ScrapperOptions) {
    this.options = options
  }

  // Initialize Puppeteer
  public async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true, // Run in headless mode
      args: ['--no-sandbox', '--disable-gpu', '--mute-audio'],
    })
    this.page = await this.browser.newPage()
    this.page.setUserAgent(
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
    )
    this.page.setViewport({
      width: this.options.viewPort.width || 1280,
      height: this.options.viewPort.height || 800,
    })
    console.log('Browser initialized!')
  }

  // Navigate to a URL
  public async navigateTo(
    url: string,
    selectorWaitFor?: string
  ): Promise<void> {
    if (!this.page)
      throw new Error('Scrapper is not initialized. Call init() first.')

    if (selectorWaitFor) {
      await this.page.goto(url)
      await this.page.waitForSelector(selectorWaitFor, {
        timeout: 30000,
      })
    } else {
      await this.page.goto(url, { waitUntil: 'domcontentloaded' })
    }

    console.log(`Navigated to ${url}`)
  }

  // Perform a search using the searchValue
  public async performSearch(selector: string): Promise<void> {
    if (!this.page)
      throw new Error('Scrapper is not initialized. Call init() first.')

    const inputExists = await this.page.$(selector)
    if (!inputExists) {
      console.error(`Input with selector ${selector} not found!`)
      await this.browser.close()
      return
    }

    await this.page.type(selector, this.options.searchValue) // Type the search value
    await this.page.keyboard.press('Enter') // Press Enter
    await this.page.waitForNavigation({ waitUntil: 'domcontentloaded' })
    console.log(`Search performed for: ${this.options.searchValue}`)
  }

  // Scrape data from the page
  public async scrapeSingleOfferData(
    link: string,
    selectors: JobOfferSelectors
  ): Promise<JobOfferScrappedData> {
    if (!this.page)
      throw new Error('Scrapper is not initialized. Call init() first.')

    try {
      await this.page.goto(link, { waitUntil: 'domcontentloaded' }) // Function to safely scrape data
      const scrapeField = async (selector?: string): Promise<string> => {
        if (!selector) return '' // If no selector is provided, return an empty string
        try {
          return await this.page.$eval(
            selector,
            (el) => el.textContent?.trim() || ''
          )
        } catch {
          return '' // Return an empty string if selector is not found
        }
      }

      const scrapeMultipleFields = async (
        selector?: string
      ): Promise<string[]> => {
        if (!selector) return [] // If no selector is provided, return an empty array
        try {
          return await this.page.$$eval(selector, (elements) =>
            elements.map((el) => el.textContent?.trim() || '').filter(Boolean)
          )
        } catch {
          return [] // Return an empty array if selector is not found
        }
      }

      // Scrape fields based on selectors
      const title = await scrapeField(selectors.title)
      const description = await scrapeField(selectors.description)
      const company = await scrapeField(selectors.company)
      const salary = await scrapeField(selectors.salary)
      const technologies = await scrapeMultipleFields(selectors.technologies)
      const addedAt = await scrapeField(selectors.addedAt)

      return {
        title,
        description,
        company,
        salary,
        offerURL: link,
        technologies,
        addedAt,
      }
    } catch (error) {
      console.error(`Error scraping ${link}:`, error)
      return null
    }
  }

  public async scrapeOffersLinks(recordSelector: string): Promise<string[]> {
    if (!this.page)
      throw new Error('Scrapper is not initialized. Call init() first.')
    await this.page.waitForSelector(recordSelector, {
      timeout: 30000,
    })
    const records = await this.page.$$eval(
      recordSelector,
      (elements, maxRecords) => {
        return elements
          .slice(0, maxRecords)
          .map((el) => el.getAttribute('href') || '')
      },
      this.options.maxRecords
    )

    console.log(`Scraped ${records.length} records.`)
    return records
  }

  public async scrapePageContent(): Promise<string> {
    if (!this.page)
      throw new Error('Scrapper is not initialized. Call init() first.')

    const content = await this.page.content()
    console.log('Page content scraped!')
    return content
  }

  public async createPdfScreenshot(): Promise<void> {
    if (!this.page)
      throw new Error('Scrapper is not initialized. Call init() first.')

    await this.page.pdf({ path: 'page.pdf', format: 'A4' })
    console.log('PDF generated!')
  }

  // Close the browser
  public async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close()
      console.log('Browser closed!')
    }
  }
}
