import { JobOffer } from '../../types/types'
import {
  BrowserManager,
  PageScrapper,
  ScraperUtils,
  ScrapperOptions,
} from './scrapper'

export class JustJoinItScrapper extends PageScrapper {
  private readonly baseUrl = 'https://justjoin.it/'
  private options: ScrapperOptions

  constructor(browserManager: BrowserManager, options: ScrapperOptions) {
    super(browserManager)
    this.options = options
  }

  private async scrapeJobDetails(link: string): Promise<any | null> {
    const parseSalary = (
      salaryString: string
    ): {
      salaryFrom: number
      salaryTo: number
      currency: string
    } => {
      if (!salaryString) {
        return { salaryFrom: 0, salaryTo: 0, currency: '' }
      }

      const salaryRegex = /(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*([A-Za-z]+)/
      const match = salaryString.match(salaryRegex)

      if (!match) {
        return { salaryFrom: 0, salaryTo: 0, currency: '' }
      }

      const [_, from, to, currency] = match

      return {
        salaryFrom: parseInt(from.replace(/\s/g, ''), 10), // Remove spaces and convert to number
        salaryTo: parseInt(to.replace(/\s/g, ''), 10), // Remove spaces and convert to number
        currency: currency.trim().toLocaleUpperCase(),
      }
    }

    try {
      return await this.withPage({ width: 1024, height: 768 }, async (page) => {
        const fullLink = new URL(link, this.baseUrl).href
        await page.goto(fullLink, { waitUntil: 'domcontentloaded' })

        const salary = await ScraperUtils.scrapeField(page, '.css-1pavfqb')
        const offer = {
          title: await ScraperUtils.scrapeField(page, 'h1'),
          description: await ScraperUtils.scrapeField(page, '.css-tbycqp'),
          company: await ScraperUtils.scrapeField(page, 'h2'),
          offerURL: fullLink,
          ...parseSalary(salary),
        }

        return offer
      })
    } catch (error) {
      console.error(`Failed to scrape job details for ${link}:`, error)
      return null
    }
  }

  public async scrape(): Promise<JobOffer[]> {
    try {
      const jobLinks = await this.withPage(
        { width: 1280, height: 800 },
        async (page) => {
          try {
            const searchSelector = 'input[placeholder="Search"]'
            const jobLinkSelector = '.offer_list_offer_link'
            await page.goto(this.baseUrl)
            await page.waitForSelector(searchSelector)

            await page.type(searchSelector, this.options.searchValue)
            await page.keyboard.press('Enter')
            await page.waitForNavigation({ waitUntil: 'domcontentloaded' })
            await page.waitForSelector(jobLinkSelector)

            const links = await page.$$eval(
              jobLinkSelector,
              (elements, maxRecords) =>
                elements
                  .slice(0, maxRecords)
                  .map((el) => el.getAttribute('href') || '')
                  .filter(Boolean),
              this.options.maxRecords
            )
            return links
          } catch (error) {
            console.error('Failed to get job links:', error)
            return []
          }
        }
      )

      const offers = await Promise.allSettled(
        jobLinks.map((link) => this.scrapeJobDetails(link))
      )

      return offers
        .filter(
          (result): result is PromiseFulfilledResult<any> =>
            result.status === 'fulfilled' && result.value !== null
        )
        .map((result) => result.value)
    } catch (error) {
      console.error('Failed to scrape jobs:', error)
      return []
    }
  }
}
