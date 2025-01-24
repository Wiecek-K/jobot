import { JustJoinItScrapper } from '../bot/scrapper/JustJoinItScrapper'
import { BrowserManager } from '../bot/scrapper/scrapper'
import { PracujPlScrapper } from '../bot/scrapper/PracujPlScrapper'
import { ScrappedOffers } from '../types/types'

const MAX_TABS = 5

export const findOffers = async (searchValue: string, limit = 10) => {
  const scrappedOffers: ScrappedOffers[] = []
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

  // const runScrapers = async () => {
  //   return Promise.all(
  //     scrappers.map(async ({ browserManager, scrapper, name }) => {
  //       try {
  //         await browserManager.init()
  //         const offersData = await scrapper.scrape()
  //         scrappedOffers.push({ serviceName: name, data: offersData })
  //       } catch (error) {
  //         console.error('Fatal error during scraping:', error)
  //       } finally {
  //         await browserManager.close()
  //       }
  //     })
  //   )
  // }

  // await runScrapers()

  for (const { browserManager, scrapper, name } of scrappers) {
    try {
      console.log(`Starting scraper: ${name}`)
      await browserManager.init() // Inicjalizacja przeglądarki
      const offersData = await scrapper.scrape() // Scraping danych
      scrappedOffers.push({ serviceName: name, data: offersData }) // Dodanie wyników do finalnej tablicy
    } catch (error) {
      console.error(`Error during scraping for ${name}:`, error)
    } finally {
      await browserManager.close() // Zamknięcie przeglądarki
    }
  }

  return scrappedOffers
}
