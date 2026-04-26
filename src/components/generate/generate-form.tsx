"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase"
import type { DocumentType, FormData as PropoFormData, ProposalContent, EstimateContent, EstimateItem, Profile } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import { ProposalPreview } from "./proposal-preview"
import { EstimatePreview } from "./estimate-preview"
import { toast } from "sonner"
import { Plus, Trash2, Wand2, RefreshCw, Download, Save } from "lucide-react"

interface Props {
  initialType: DocumentType
  initialFormData?: Partial<PropoFormData>
  initialProposal?: ProposalContent | null
  initialEstimate?: EstimateContent | null
  documentId?: string
}

const today = new Date().toISOString().split("T")[0]

const EMPTY_ITEM: EstimateItem = { name: "", unit_price: 0, quantity: 1, subtotal: 0 }

export function GenerateForm({ initialType, initialFormData, initialProposal, initialEstimate, documentId }: Props) {
  const supabase = createClient()
  const [profile, setProfile] = useState<Partial<Profile>>({})
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [downloading, setDownloading] = useState(false)

  const [form, setForm] = useState<PropoFormData>({
    type: initialType,
    client_name: "",
    project_name: "",
    date: today,
    client_background: "",
    proposal_overview: "",
    delivery_period: "",
    our_strengths: "",
    tone: "formal",
    items: [{ ...EMPTY_ITEM }],
    ai_estimate_mode: false,
    tax_rate: 10,
    rounding: "floor",
    withholding_tax: false,
    payment_terms: "",
    notes: "",
    ...initialFormData,
  })

  const [proposal, setProposal] = useState<ProposalContent | null>(initialProposal || null)
  const [estimate, setEstimate] = useState<EstimateContent | null>(initialEstimate || null)
  const [docId, setDocId] = useState<string | undefined>(documentId)

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single()
      if (data) {
        setProfile(data as Profile)
        if (!initialFormData?.tax_rate) {
          setForm(f => ({ ...f, tax_rate: (data as Profile).default_tax_rate || 10 }))
        }
      }
    }
    loadProfile()
  }, [])

  function setField<K extends keyof PropoFormData>(key: K, value: PropoFormData[K]) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function updateItem(index: number, field: keyof EstimateItem, value: string | number) {
    const items = [...(form.items || [])]
    items[index] = { ...items[index], [field]: value }
    if (field === "unit_price" || field === "quantity") {
      items[index].subtotal = Number(items[index].unit_price) * Number(items[index].quantity)
    }
    setField("items", items)
  }

  function addItem() {
    setField("items", [...(form.items || []), { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    setField("items", (form.items || []).filter((_, i) => i !== index))
  }

  const isValid = Boolean(form.client_name && form.project_name && form.date)

  async function handleGenerate() {
    if (!isValid) return
    setGenerating(true)

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formData: form }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || "生成に失敗しました")
      }

      const data = await res.json()

      if (data.proposal) setProposal(data.proposal)
      if (data.estimate) setEstimate(data.estimate)
      if (data.items) setField("items", data.items)

      // 自動保存
      await saveDocument(data.proposal, data.estimate)
      toast.success("書類を生成しました")
    } catch (err: any) {
      toast.error(err.message || "生成に失敗しました。再度お試しください。")
    } finally {
      setGenerating(false)
    }
  }

  async function saveDocument(proposalData?: ProposalContent, estimateData?: EstimateContent) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const docTitle = proposal?.title || `${form.project_name} - ${form.client_name}`

    if (docId) {
      await supabase.from("documents").update({
        type: form.type,
        title: docTitle,
        client_name: form.client_name,
        form_data: form,
        proposal_content: proposalData || proposal,
        estimate_content: estimateData || estimate,
        status: "completed",
      }).eq("id", docId)
    } else {
      const { data } = await supabase.from("documents").insert({
        user_id: user.id,
        type: form.type,
        title: docTitle,
        client_name: form.client_name,
        form_data: form,
        proposal_content: proposalData || proposal,
        estimate_content: estimateData || estimate,
        status: "completed",
      }).select().single()
      if (data) setDocId((data as any).id)
    }
  }

  async function handleSaveTemplate() {
    setSaving(true)
    const name = prompt("テンプレート名を入力してください")
    if (!name) { setSaving(false); return }

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSaving(false); return }

    const templateData = { ...form, client_name: "", project_name: "", date: today }
    const { error } = await supabase.from("templates").insert({
      user_id: user.id,
      name,
      type: form.type,
      form_data: templateData,
    })
    if (error) {
      toast.error("テンプレートの保存に失敗しました")
    } else {
      toast.success(`テンプレート「${name}」を保存しました`)
    }
    setSaving(false)
  }

  async function handleDownloadPDF(docType: "proposal" | "estimate") {
    if (!docId) { toast.error("先に書類を生成してください"); return }
    setDownloading(true)
    try {
      const res = await fetch(`/api/documents/${docId}/pdf?type=${docType}`, { method: "POST" })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${docType === "proposal" ? "提案書" : "見積書"}_${form.client_name}.pdf`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("PDFのダウンロードに失敗しました")
    } finally {
      setDownloading(false)
    }
  }

  async function handleDownloadPPTX() {
    if (!docId) { toast.error("先に書類を生成してください"); return }
    setDownloading(true)
    try {
      const res = await fetch(`/api/documents/${docId}/pptx`, { method: "POST" })
      if (!res.ok) throw new Error()
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `提案書_${form.client_name}.pptx`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error("PPTXのダウンロードに失敗しました")
    } finally {
      setDownloading(false)
    }
  }

  const hasOutput = Boolean(proposal || estimate)

  return (
    <div className="flex h-[calc(100vh-0px)] overflow-hidden">
      {/* 左: 入力フォーム */}
      <div className="w-[480px] shrink-0 border-r border-gray-200 overflow-y-auto bg-white">
        <div className="p-6 border-b border-gray-100">
          <h1 className="text-xl font-bold text-gray-900">書類生成</h1>
          <p className="text-sm text-gray-500 mt-1">フォームを入力して「生成」ボタンを押してください</p>
        </div>

        <div className="p-6 space-y-6">
          {/* 共通項目 */}
          <section>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">基本情報</h2>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>書類の種類</Label>
                <Select value={form.type} onValueChange={v => setField("type", v as DocumentType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="proposal">提案書</SelectItem>
                    <SelectItem value="estimate">見積書</SelectItem>
                    <SelectItem value="both">提案書＋見積書</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>クライアント名 *</Label>
                <Input
                  required
                  value={form.client_name}
                  onChange={e => setField("client_name", e.target.value)}
                  placeholder="株式会社〇〇"
                />
              </div>
              <div className="space-y-1.5">
                <Label>案件名 *</Label>
                <Input
                  required
                  value={form.project_name}
                  onChange={e => setField("project_name", e.target.value)}
                  placeholder="ECサイトリニューアル"
                />
              </div>
              <div className="space-y-1.5">
                <Label>提出日 *</Label>
                <Input
                  type="date"
                  required
                  value={form.date}
                  onChange={e => setField("date", e.target.value)}
                />
              </div>
            </div>
          </section>

          {/* 提案書項目 */}
          {(form.type === "proposal" || form.type === "both") && (
            <>
              <Separator />
              <section>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">提案書の内容</h2>
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>クライアントの課題・背景 *</Label>
                    <Textarea
                      rows={4}
                      required
                      value={form.client_background}
                      onChange={e => setField("client_background", e.target.value)}
                      placeholder="商談メモをそのまま貼り付けてもOKです"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>提案する内容の概要 *</Label>
                    <Textarea
                      rows={3}
                      required
                      value={form.proposal_overview}
                      onChange={e => setField("proposal_overview", e.target.value)}
                      placeholder="簡潔な箇条書きでもAIが補完します"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>納期 *</Label>
                    <Input
                      value={form.delivery_period}
                      onChange={e => setField("delivery_period", e.target.value)}
                      placeholder="例：2ヶ月 / 2026年7月末"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>自社の強み（任意）</Label>
                    <Textarea
                      rows={2}
                      value={form.our_strengths}
                      onChange={e => setField("our_strengths", e.target.value)}
                      placeholder="提案書に反映されます"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>トーン</Label>
                    <Select value={form.tone} onValueChange={v => setField("tone", v as "formal" | "casual")}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="formal">フォーマル</SelectItem>
                        <SelectItem value="casual">カジュアル</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </>
          )}

          {/* 見積書項目 */}
          {(form.type === "estimate" || form.type === "both") && (
            <>
              <Separator />
              <section>
                <h2 className="text-sm font-semibold text-gray-700 mb-3">見積書の内容</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="rounded"
                        checked={form.ai_estimate_mode}
                        onChange={e => setField("ai_estimate_mode", e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">AIに作業項目を自動推測させる</span>
                    </label>
                  </div>

                  {!form.ai_estimate_mode && (
                    <div className="space-y-2">
                      <Label>作業項目</Label>
                      <div className="space-y-2">
                        {(form.items || []).map((item, i) => (
                          <div key={i} className="grid grid-cols-[1fr_80px_60px_auto] gap-2 items-center">
                            <Input
                              placeholder="作業項目名"
                              value={item.name}
                              onChange={e => updateItem(i, "name", e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="単価"
                              value={item.unit_price || ""}
                              onChange={e => updateItem(i, "unit_price", Number(e.target.value))}
                            />
                            <Input
                              type="number"
                              placeholder="数量"
                              value={item.quantity || ""}
                              onChange={e => updateItem(i, "quantity", Number(e.target.value))}
                            />
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-red-400 hover:text-red-600"
                              onClick={() => removeItem(i)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button variant="outline" size="sm" onClick={addItem} className="gap-2 w-full">
                          <Plus className="h-3.5 w-3.5" />
                          行を追加
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>消費税率</Label>
                      <Select
                        value={String(form.tax_rate)}
                        onValueChange={v => setField("tax_rate", Number(v) as 10 | 8 | 0)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="10">10%</SelectItem>
                          <SelectItem value="8">8%（軽減税率）</SelectItem>
                          <SelectItem value="0">非課税</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>端数処理</Label>
                      <Select value={form.rounding} onValueChange={v => setField("rounding", v as "floor" | "round" | "ceil")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="floor">切り捨て</SelectItem>
                          <SelectItem value="round">四捨五入</SelectItem>
                          <SelectItem value="ceil">切り上げ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="withholding"
                      checked={form.withholding_tax}
                      onChange={e => setField("withholding_tax", e.target.checked)}
                      className="rounded"
                    />
                    <Label htmlFor="withholding" className="cursor-pointer">源泉徴収税を計算する（10.21%）</Label>
                  </div>

                  <div className="space-y-1.5">
                    <Label>支払い期限（任意）</Label>
                    <Input
                      value={form.payment_terms}
                      onChange={e => setField("payment_terms", e.target.value)}
                      placeholder="例：月末締め翌月末払い"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label>備考（任意）</Label>
                    <Textarea
                      rows={2}
                      value={form.notes}
                      onChange={e => setField("notes", e.target.value)}
                    />
                  </div>
                </div>
              </section>
            </>
          )}

          {/* 生成ボタン */}
          <div className="pt-2 space-y-2">
            <Button
              className="w-full gap-2"
              size="lg"
              disabled={!isValid || generating}
              onClick={handleGenerate}
            >
              {generating ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  生成中...
                </>
              ) : (
                <>
                  <Wand2 className="h-4 w-4" />
                  {hasOutput ? "再生成" : "生成する"}
                </>
              )}
            </Button>

            {hasOutput && (
              <Button
                variant="outline"
                className="w-full gap-2"
                disabled={saving}
                onClick={handleSaveTemplate}
              >
                <Save className="h-4 w-4" />
                テンプレートとして保存
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 右: プレビューエリア */}
      <div className="flex-1 overflow-y-auto bg-gray-50">
        {generating ? (
          <div className="p-8 space-y-4">
            <div className="h-8 w-48 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-5/6 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-4/6 bg-gray-200 animate-pulse rounded" />
            <div className="mt-6 h-8 w-40 bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-full bg-gray-200 animate-pulse rounded" />
            <div className="h-4 w-3/4 bg-gray-200 animate-pulse rounded" />
            <p className="text-center text-gray-400 mt-8 text-sm">提案書を生成中...</p>
          </div>
        ) : !hasOutput ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 p-8">
            <Wand2 className="h-16 w-16 mb-4 opacity-20" />
            <p className="text-lg font-medium">左のフォームを入力して生成してください</p>
            <p className="text-sm mt-1">提案書・見積書のプレビューがここに表示されます</p>
          </div>
        ) : (
          <div className="p-6">
            {/* ダウンロードボタン */}
            <div className="flex gap-2 mb-6 flex-wrap">
              {(form.type === "proposal" || form.type === "both") && (
                <>
                  <Button variant="outline" size="sm" className="gap-2" disabled={downloading} onClick={() => handleDownloadPDF("proposal")}>
                    <Download className="h-4 w-4" />
                    提案書 PDF
                  </Button>
                  <Button variant="outline" size="sm" className="gap-2" disabled={downloading} onClick={handleDownloadPPTX}>
                    <Download className="h-4 w-4" />
                    提案書 PPTX
                  </Button>
                </>
              )}
              {(form.type === "estimate" || form.type === "both") && (
                <Button variant="outline" size="sm" className="gap-2" disabled={downloading} onClick={() => handleDownloadPDF("estimate")}>
                  <Download className="h-4 w-4" />
                  見積書 PDF
                </Button>
              )}
            </div>

            {/* プレビュータブ */}
            {form.type === "both" ? (
              <Tabs defaultValue="proposal">
                <TabsList className="mb-4">
                  <TabsTrigger value="proposal">提案書</TabsTrigger>
                  <TabsTrigger value="estimate">見積書</TabsTrigger>
                </TabsList>
                <TabsContent value="proposal">
                  {proposal && <ProposalPreview content={proposal} profile={profile} />}
                </TabsContent>
                <TabsContent value="estimate">
                  {estimate && <EstimatePreview content={estimate} profile={profile} />}
                </TabsContent>
              </Tabs>
            ) : form.type === "proposal" && proposal ? (
              <ProposalPreview content={proposal} profile={profile} />
            ) : form.type === "estimate" && estimate ? (
              <EstimatePreview content={estimate} profile={profile} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}
