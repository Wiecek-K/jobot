import { createServer, Server, ServerResponse } from 'http'
import schedule from 'node-schedule'
import { exec } from 'child_process'

const PORT = process.env.PORT || 4200

const server: Server = createServer((request, response: ServerResponse) => {
  response.writeHead(200, { 'Content-Type': 'text/plain' })
  response.end('Hello World!\n')
})

schedule.scheduleJob('0 9 * * 1-5', () => {
  console.log('Running scheduled job: run-cron-job')

  exec(
    'pnpm scrap:offers -s "Javascript Developer" -l 5 -t 30',
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

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`)
})
