import { JustJoinItScraper } from '../bot/scraper/JustJoinItScraper'
import { BrowserManager } from '../bot/scraper/scraper'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { PracujPlScraper } from '../bot/scraper/PracujPlScraper'
import { saveOffersToJson } from './saveOffersToJson'
import { saveOffersToCSV } from './saveOffersToCSV'

const args = yargs(hideBin(process.argv))
  .option('search', {
    alias: 's',
    type: 'string',
    describe: 'Search value for scraping',
    demandOption: true,
  })
  .option('limit', {
    alias: 'l',
    type: 'number',
    describe: 'Limit of records to scrape',
    default: 10,
  })
  .option('maxTabs', {
    alias: 't',
    type: 'number',
    describe: 'Limit of tabs open at one time',
    default: 20,
  })
  .help().argv

const findOffers = async () => {
  console.log('Scraping...')

  const justJoinItBrowserManager = new BrowserManager(args.maxTabs)
  const pracujPlBrowserManager = new BrowserManager(args.maxTabs)

  const scrapers = [
    {
      name: 'JustJoinIt',
      browserManager: justJoinItBrowserManager,
      scraper: new JustJoinItScraper(justJoinItBrowserManager, {
        searchValue: args.search,
        maxRecords: args.limit,
      }),
    },
    {
      name: 'PracujPl',
      browserManager: pracujPlBrowserManager,
      scraper: new PracujPlScraper(pracujPlBrowserManager, {
        searchValue: args.search,
        maxRecords: args.limit,
      }),
    },
  ]

  for (const { browserManager, scraper, name } of scrapers) {
    try {
      console.log(`Starting scraper: ${name}`)
      await browserManager.init()
      const offersData = await scraper.scrape()
      await saveOffersToJson(offersData, name)
      await saveOffersToCSV(offersData, name)
    } catch (error) {
      console.error(`Error during scraping for ${name}:`, error)
    } finally {
      await browserManager.close()
    }
  }
}

findOffers()
