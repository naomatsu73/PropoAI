"use client"

import { Suspense } from "react"
import { useSearchParams } from "next/navigation"
import { GenerateForm } from "@/components/generate/generate-form"

function GeneratePageInner() {
  const params = useSearchParams()
  const type = (params.get("type") || "proposal") as "proposal" | "estimate" | "both"
  return <GenerateForm initialType={type} />
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<div className="p-8 text-gray-500">読み込み中...</div>}>
      <GeneratePageInner />
    </Suspense>
  )
}
