import puppeteer, { Browser, Page } from 'puppeteer'
import { JobOffer } from '../../types/types'

export interface ScraperOptions {
  searchValue: string
  maxRecords: number
}

class Semaphore {
  private counter: number
  private waiting: Array<(value: void) => void> = []

  constructor(maxCount: number) {
    this.counter = maxCount
  }

  public async acquire(): Promise<void> {
    if (this.counter > 0) {
      this.counter--
      return Promise.resolve()
    }
    return new Promise<void>((resolve) => this.waiting.push(resolve))
  }

  public release(): void {
    this.counter++
    if (this.waiting.length > 0 && this.counter > 0) {
      this.counter--
      const next = this.waiting.shift()
      if (next) {
        next()
      }
    }
  }

  public getAvailableSlots(): number {
    return this.counter
  }

  public getWaitingCount(): number {
    return this.waiting.length
  }
}

export class BrowserManager {
  private browser!: Browser
  private pages: Set<Page> = new Set()
  private semaphore: Semaphore

  constructor(maxConcurrentPages: number = 5) {
    this.semaphore = new Semaphore(maxConcurrentPages)
  }

  public async init(): Promise<void> {
    this.browser = await puppeteer.launch({
      headless: true,
      args: [
        '--disable-dev-shm-usage',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--no-zygote',
      ],
    })
    console.log('Browser initialized!')
  }

  public async openPage(viewPort: {
    width: number
    height: number
  }): Promise<Page> {
    if (!this.browser) {
      throw new Error('Browser is not initialized. Call init() first.')
    }

    await this.semaphore.acquire()

    try {
      const page = await this.browser.newPage()
      await page.setViewport(viewPort)
      await page.setUserAgent(
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36'
      )

      this.pages.add(page)
      // console.log(
      //   `Page opened. Active pages: ${this.pages.size}. Available slots: ${this.semaphore.getAvailableSlots()}`
      // )

      return page
    } catch (error) {
      this.semaphore.release()
      throw error
    }
  }

  public async closePage(page: Page): Promise<void> {
    if (this.pages.has(page)) {
      await page.close()
      this.pages.delete(page)
      this.semaphore.release()
      // console.log(
      //   `Page closed. Active pages: ${this.pages.size}. Available slots: ${this.semaphore.getAvailableSlots()}`
      // )
    } else {
      console.warn('Page not managed by BrowserManager.')
    }
  }

  public async close(): Promise<void> {
    const closePromises = Array.from(this.pages).map((page) => page.close())
    await Promise.all(closePromises)
    this.pages.clear()

    if (this.browser) {
      await this.browser.close()
      console.log('Browser and all pages closed!')
    }
  }

  public getActivePages(): number {
    return this.pages.size
  }

  public getWaitingPages(): number {
    return this.semaphore.getWaitingCount()
  }
}

export class ScraperUtils {
  public static async scrapeField(
    page: Page,
    selector: string
  ): Promise<string> {
    try {
      return await page.$eval(selector, (el) => el.textContent?.trim() || '')
    } catch {
      return ''
    }
  }

  public static async scrapeMultipleFields(
    page: Page,
    selector: string
  ): Promise<string[]> {
    try {
      return await page.$$eval(selector, (elements) =>
        elements.map((el) => el.textContent?.trim() || '').filter(Boolean)
      )
    } catch {
      return []
    }
  }
}

export abstract class AbstractPageScraper<R> {
  protected browserManager: BrowserManager

  constructor(browserManager: BrowserManager) {
    this.browserManager = browserManager
  }

  public abstract scrape(): Promise<R[]>

  // Helper to manage a single page lifecycle
  protected async withPage<T>(
    viewPort: { width: number; height: number },
    callback: (page: Page) => Promise<T>
  ): Promise<T> {
    const page = await this.browserManager.openPage(viewPort)
    try {
      return await callback(page)
    } finally {
      await this.browserManager.closePage(page)
    }
  }
}

export class JobOfferBuilder {
  private jobOffer: Partial<JobOffer> = {}

  setTitle(title: string): this {
    this.jobOffer.title = title
    return this
  }

  setDescription(description: string): this {
    this.jobOffer.description = description
    return this
  }

  setCompany(company: string): this {
    this.jobOffer.company = company
    return this
  }

  setSalary(salaryFrom: number, salaryTo: number, currency: string): this {
    this.jobOffer.salaryFrom = salaryFrom
    this.jobOffer.salaryTo = salaryTo
    this.jobOffer.currency = currency
    return this
  }

  setOfferURL(url: string): this {
    this.jobOffer.offerURL = url
    return this
  }

  setTechnologies(technologies: string[]): this {
    this.jobOffer.technologies = technologies
    return this
  }

  setAddedAt(date: string): this {
    this.jobOffer.addedAt = date
    return this
  }

  build(): JobOffer {
    const requiredFields = [
      'title',
      'description',
      'company',
      'offerURL',
      'addedAt',
    ]
    for (const field of requiredFields) {
      if (!this.jobOffer[field as keyof JobOffer]) {
        throw new Error(`Missing required field: ${field}`)
      }
    }
    return this.jobOffer as JobOffer
  }
}
