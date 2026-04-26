"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { Document } from "@/types"
import { GenerateForm } from "@/components/generate/generate-form"

export default function GenerateDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [doc, setDoc] = useState<Document | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("documents").select("*").eq("id", id).single()
      setDoc(data as Document)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) return <div className="p-8 text-gray-500">読み込み中...</div>
  if (!doc) return <div className="p-8 text-red-500">書類が見つかりません</div>

  return (
    <GenerateForm
      initialType={doc.type}
      initialFormData={doc.form_data}
      initialProposal={doc.proposal_content}
      initialEstimate={doc.estimate_content}
      documentId={doc.id}
    />
  )
}
