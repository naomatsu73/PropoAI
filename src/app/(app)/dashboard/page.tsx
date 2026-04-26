"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase"
import type { Document, DocumentType } from "@/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Plus, FileText, Download, Copy, Trash2, Search } from "lucide-react"
import { toast } from "sonner"

const TYPE_LABELS: Record<DocumentType, string> = {
  proposal: "提案書",
  estimate: "見積書",
  both: "提案書＋見積書",
}

const TYPE_COLORS: Record<DocumentType, string> = {
  proposal: "bg-blue-100 text-blue-700",
  estimate: "bg-green-100 text-green-700",
  both: "bg-purple-100 text-purple-700",
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [documents, setDocuments] = useState<Document[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [showNewModal, setShowNewModal] = useState(false)

  useEffect(() => {
    fetchDocuments()
  }, [])

  async function fetchDocuments() {
    const { data } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false })
    setDocuments((data as Document[]) || [])
    setLoading(false)
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("documents").delete().eq("id", id)
    if (error) {
      toast.error("削除に失敗しました")
    } else {
      toast.success("書類を削除しました")
      setDocuments(docs => docs.filter(d => d.id !== id))
    }
  }

  async function handleDuplicate(doc: Document) {
    const { data, error } = await supabase
      .from("documents")
      .insert({
        type: doc.type,
        title: `${doc.title}（コピー）`,
        client_name: doc.client_name,
        form_data: doc.form_data,
        proposal_content: doc.proposal_content,
        estimate_content: doc.estimate_content,
        status: doc.status,
      })
      .select()
      .single()
    if (error) {
      toast.error("複製に失敗しました")
    } else {
      toast.success("書類を複製しました")
      setDocuments(docs => [data as Document, ...docs])
    }
  }

  const filtered = documents.filter(
    d =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.client_name.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">ダッシュボード</h1>
          <p className="text-gray-500 mt-1">作成した書類の一覧</p>
        </div>
        <Button onClick={() => setShowNewModal(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新規作成
        </Button>
      </div>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="書類名・クライアント名で検索..."
          className="pl-10"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="grid gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-lg border border-gray-200 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p className="text-lg font-medium">書類がありません</p>
          <p className="text-sm mt-1">「新規作成」から提案書・見積書を作成してください</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {filtered.map(doc => (
            <div
              key={doc.id}
              className="bg-white rounded-lg border border-gray-200 p-5 flex items-center gap-4 hover:border-blue-200 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[doc.type]}`}>
                    {TYPE_LABELS[doc.type]}
                  </span>
                </div>
                <Link
                  href={`/generate/${doc.id}`}
                  className="text-base font-semibold text-gray-900 hover:text-blue-600 truncate block"
                >
                  {doc.title}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">
                  {doc.client_name} · {new Date(doc.created_at).toLocaleDateString("ja-JP")}
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <Link
                  href={`/generate/${doc.id}`}
                  className="inline-flex items-center justify-center px-3 py-1.5 text-sm font-medium rounded-md text-gray-600 hover:bg-gray-100 hover:text-gray-900 transition-colors"
                >
                  プレビュー
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDuplicate(doc)}
                  title="複製"
                >
                  <Copy className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleDelete(doc.id)}
                  title="削除"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={showNewModal} onOpenChange={setShowNewModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>書類の種類を選択</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 mt-2">
            {(["proposal", "estimate", "both"] as DocumentType[]).map(type => (
              <Button
                key={type}
                variant="outline"
                className="h-16 text-base justify-start px-6"
                onClick={() => {
                  router.push(`/generate?type=${type}`)
                  setShowNewModal(false)
                }}
              >
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full mr-3 ${TYPE_COLORS[type]}`}>
                  {TYPE_LABELS[type]}
                </span>
                {type === "proposal" && "提案書を作成する"}
                {type === "estimate" && "見積書を作成する"}
                {type === "both" && "提案書＋見積書をセットで作成する"}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
