import { JobOffer } from '../types/types'
import path from 'path'
import fs from 'fs'

export const saveOffersToCSV = (
  results: JobOffer[],
  fileName?: string
): void => {
  const outputPath = path.resolve(
    __dirname,
    `../../scrap-results/${fileName || 'results'}.csv`
  )

  try {
    if (!fs.existsSync(path.dirname(outputPath))) {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    }

    const header =
      'Title,Description,Company,OfferURL,SalaryFrom,SalaryTo,Currency,Technologies,AddedAt\n'
    const rows = results.map((offer) => {
      const technologies = offer.technologies.join(';')
      return `"${offer.title}","${offer.description}","${offer.company}","${offer.offerURL}",${offer.salaryFrom},${offer.salaryTo},${offer.currency},"${technologies}","${offer.addedAt}"`
    })

    fs.writeFileSync(outputPath, header + rows.join('\n'), 'utf-8')
    console.log(`Results successfully saved to ${outputPath}`)
  } catch (error) {
    console.error('Error saving results to CSV file:', error)
  }
}
