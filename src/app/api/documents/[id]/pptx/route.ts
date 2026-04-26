import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { generateProposalPPTX } from "@/lib/pptx"
import type { Document, Profile } from "@/types"

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

    const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single()
    if (!doc || !(doc as Document).proposal_content) {
      return NextResponse.json({ error: "提案書コンテンツがありません" }, { status: 404 })
    }

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    const document = doc as Document
    const profileData = (profile || {}) as Partial<Profile>

    const pptxBuffer = await generateProposalPPTX(document.proposal_content!, profileData)
    const filename = encodeURIComponent(`提案書_${document.client_name}.pptx`)

    return new NextResponse(new Uint8Array(pptxBuffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    console.error("PPTX error:", err)
    return NextResponse.json({ error: "PPTXの生成に失敗しました" }, { status: 500 })
  }
}
