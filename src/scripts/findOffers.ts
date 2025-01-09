import { JustJoinItScrapper } from '../bot/scrapper/JustJoinItScrapper'
import { BrowserManager, ScrapperOptions } from '../bot/scrapper/scrapper'

const findOffers = async () => {
  console.log('Scrapping...')

  const runScraper = async () => {
    const browserManager = new BrowserManager(10)
    const scrapperOptions: ScrapperOptions = {
      searchValue: 'Java',
      maxRecords: 2,
    }

    const scrapper = new JustJoinItScrapper(browserManager, scrapperOptions)

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
