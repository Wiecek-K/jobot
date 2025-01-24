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

export interface ScrappedOffers {
  serviceName: string
  data: JobOffer[]
}
