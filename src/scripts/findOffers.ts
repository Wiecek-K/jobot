import { JustJoinItScrapper } from '../bot/scrapper/JustJoinItScrapper'
import { BrowserManager } from '../bot/scrapper/scrapper'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'
import { JobOffer } from '../types/types'
import path from 'path'
import fs from 'fs'

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

  const runScraper = async () => {
    const browserManager = new BrowserManager(args.maxTabs)

    const scrapper = new JustJoinItScrapper(browserManager, {
      searchValue: args.search,
      maxRecords: args.limit,
    })

    try {
      await browserManager.init()
      const offers = await scrapper.scrape()

      return offers
    } catch (error) {
      console.error('Fatal error during scraping:', error)
    } finally {
      await browserManager.close()
    }
  }

  const saveOffersToJson = async (data: JobOffer[]): Promise<void> => {
    try {
      const outputPath = path.resolve(
        __dirname,
        '../../scrap-results/results.json'
      )
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
      fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
      console.log(`Results saved to ${outputPath}`)
    } catch (error) {
      console.error('Failed to save results to file:', error)
    }
  }

  const offersData = await runScraper()
  saveOffersToJson(offersData)
}

findOffers()
