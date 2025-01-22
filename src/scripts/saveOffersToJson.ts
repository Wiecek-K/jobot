import { JobOffer } from '../types/types'
import path from 'path'
import fs from 'fs'

export const saveOffersToJson = async (
  data: JobOffer[],
  fileName?: string
): Promise<void> => {
  try {
    const outputPath = path.resolve(
      __dirname,
      `../../scrap-results/${fileName || 'results'}.json`
    )
    fs.mkdirSync(path.dirname(outputPath), { recursive: true })
    fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8')
    console.log(`Results saved to ${outputPath}`)
  } catch (error) {
    console.error('Failed to save results to file:', error)
  }
}
