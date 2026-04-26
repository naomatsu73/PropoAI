import Anthropic from "@anthropic-ai/sdk"
import type { FormData, ProposalContent, EstimateContent, EstimateItem } from "@/types"
import { calculateTax } from "./tax"

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const PROPOSAL_SYSTEM_PROMPT = `あなたはプロの提案書ライターです。
クライアントへの提案書を作成する際、以下のルールに従ってください：
- 出力は必ずJSON形式で返してください
- 日本語のビジネス文書として自然で説得力のある文章を書いてください
- 各セクションは具体的かつ簡潔に記述してください
- クライアントの課題に対して明確な解決策を提示してください`

const ESTIMATE_SYSTEM_PROMPT = `あなたはWebサービス・デザイン・コンサルティング業務の見積もりの専門家です。
案件概要をもとに、適切な作業項目・工数・単価を推測してください。
- 出力は必ずJSON形式で返してください
- 単価は日本市場の相場に合わせてください（フリーランスの場合）
- 作業項目は具体的かつ漏れのないようにしてください`

export async function generateProposal(formData: FormData, profileData: { company_name?: string | null }): Promise<ProposalContent> {
  const toneInstruction = formData.tone === "casual" ? "やや親しみやすいカジュアルなトーン" : "丁寧でフォーマルなビジネストーン"

  const prompt = `以下の情報をもとに提案書を作成してください。

【クライアント名】${formData.client_name}
【案件名】${formData.project_name}
【提出日】${formData.date}
【クライアントの課題・背景】
${formData.client_background}
【提案する内容の概要】
${formData.proposal_overview}
【納期】${formData.delivery_period}
【自社の強み】${formData.our_strengths || "（未入力）"}
【提案会社名】${profileData.company_name || "（未設定）"}
【文書のトーン】${toneInstruction}

以下のJSONスキーマで提案書を返してください：
{
  "title": "提案書タイトル",
  "client_name": "クライアント名",
  "date": "日付",
  "sections": [
    { "title": "課題認識", "body": "本文..." },
    { "title": "提案概要", "body": "本文..." },
    { "title": "実施内容・スコープ", "body": "本文...", "items": ["項目1", "項目2"] },
    { "title": "スケジュール", "body": "本文..." },
    { "title": "期待効果", "body": "本文..." },
    { "title": "体制", "body": "本文..." },
    { "title": "会社概要", "body": "本文..." }
  ]
}`

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 4000,
    system: PROPOSAL_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("JSONの解析に失敗しました")

  return JSON.parse(jsonMatch[0]) as ProposalContent
}

export async function generateEstimateItems(formData: FormData): Promise<EstimateItem[]> {
  const prompt = `以下の案件概要をもとに、見積書の作業項目を作成してください。

【案件名】${formData.project_name}
【クライアント名】${formData.client_name}
【案件の概要】${formData.proposal_overview || formData.client_background || "（未入力）"}
【納期】${formData.delivery_period || "（未入力）"}

以下のJSON配列で作業項目を返してください。単価はフリーランスの日本市場相場を参考に設定してください：
[
  { "name": "作業項目名", "unit_price": 単価（数値）, "quantity": 数量（数値）, "subtotal": 小計（数値） },
  ...
]`

  const response = await client.messages.create({
    model: "claude-sonnet-4-5",
    max_tokens: 2000,
    system: ESTIMATE_SYSTEM_PROMPT,
    messages: [{ role: "user", content: prompt }],
  })

  const text = response.content[0].type === "text" ? response.content[0].text : ""
  const jsonMatch = text.match(/\[[\s\S]*\]/)
  if (!jsonMatch) throw new Error("JSONの解析に失敗しました")

  const items = JSON.parse(jsonMatch[0]) as EstimateItem[]
  return items.map(item => ({
    ...item,
    subtotal: item.unit_price * item.quantity,
  }))
}

export function buildEstimateContent(
  formData: FormData,
  profile: { invoice_number?: string | null; default_tax_rate?: number; default_rounding?: string }
): EstimateContent {
  const items = formData.items || []
  const taxRate = formData.tax_rate ?? (profile.default_tax_rate as 10 | 8 | 0) ?? 10
  const rounding = formData.rounding ?? (profile.default_rounding as "floor" | "round" | "ceil") ?? "floor"

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0)
  const { taxAmount, withholdingTaxAmount, total } = calculateTax(subtotal, taxRate, rounding, formData.withholding_tax ?? false)

  return {
    title: `見積書：${formData.project_name}`,
    client_name: formData.client_name,
    date: formData.date,
    items: items.map(item => ({ ...item, subtotal: item.unit_price * item.quantity })),
    subtotal,
    tax_amount: taxAmount,
    withholding_tax_amount: withholdingTaxAmount,
    total,
    tax_rate: taxRate,
    payment_terms: formData.payment_terms || "",
    notes: formData.notes || "",
    invoice_number: profile.invoice_number || "",
  }
}
