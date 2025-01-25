export interface JobOffer {
  title: string
  description: string
  company: string
  salaryFrom: number
  salaryTo: number
  currency: string
  offerURL: string
  technologies: string[]
  addedAt: string
}

export interface ScrapedOffers {
  serviceName: string
  data: JobOffer[]
}
