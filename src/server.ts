import express, { Request, Response } from 'express'
import { exec } from 'child_process'
import { findOffers } from './scripts/handleEndpoint'
import schedule from 'node-schedule'
import fs from 'fs'
import path from 'path'
import NodeCache from 'node-cache'
import { ScrappedOffers } from './types/types'

const app = express()
const PORT = process.env.PORT || 4200

const offersCache = new NodeCache({ stdTTL: 7200, checkperiod: 120 })

app.get('/scrap-results/justjoinit', async (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../scrap-results/JustJoinIt.json')

  try {
    const fileData = await fs.promises.readFile(filePath, 'utf-8')
    res.status(200).json(JSON.parse(fileData))
  } catch (error) {
    res.status(500).json({ error: 'Failed to read the file' })
  }
})

app.get('/scrap-results/pracujpl', async (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../scrap-results/PracujPl.json')

  try {
    const fileData = await fs.promises.readFile(filePath, 'utf-8')
    res.status(200).json(JSON.parse(fileData))
  } catch (error) {
    res.status(500).json({ error: 'Failed to read the file' })
  }
})

app.get('/offers/:searchValue', async (req: Request, res: Response) => {
  const searchValue = req.params.searchValue
  const requestedLimit = req.query.limit
    ? parseInt(req.query.limit as string, 10)
    : 10

  if (!searchValue) {
    return res.status(400).send('Search value is required')
  }
  try {
    const cacheKey = `offers-${searchValue}`

    if (offersCache.has(cacheKey)) {
      const cachedOffers = offersCache.get<ScrappedOffers[]>(
        cacheKey
      ) as ScrappedOffers[]

      const hasEnoughData = cachedOffers.every(
        (scrapped) => scrapped.data.length >= requestedLimit
      )

      if (hasEnoughData) {
        const limitedOffers = cachedOffers.map((scrapped) => ({
          serviceName: scrapped.serviceName,
          data: scrapped.data.slice(0, requestedLimit),
        }))
        return res.status(200).json(limitedOffers)
      }
    }

    const scrappedOffers = await findOffers(searchValue, requestedLimit)

    offersCache.set(cacheKey, scrappedOffers)

    return res.status(200).json(scrappedOffers)
  } catch (error) {
    return res
      .status(500)
      .json({ error: 'An error occurred while fetching offers' })
  }
})

schedule.scheduleJob('0 9 * * 1-5', () => {
  console.log('Running scheduled job: run-cron-job')

  exec(
    'pnpm scrap:offers:prod -s "Javascript Developer" -l 5 -t 30',
    (error, stdout, stderr) => {
      if (error) {
        console.error(`Error executing script: ${error.message}`)
        return
      }
      if (stderr) {
        console.error(`Script error output: ${stderr}`)
        return
      }
      console.log(`Script output: ${stdout}`)
    }
  )
})

// schedule.scheduleJob('*/2 * * * *', () => {
//   console.log('Running scheduled job: run-cron-job')

//   exec(
//     'pnpm scrap:offers:prod -s "Javascript Developer" -l 5 -t 30',
//     (error, stdout, stderr) => {
//       if (error) {
//         console.error(`Error executing script: ${error.message}`)
//         return
//       }
//       if (stderr) {
//         console.error(`Script error output: ${stderr}`)
//         return
//       }
//       console.log(`Script output: ${stdout}`)
//     }
//   )
// })

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`)
})
