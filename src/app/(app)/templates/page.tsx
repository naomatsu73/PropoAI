"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { Template, DocumentType } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { BookTemplate, Trash2, Play } from "lucide-react"
import { toast } from "sonner"

const TYPE_LABELS: Record<DocumentType, string> = {
  proposal: "提案書",
  estimate: "見積書",
  both: "提案書＋見積書",
}

export default function TemplatesPage() {
  const router = useRouter()
  const supabase = createClient()
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("templates")
        .select("*")
        .order("created_at", { ascending: false })
      setTemplates((data as Template[]) || [])
      setLoading(false)
    }
    load()
  }, [])

  async function handleDelete(id: string) {
    const { error } = await supabase.from("templates").delete().eq("id", id)
    if (error) {
      toast.error("削除に失敗しました")
    } else {
      toast.success("テンプレートを削除しました")
      setTemplates(ts => ts.filter(t => t.id !== id))
    }
  }

  function handleUse(template: Template) {
    const params = new URLSearchParams({
      type: template.type,
      template: template.id,
    })
    router.push(`/generate?${params}`)
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">テンプレート</h1>
        <p className="text-gray-500 mt-1">保存済みのフォーム雛形を再利用できます</p>
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-white rounded-lg border animate-pulse" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookTemplate className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">テンプレートがありません</p>
          <p className="text-sm mt-1">書類生成画面で「テンプレートとして保存」をクリックすると保存されます</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {templates.map(template => (
            <div
              key={template.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                    {TYPE_LABELS[template.type]}
                  </span>
                </div>
                <p className="font-semibold text-gray-900">{template.name}</p>
                <p className="text-sm text-gray-400 mt-0.5">
                  作成日: {new Date(template.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="gap-2"
                  onClick={() => handleUse(template)}
                >
                  <Play className="h-4 w-4" />
                  このテンプレートを使う
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => handleDelete(template.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
