import { log } from 'console'
import { JobOffer } from '../../types/types'
import {
  BrowserManager,
  AbstractPageScrapper,
  ScraperUtils,
  ScrapperOptions,
  JobOfferBuilder,
} from './scrapper'
import { Page } from 'puppeteer'

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
    // const nextPageButtonSelector =
    //   'button[data-test="bottom-pagination-button-next"'
    const maxRecords = this.options.maxRecords
    const collectedData: { offerId: string; href: string; addedAt: string }[] =
      []
    // const collectedIndices = new Set<number>()
    const url = this.buildUrl(this.options.searchValue)

    try {
      await this.withPage({ width: 700, height: 1200 }, async (page) => {
        await page.goto(url)
        await page.waitForSelector(offerElementSelector, { timeout: 60000 })

        const offerData = await page.$$eval(
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
        // await page.waitForSelector('div[data-test-NOTEXIST]', {
        //   timeout: 1500000,
        // })
        offerData.forEach((offer) => {
          if (offer.href) collectedData.push(offer) //TODO: think how to handle offer with multiple locations, other html structure in this case. At this moment I just skip those offers
        })
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

    return collectedData.slice(0, maxRecords)
  }

  private async scrapeJobDetails(
    link: string
  ): Promise<Omit<JobOffer, 'addedAt'> | null> {
    try {
      return await this.withPage({ width: 700, height: 1200 }, async (page) => {
        await page.goto(link, { waitUntil: 'domcontentloaded' })

        const salary = await ScraperUtils.scrapeField(
          page,
          'div[data-test="text-earningAmount"]'
        )

        console.log(salary)

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
        console.log(offer)

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
