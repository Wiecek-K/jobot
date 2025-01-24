import { JustJoinItScrapper } from '../bot/scrapper/JustJoinItScrapper'
import { BrowserManager } from '../bot/scrapper/scrapper'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { PracujPlScrapper } from '../bot/scrapper/PracujPlScrapper'
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
  console.log('Scrapping...')

  const justJoinItBrowserManager = new BrowserManager(args.maxTabs)
  const pracujPlBrowserManager = new BrowserManager(args.maxTabs)

  const scrappers = [
    {
      name: 'JustJoinIt',
      browserManager: justJoinItBrowserManager,
      scrapper: new JustJoinItScrapper(justJoinItBrowserManager, {
        searchValue: args.search,
        maxRecords: args.limit,
      }),
    },
    {
      name: 'PracujPl',
      browserManager: pracujPlBrowserManager,
      scrapper: new PracujPlScrapper(pracujPlBrowserManager, {
        searchValue: args.search,
        maxRecords: args.limit,
      }),
    },
  ]

  const runScrapers = async () => {
    scrappers.forEach(async ({ browserManager, name, scrapper }) => {
      try {
        await browserManager.init()
        const offersData = await scrapper.scrape()
        await saveOffersToJson(offersData, name)
        await saveOffersToCSV(offersData, name)
      } catch (error) {
        console.error('Fatal error during scraping:', error)
      } finally {
        await browserManager.close()
      }
    })
  }

  runScrapers()
}

findOffers()
