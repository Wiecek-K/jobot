import { JobOffer } from '../../types/types'
import {
  BrowserManager,
  AbstractPageScrapper,
  ScraperUtils,
  ScrapperOptions,
  JobOfferBuilder,
} from './scrapper'

export class JustJoinItScrapper extends AbstractPageScrapper<JobOffer> {
  private readonly baseUrl = 'https://justjoin.it/'
  private options: ScrapperOptions

  constructor(browserManager: BrowserManager, options: ScrapperOptions) {
    super(browserManager)
    this.options = options
  }

  private async scrapeJobDetails(
    link: string
  ): Promise<Omit<JobOffer, 'addedAt'> | null> {
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
          technologies: await ScraperUtils.scrapeMultipleFields(page, 'h4'),
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
      const jobLinksWithAddedAt = await this.withPage(
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

            const linksWithAddedAt = await page.$$eval(
              jobLinkSelector,
              (elements, maxRecords) =>
                elements
                  .map((el) => {
                    const link = el.getAttribute('href') || ''
                    if (!link) return null

                    const parent = el.parentElement
                    const addedAt =
                      parent
                        ?.querySelector('.css-jikuwi')
                        ?.textContent.trim() || ''
                    return { link, addedAt }
                  })
                  .filter(Boolean)
                  .slice(0, maxRecords),
              this.options.maxRecords
            )
            return linksWithAddedAt
          } catch (error) {
            console.error('Failed to get job links:', error)
            return []
          }
        }
      )

      const offers = await Promise.allSettled(
        jobLinksWithAddedAt.map(async ({ link, addedAt }) => {
          const jobDetails = await this.scrapeJobDetails(link)

          if (!jobDetails) return null
          return new JobOfferBuilder()
            .setTitle(jobDetails.title)
            .setDescription(jobDetails.description)
            .setCompany(jobDetails.company)
            .setOfferURL(jobDetails.offerURL)
            .setSalary(
              jobDetails.salaryFrom,
              jobDetails.salaryTo,
              jobDetails.currency
            )
            .setTechnologies(jobDetails.technologies)
            .setAddedAt(addedAt)
            .build()
        })
      )

      return offers
        .filter(
          (result): result is PromiseFulfilledResult<JobOffer> =>
            result.status === 'fulfilled' && result.value !== null
        )
        .map((result) => result.value)
    } catch (error) {
      console.error('Failed to scrape jobs:', error)
      return []
    }
  }
}