export type DocumentType = "proposal" | "estimate" | "both"
export type TaxRate = 10 | 8 | 0
export type RoundingType = "floor" | "round" | "ceil"
export type DocumentStatus = "draft" | "completed"
export type ToneType = "formal" | "casual"

export interface Profile {
  id: string
  company_name: string | null
  full_name: string | null
  address: string | null
  phone: string | null
  logo_url: string | null
  invoice_number: string | null
  default_tax_rate: TaxRate
  default_rounding: RoundingType
  bank_name: string | null
  bank_branch: string | null
  bank_account_type: "普通" | "当座" | null
  bank_account_number: string | null
  bank_account_holder: string | null
  created_at: string
  updated_at: string
}

export interface EstimateItem {
  name: string
  unit_price: number
  quantity: number
  subtotal: number
}

export interface FormData {
  type: DocumentType
  client_name: string
  project_name: string
  date: string
  // Proposal fields
  client_background?: string
  proposal_overview?: string
  delivery_period?: string
  our_strengths?: string
  tone?: ToneType
  // Estimate fields
  items?: EstimateItem[]
  ai_estimate_mode?: boolean
  tax_rate?: TaxRate
  rounding?: RoundingType
  withholding_tax?: boolean
  payment_terms?: string
  notes?: string
}

export interface ProposalSection {
  title: string
  body: string
  items?: string[]
}

export interface ProposalContent {
  title: string
  client_name: string
  date: string
  sections: ProposalSection[]
}

export interface EstimateContent {
  title: string
  client_name: string
  date: string
  items: EstimateItem[]
  subtotal: number
  tax_amount: number
  withholding_tax_amount: number
  total: number
  tax_rate: TaxRate
  payment_terms: string
  notes: string
  invoice_number: string
}

export interface Document {
  id: string
  user_id: string
  type: DocumentType
  title: string
  client_name: string
  form_data: FormData
  proposal_content: ProposalContent | null
  estimate_content: EstimateContent | null
  status: DocumentStatus
  created_at: string
  updated_at: string
}

export interface Template {
  id: string
  user_id: string
  name: string
  type: DocumentType
  form_data: Partial<FormData>
  created_at: string
  updated_at: string
}
