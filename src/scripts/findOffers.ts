import { JustJoinItScrapper } from '../bot/scrapper/JustJoinItScrapper'
import { BrowserManager, ScrapperOptions } from '../bot/scrapper/scrapper'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

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
  .help().argv

const findOffers = async () => {
  console.log('Scrapping...')

  const runScraper = async () => {
    const browserManager = new BrowserManager(10)

    const scrapper = new JustJoinItScrapper(browserManager, {
      searchValue: args.search,
      maxRecords: args.limit,
    })

    try {
      await browserManager.init()
      const offers = await scrapper.scrape()
      console.log('Successfully scraped offers:', offers)
      console.log(`Total offers scraped: ${offers.length}`)
    } catch (error) {
      console.error('Fatal error during scraping:', error)
    } finally {
      await browserManager.close()
    }
  }

  runScraper()
}

findOffers()
