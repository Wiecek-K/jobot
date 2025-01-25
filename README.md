<h1 align="center">
  🤖 Jobot
</h1>

# Job Scraping Project Documentation

## Project Goal

The primary goal of this project is to scrape job offers from various platforms and provide them via an API.

## Live Application

The live application is available at: [Job Scraping App](https://jobot-production.up.railway.app/)

## Prerequisites

1. **Install Dependencies**: Run `pnpm install --frozen-lockfile` to install all required dependencies.
2. **Chrome Installation**: Ensure Chrome is installed on the machine. Use the command:
   ```bash
   npx puppeteer browsers install chrome
   ```
3. **Environment Variable**: The `NODE_ENV` environment variable should be set to `production`.
4. **Node.js Version**: Use Node.js version 18 or later.

## API Endpoints

### `/offers/:searchValue`

- **Description**: Returns job offers based on the search value provided.
- **Method**: GET
- **Query Parameters**:
  - `limit` (optional): Limits the number of results from each service (default: 10).
- **Response Example**:
  ```json
  [
    {
      "serviceName": "JustJoinIt",
      "data": [
        {
          "title": "Frontend Developer",
          "description": "Develop and maintain web applications.",
          "company": "Tech Corp",
          "salaryFrom": 5000,
          "salaryTo": 8000,
          "currency": "USD",
          "offerURL": "https://example.com/job/frontend-developer",
          "technologies": ["JavaScript", "React"],
          "addedAt": "2025-01-01T10:00:00Z"
        }
      ]
    },
    {
      "serviceName": "PracujPl",
      "data": [
        {
          "title": "Backend Developer",
          "description": "Build scalable backend systems.",
          "company": "CodeBase",
          "salaryFrom": 7000,
          "salaryTo": 10000,
          "currency": "USD",
          "offerURL": "https://example.com/job/backend-developer",
          "technologies": ["Node.js", "Express"],
          "addedAt": "2025-01-02T12:00:00Z"
        }
      ]
    }
  ]
  ```

### `/scrap-results/justjoinit`

- **Description**: Returns a JSON file containing job offers scraped by crone job from JustJoinIt.
- **Method**: GET
- **Response Example**:
  ```json
  [
    {
      "title": "Frontend Developer",
      "description": "Develop and maintain web applications.",
      "company": "Tech Corp",
      "salaryFrom": 5000,
      "salaryTo": 8000,
      "currency": "USD",
      "offerURL": "https://example.com/job/frontend-developer",
      "technologies": ["JavaScript", "React"],
      "addedAt": "2025-01-01T10:00:00Z"
    }
  ]
  ```

### `/scrap-results/pracujpl`

- **Description**: Returns a JSON file containing job offers scraped by crone job from PracujPl.
- **Method**: GET
- **Response Example**:
  ```json
  [
    {
      "title": "Backend Developer",
      "description": "Build scalable backend systems.",
      "company": "CodeBase",
      "salaryFrom": 7000,
      "salaryTo": 10000,
      "currency": "USD",
      "offerURL": "https://example.com/job/backend-developer",
      "technologies": ["Node.js", "Express"],
      "addedAt": "2025-01-02T12:00:00Z"
    }
  ]
  ```

## Scripts

### Starting the Project

- **Development Mode**:
  ```bash
  pnpm start:dev
  ```
- **Production Mode**:
  ```bash
  pnpm start:prod
  ```

### Running the Scraper

- **Command**:
  ```bash
  pnpm scrap:offers:prod -s "<searchValue>" -l <limit> -t <maxTabs>
  ```
- **Arguments**:
  - `-s, --search`: Search value for scraping (required).
  - `-l, --limit`: Limit of records to scrape (default: 10).
  - `-t, --maxTabs`: Limit of tabs open at one time (default: 20).

## Additional Setup Before Running the Project

1. Install all dependencies:
   ```bash
   pnpm install --frozen-lockfile
   ```
2. Install Chrome:
   ```bash
   npx puppeteer browsers install chrome
   ```
3. Build the project:
   ```bash
   pnpm run build
   ```
