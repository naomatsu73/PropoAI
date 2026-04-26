import { NextRequest, NextResponse } from "next/server"
import { createServerSupabaseClient } from "@/lib/supabase-server"
import { generateProposalPDF, generateEstimatePDF } from "@/lib/pdf"
import type { Document, Profile } from "@/types"

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const type = searchParams.get("type") || "proposal"

    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: "認証が必要です" }, { status: 401 })

    const { data: doc } = await supabase.from("documents").select("*").eq("id", id).single()
    if (!doc) return NextResponse.json({ error: "書類が見つかりません" }, { status: 404 })

    const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).single()
    const document = doc as Document
    const profileData = (profile || {}) as Partial<Profile>

    let pdfBuffer: Buffer

    if (type === "estimate" && document.estimate_content) {
      pdfBuffer = await generateEstimatePDF(document.estimate_content, profileData)
    } else if (document.proposal_content) {
      pdfBuffer = await generateProposalPDF(document.proposal_content, profileData)
    } else {
      return NextResponse.json({ error: "コンテンツがありません" }, { status: 400 })
    }

    const filename = encodeURIComponent(
      type === "estimate" ? `見積書_${document.client_name}.pdf` : `提案書_${document.client_name}.pdf`
    )

    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename*=UTF-8''${filename}`,
      },
    })
  } catch (err) {
    console.error("PDF error:", err)
    return NextResponse.json({ error: "PDFの生成に失敗しました" }, { status: 500 })
  }
}
