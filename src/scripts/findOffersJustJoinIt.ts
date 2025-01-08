import { ScrapperOptions, Scrapper } from '../bot/scrapper/scrapper'
import { JobOffer } from '../types/types'

const findOffersJustJoinIt = async (): Promise<JobOffer[]> => {
  const baseUrl = 'https://justjoin.it/'
  const scrapperOptions: ScrapperOptions = {
    searchValue: 'Java',
    maxRecords: 5,
  }

  const parseSalary = (
    salaryString: string
  ): {
    salaryFrom: number
    salaryTo: number
    currency: string
  } => {
    if (!salaryString) {
      return { salaryFrom: 0, salaryTo: 0, currency: '' }
    }

    const salaryRegex = /(\d[\d\s]*)\s*-\s*(\d[\d\s]*)\s*([A-Za-z]+)/
    const match = salaryString.match(salaryRegex)

    if (!match) {
      return { salaryFrom: 0, salaryTo: 0, currency: '' }
    }

    const [_, from, to, currency] = match

    return {
      salaryFrom: parseInt(from.replace(/\s/g, ''), 10), // Remove spaces and convert to number
      salaryTo: parseInt(to.replace(/\s/g, ''), 10), // Remove spaces and convert to number
      currency: currency.trim().toLocaleUpperCase(),
    }
  }

  const scrapper = new Scrapper(scrapperOptions)
  const tabletScrapper = new Scrapper({
    ...scrapperOptions,
    viewPort: { width: 1024, height: 768 },
  })

  try {
    // await scrapper.init()
    // await scrapper.navigateTo(baseUrl, 'input[placeholder="Search"]')
    // await scrapper.performSearch('input[placeholder="Search"]')
    // const links = (
    //   await scrapper.scrapeOffersLinks('.offer_list_offer_link')
    // ).map((link) => baseUrl + link.slice(1))

    // console.log('Scraped links:', links)

    await tabletScrapper.init()
    const data = await tabletScrapper.scrapeSingleOfferData(
      'https://justjoin.it/job-offer/sdncenter-sp-z-o-o--senior-java-kotlin-fullstack-developer-warszawa-java',
      {
        title: 'h1',
        description: '.css-tbycqp',
        company: 'h2',
        salary: '.css-1pavfqb',
      }
    )
    const parsedSalary = parseSalary(data.salary)
    await tabletScrapper.close()
    const parsedData = {
      addedAt: data.addedAt,
      technologies: data.technologies,
      offerURL: data.offerURL,
      company: data.company,
      description: data.description,
      title: data.title,
      ...parsedSalary,
    }
    console.log(parsedData)
    return [
      {
        addedAt: data.addedAt,
        technologies: data.technologies,
        offerURL: data.offerURL,
        company: data.company,
        description: data.description,
        title: data.title,
        ...parsedSalary,
      },
    ]
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await scrapper.close()
  }
}

findOffersJustJoinIt()
