import { log } from 'console'
import { JobOffer } from '../../types/types'
import {
  BrowserManager,
  AbstractPageScrapper,
  ScraperUtils,
  ScrapperOptions,
  JobOfferBuilder,
} from './scrapper'

export class PracujPlScrapper extends AbstractPageScrapper<JobOffer> {
  private readonly baseUrl = 'https://it.pracuj.pl/praca/'
  private options: ScrapperOptions

  constructor(browserManager: BrowserManager, options: ScrapperOptions) {
    super(browserManager)
    this.options = options
  }

  private buildUrl(searchValue: string): string {
    const encodedSearchValue = encodeURIComponent(searchValue)
    return `${this.baseUrl}${encodedSearchValue}`
  }

  private async scrapeLinksAndDate(): Promise<
    { offerId: string; href: string }[]
  > {
    const listElementSelector = 'div[data-test="section-offers"]'
    const offerElementSelector = 'div[data-test-offerid]'
    const nextPageButtonSelector =
      'button[data-test="bottom-pagination-button-next"'
    const maxRecords = this.options.maxRecords
    const collectedData: { offerId: string; href: string }[] = []
    const collectedIndices = new Set<number>()
    const url = this.buildUrl(this.options.searchValue)

    try {
      await this.withPage({ width: 700, height: 1200 }, async (page) => {
        await page.goto(url)
        await page.waitForSelector(offerElementSelector, { timeout: 60000 })

        const offerData = await page.$$eval(
          `${listElementSelector} ${offerElementSelector}`,
          (offerDivs) =>
            offerDivs.map((offerDiv) => {
              const offerId = offerDiv.getAttribute('data-test-offerid') // Pobierz offerid
              const anchor = offerDiv.querySelector('a') // Znajdź <a> wewnątrz danego div
              const href = anchor ? anchor.href : null // Pobierz href z <a>

              const addedAtDiv = offerDiv.querySelector(
                'p[data-test="text-added"]'
              )
              const addedAtRaw = addedAtDiv
                ? addedAtDiv.textContent?.trim()
                : null //
              const dateRegex = /\b\d{1,2}\s+\w+\s+\d{4}\b/
              const addedAt = addedAtRaw
                ? addedAtRaw.match(dateRegex)?.[0] || null
                : null
              return { offerId, href, addedAt }
            })
        )
        // await page.waitForSelector('div[data-test-NOTEXIST]', {
        //   timeout: 1500000,
        // })
        offerData.forEach((offer) => collectedData.push(offer))
        // while (collectedData.length < maxRecords) {
        //   const newItems = await page.evaluate((offerSelector) => {
        //     const elements = Array.from(
        //       document.querySelectorAll(offerSelector)
        //     )
        //     return elements.map((el) => {
        //       const dataIndex = parseInt(
        //         el.getAttribute('data-index') || '-1',
        //         10
        //       )
        //       const link = el.querySelector('a')?.getAttribute('href') || ''
        //       const addedAt =
        //         el.querySelector('.css-jikuwi')?.textContent?.trim() || ''
        //       return { dataIndex, link, addedAt }
        //     })
        //   }, offerElementSelector)

        //   for (const item of newItems) {
        //     if (
        //       item.dataIndex !== -1 &&
        //       !collectedIndices.has(item.dataIndex)
        //     ) {
        //       collectedIndices.add(item.dataIndex)
        //       collectedData.push({ link: item.link, addedAt: item.addedAt })
        //     }
        //   }

        //   if (collectedData.length >= maxRecords) break

        //   // Checking if further scrolling is possible (padding-bottom != 0)
        //   const canScroll = await page.evaluate((listSelector) => {
        //     const listElement = document.querySelector(listSelector)
        //     if (!listElement) return false
        //     const paddingBottom =
        //       window.getComputedStyle(listElement).paddingBottom
        //     return parseInt(paddingBottom, 10) !== 0
        //   }, listElementSelector)

        //   if (!canScroll) {
        //     console.log('Reached the end of the list. Stopping scroll.')
        //     break
        //   }

        //   await page.mouse.wheel({
        //     deltaY: 1000,
        //   })

        //   await new Promise((resolve) => setTimeout(resolve, 3000))
        // }
      })
    } catch (error) {
      console.error('Error during scroll and collect:', error)
    }
    console.log(collectedData)

    return collectedData.slice(0, maxRecords)
    // return collectedData.slice(0, maxRecords)
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
      await this.scrapeLinks()
      // const jobLinks = await this.scrapeLinks()
      // const offers = await Promise.allSettled(
      //   jobLinksWithAddedAt.map(async ({ link, addedAt }) => {
      //     const jobDetails = await this.scrapeJobDetails(link)
      //     if (!jobDetails) return null
      //     return new JobOfferBuilder()
      //       .setTitle(jobDetails.title)
      //       .setDescription(jobDetails.description)
      //       .setCompany(jobDetails.company)
      //       .setOfferURL(jobDetails.offerURL)
      //       .setSalary(
      //         jobDetails.salaryFrom,
      //         jobDetails.salaryTo,
      //         jobDetails.currency
      //       )
      //       .setTechnologies(jobDetails.technologies)
      //       .setAddedAt(addedAt)
      //       .build()
      //   })
      // )
      // return offers
      //   .filter(
      //     (result): result is PromiseFulfilledResult<JobOffer> =>
      //       result.status === 'fulfilled' && result.value !== null
      //   )
      //   .map((result) => result.value)
    } catch (error) {
      console.error('Failed to scrape jobs:', error)
      return []
    }
  }
}
