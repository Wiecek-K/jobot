import { log } from 'console'
import { JobOffer } from '../../types/types'
import {
  BrowserManager,
  AbstractPageScraper,
  ScraperUtils,
  ScraperOptions,
  JobOfferBuilder,
} from './scraper'
import { Page } from 'puppeteer'

export class PracujPlScraper extends AbstractPageScraper<JobOffer> {
  private readonly baseUrl = 'https://it.pracuj.pl/praca/'
  private options: ScraperOptions

  constructor(browserManager: BrowserManager, options: ScraperOptions) {
    super(browserManager)
    this.options = options
  }

  private buildUrl(searchValue: string): string {
    const encodedSearchValue = encodeURIComponent(searchValue)
    return `${this.baseUrl}${encodedSearchValue}`
  }

  private parseSalary(salaryText: string) {
    const regex = /([\d\s,.]+)[–\-]([\d\s,.]+)([\p{L}\p{Sc}]+)/u

    const match = salaryText.match(regex)
    if (!match) {
      return { salaryFrom: 0, salaryTo: 0, currency: '' }
    }

    const salaryFrom = parseFloat(match[1].replace(/[,\s]/g, ''))
    const salaryTo = parseFloat(match[2].replace(/[,\s]/g, ''))
    const currency = match[3]

    return { salaryFrom, salaryTo, currency }
  }

  private async getCompanyName(page: Page) {
    const companyName = await page.$eval(
      'h2[data-test="text-employerName"]',
      (element) => {
        return Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => node.textContent?.trim())
          .join('')
      }
    )
    return companyName
  }

  private async scrapDescription(page: Page) {
    const aboutProject = await ScraperUtils.scrapeField(
      page,
      'section[data-test="section-about-project"]'
    )
    const yourResponsibilities = await ScraperUtils.scrapeField(
      page,
      'section[data-test="section-responsibilities"]'
    )
    const requirements = await ScraperUtils.scrapeField(
      page,
      'section[data-test="section-requirements"]'
    )

    const description = `${aboutProject.replace(/O projekcie(?!:)/, 'O projekcie: ')}\n${yourResponsibilities.replace(/Twój zakres obowiązków(?!:)/, 'Twój zakres obowiązków: ')}\n${requirements.replace(/Nasze wymagania(?!:)/, 'Nasze wymagania: ')}`
    return description
  }

  private async scrapeLinksAndDate(): Promise<
    { offerId: string; href: string; addedAt: string }[]
  > {
    const listElementSelector = 'div[data-test="section-offers"]'
    const offerElementSelector = 'div[data-test-offerid]'
    const nextPageButtonSelector =
      'button[data-test="bottom-pagination-button-next"]'
    const cookieButtonSelector = 'button[data-test="button-submitCookie"]'
    const maxRecords = this.options.maxRecords
    const collectedData: { offerId: string; href: string; addedAt: string }[] =
      []
    const collectedIndices = new Set<string>()
    const url = this.buildUrl(this.options.searchValue)

    try {
      await this.withPage({ width: 700, height: 600 }, async (page) => {
        await page.goto(url, { timeout: 120000 })

        while (collectedData.length < maxRecords) {
          await page.waitForSelector(offerElementSelector, { timeout: 120000 })

          const offersData = await page.$$eval(
            `${listElementSelector} ${offerElementSelector}`,
            (offerDivs) =>
              offerDivs.map((offerDiv) => {
                const offerId = offerDiv.getAttribute('data-test-offerid')
                const anchor = offerDiv.querySelector(
                  'a[data-test="link-offer"]'
                ) as HTMLAnchorElement
                const href = anchor ? anchor.href : null

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
          offersData.forEach((offer) => {
            if (offer.href && !collectedIndices.has(offer.offerId)) {
              collectedData.push(offer)
              collectedIndices.add(offer.offerId)
            } //TODO: think how to handle offer with multiple locations, other html structure in this case. At this moment I just skip those offers
          })

          if (collectedData.length < maxRecords) {
            const nextButton = await page.$(nextPageButtonSelector)

            if (nextButton) {
              const submitCookieButton = await page.$(cookieButtonSelector)
              if (submitCookieButton) await submitCookieButton.click()
              await nextButton.click()
            } else {
              console.log('scraped all offers')
            }
          } else {
            break
          }
        }
      })
    } catch (error) {
      console.error('Error during collect links on Pracuj.Pl:', error)
    }

    return collectedData.slice(0, maxRecords)
  }

  private async scrapeJobDetails(
    link: string
  ): Promise<Omit<JobOffer, 'addedAt'> | null> {
    try {
      return await this.withPage({ width: 700, height: 1200 }, async (page) => {
        await page.goto(link, {
          waitUntil: 'domcontentloaded',
          timeout: 120000,
        })
        await page.waitForSelector('h1', { timeout: 120000 })

        const salary = await ScraperUtils.scrapeField(
          page,
          'div[data-test="text-earningAmount"]'
        )

        const offer = {
          title: await ScraperUtils.scrapeField(page, 'h1'),
          description: await this.scrapDescription(page),
          company: await this.getCompanyName(page),
          offerURL: link,
          ...this.parseSalary(salary),
          technologies: await ScraperUtils.scrapeMultipleFields(
            page,
            'span[data-test="item-technologies-expected"]'
          ),
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
      const jobBaseData = await this.scrapeLinksAndDate()

      const offers = await Promise.allSettled(
        jobBaseData.map(async ({ href, addedAt }) => {
          const jobDetails = await this.scrapeJobDetails(href)
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
