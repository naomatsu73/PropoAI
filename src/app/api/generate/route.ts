import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { generateProposal, generateEstimateItems, buildEstimateContent } from "@/lib/anthropic"
import type { FormData as PropoFormData } from "@/types"

export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

    const { formData }: { formData: PropoFormData } = await req.json()

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    const profile = profileData || {}
    const result: Record<string, unknown> = {}

    if (formData.type === "proposal" || formData.type === "both") {
      let proposal = null
      try {
        proposal = await generateProposal(formData, profile)
      } catch {
        // 1回リトライ
        proposal = await generateProposal(formData, profile)
      }
      result.proposal = proposal
    }

    if (formData.type === "estimate" || formData.type === "both") {
      let items = formData.items || []
      if (formData.ai_estimate_mode) {
        try {
          items = await generateEstimateItems(formData)
        } catch {
          items = await generateEstimateItems(formData)
        }
        result.items = items
      }
      const estimateFormData = { ...formData, items }
      result.estimate = buildEstimateContent(estimateFormData, profile)
    }

    return NextResponse.json(result)
  } catch (err: any) {
    console.error("Generate error:", err)
    return NextResponse.json({ error: "生成に失敗しました。再度お試しください。" }, { status: 500 })
  }
}
