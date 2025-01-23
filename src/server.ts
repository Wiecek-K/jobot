import express, { Request, Response } from 'express'
import { exec } from 'child_process'
import { findOffers } from './scripts/handleEndpoint'
import schedule from 'node-schedule'
import fs from 'fs'
import path from 'path'

const app = express()
const PORT = process.env.PORT || 4200

app.get('/scrap-results/justjoinit', async (req: Request, res: Response) => {
  const filePath = path.join(__dirname, '../scrap-results/JustJoinIt.json')
  console.log(filePath)

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
  const limit = req.query.limit as number

  if (!searchValue) {
    return res.status(400).send('Search value is required')
  }
  try {
    const offers = await findOffers(searchValue, limit)
    return res.status(200).json(offers)
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

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`)
})
