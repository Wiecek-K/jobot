import { JustJoinItScraper } from '../bot/scraper/JustJoinItScraper'
import { BrowserManager } from '../bot/scraper/scraper'
import { PracujPlScraper } from '../bot/scraper/PracujPlScraper'
import { ScrapedOffers } from '../types/types'

const MAX_TABS = 1

export const findOffers = async (searchValue: string, limit = 5) => {
  const scrapedOffers: ScrapedOffers[] = []
  const justJoinItBrowserManager = new BrowserManager(MAX_TABS)
  const pracujPlBrowserManager = new BrowserManager(MAX_TABS)

  const scrapers = [
    {
      name: 'JustJoinIt',
      browserManager: justJoinItBrowserManager,
      scraper: new JustJoinItScraper(justJoinItBrowserManager, {
        searchValue,
        maxRecords: limit,
      }),
    },
    {
      name: 'PracujPl',
      browserManager: pracujPlBrowserManager,
      scraper: new PracujPlScraper(pracujPlBrowserManager, {
        searchValue,
        maxRecords: limit,
      }),
    },
  ]

  for (const { browserManager, scraper, name } of scrapers) {
    try {
      console.log(`Starting scraper: ${name}`)
      await browserManager.init()
      const offersData = await scraper.scrape()
      scrapedOffers.push({ serviceName: name, data: offersData })
    } catch (error) {
      console.error(`Error during scraping for ${name}:`, error)
    } finally {
      await browserManager.close()
    }
  }

  return scrapedOffers
}
