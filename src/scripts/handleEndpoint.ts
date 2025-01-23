import { JustJoinItScrapper } from '../bot/scrapper/JustJoinItScrapper'
import { BrowserManager } from '../bot/scrapper/scrapper'
import { PracujPlScrapper } from '../bot/scrapper/PracujPlScrapper'
import { JobOffer } from '../types/types'

const MAX_TABS = 20

export const findOffers = async (searchValue: string, limit = 10) => {
  const scrappedOffers: JobOffer[] = []
  const justJoinItBrowserManager = new BrowserManager(MAX_TABS)
  const pracujPlBrowserManager = new BrowserManager(MAX_TABS)

  const scrappers = [
    {
      name: 'JustJoinIt',
      browserManager: justJoinItBrowserManager,
      scrapper: new JustJoinItScrapper(justJoinItBrowserManager, {
        searchValue,
        maxRecords: limit,
      }),
    },
    {
      name: 'PracujPl',
      browserManager: pracujPlBrowserManager,
      scrapper: new PracujPlScrapper(pracujPlBrowserManager, {
        searchValue,
        maxRecords: limit,
      }),
    },
  ]

  const runScrapers = async () => {
    return Promise.all(
      scrappers.map(async ({ browserManager, scrapper }) => {
        try {
          await browserManager.init()
          const offersData = await scrapper.scrape()
          offersData.forEach((offer) => scrappedOffers.push(offer))
        } catch (error) {
          console.error('Fatal error during scraping:', error)
        } finally {
          await browserManager.close()
        }
      })
    )
  }
  // const runScrapers = async () => {
  //   scrappers.forEach(async ({ browserManager, name, scrapper }) => {
  //     try {
  //       await browserManager.init()
  //       const offersData = await scrapper.scrape()
  //       offersData.forEach((offer) => scrappedOffers.push(offer))
  //     } catch (error) {
  //       console.error('Fatal error during scraping:', error)
  //     } finally {
  //       await browserManager.close()
  //     }
  //   })
  // }

  await runScrapers()
  return scrappedOffers
}
