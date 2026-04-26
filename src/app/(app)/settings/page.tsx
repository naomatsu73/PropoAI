"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase"
import type { Profile } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { validateInvoiceNumber } from "@/lib/tax"
import { AlertCircle } from "lucide-react"

export default function SettingsPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<Partial<Profile>>({
    default_tax_rate: 10,
    default_rounding: "floor",
    bank_account_type: "普通",
  })
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) setEmail(user.email || "")

      const { data } = await supabase.from("profiles").select("*").eq("id", user?.id || "").single()
      if (data) setProfile(data as Profile)
      setLoading(false)
    }
    load()
  }, [])

  function setField<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile(p => ({ ...p, [key]: value }))
  }

  async function handleSave() {
    setSaving(true)
    const res = await fetch("/api/profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile),
    })
    if (res.ok) {
      toast.success("設定を保存しました")
    } else {
      toast.error("保存に失敗しました")
    }
    setSaving(false)
  }

  async function handleChangePassword() {
    if (!newPassword || newPassword.length < 6) {
      toast.error("パスワードは6文字以上で入力してください")
      return
    }
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    if (error) {
      toast.error("パスワードの変更に失敗しました")
    } else {
      toast.success("パスワードを変更しました")
      setNewPassword("")
    }
  }

  const invoiceValid = !profile.invoice_number || validateInvoiceNumber(profile.invoice_number)

  if (loading) return <div className="p-8 text-gray-500">読み込み中...</div>

  return (
    <div className="p-8 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">設定</h1>
        <p className="text-gray-500 mt-1">会社情報・税情報・振込先を設定します</p>
      </div>

      <Tabs defaultValue="company">
        <TabsList className="mb-6">
          <TabsTrigger value="company">会社情報</TabsTrigger>
          <TabsTrigger value="tax">税情報</TabsTrigger>
          <TabsTrigger value="bank">振込先</TabsTrigger>
          <TabsTrigger value="account">アカウント</TabsTrigger>
        </TabsList>

        {/* 会社情報 */}
        <TabsContent value="company">
          <Card>
            <CardHeader>
              <CardTitle>会社情報</CardTitle>
              <CardDescription>提案書・見積書に自動反映されます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>氏名</Label>
                <Input
                  value={profile.full_name || ""}
                  onChange={e => setField("full_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>会社名・屋号</Label>
                <Input
                  value={profile.company_name || ""}
                  onChange={e => setField("company_name", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>住所</Label>
                <Input
                  value={profile.address || ""}
                  onChange={e => setField("address", e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>電話番号</Label>
                <Input
                  value={profile.phone || ""}
                  onChange={e => setField("phone", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 税情報 */}
        <TabsContent value="tax">
          <Card>
            <CardHeader>
              <CardTitle>税情報</CardTitle>
              <CardDescription>見積書生成時のデフォルト値として使用されます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>インボイス登録番号</Label>
                <Input
                  value={profile.invoice_number || ""}
                  onChange={e => setField("invoice_number", e.target.value)}
                  placeholder="T1234567890123"
                  className={!invoiceValid ? "border-red-400" : ""}
                />
                {!invoiceValid && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    T + 13桁の数字で入力してください
                  </p>
                )}
                {!profile.invoice_number && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" />
                    未設定の場合、見積書にインボイス番号が記載されません
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>デフォルト消費税率</Label>
                  <Select
                    value={String(profile.default_tax_rate || 10)}
                    onValueChange={v => setField("default_tax_rate", Number(v) as 10 | 8 | 0)}
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
                  <Label>デフォルト端数処理</Label>
                  <Select
                    value={profile.default_rounding || "floor"}
                    onValueChange={v => setField("default_rounding", v as "floor" | "round" | "ceil")}
                  >
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* 振込先 */}
        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>振込先情報</CardTitle>
              <CardDescription>見積書の下部に自動表示されます</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>銀行名</Label>
                  <Input
                    value={profile.bank_name || ""}
                    onChange={e => setField("bank_name", e.target.value)}
                    placeholder="〇〇銀行"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>支店名</Label>
                  <Input
                    value={profile.bank_branch || ""}
                    onChange={e => setField("bank_branch", e.target.value)}
                    placeholder="〇〇支店"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>口座種別</Label>
                  <Select
                    value={profile.bank_account_type || "普通"}
                    onValueChange={v => setField("bank_account_type", v as "普通" | "当座")}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="普通">普通</SelectItem>
                      <SelectItem value="当座">当座</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>口座番号</Label>
                  <Input
                    value={profile.bank_account_number || ""}
                    onChange={e => setField("bank_account_number", e.target.value)}
                    placeholder="1234567"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>口座名義（カナ）</Label>
                <Input
                  value={profile.bank_account_holder || ""}
                  onChange={e => setField("bank_account_holder", e.target.value)}
                  placeholder="ヤマダ タロウ"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* アカウント */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>アカウント設定</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1.5">
                <Label>メールアドレス</Label>
                <Input value={email} disabled className="bg-gray-50 text-gray-500" />
              </div>
              <Separator />
              <div className="space-y-1.5">
                <Label>新しいパスワード</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="6文字以上"
                />
              </div>
              <Button
                variant="outline"
                onClick={handleChangePassword}
                disabled={!newPassword}
              >
                パスワードを変更
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="mt-6">
        <Button onClick={handleSave} disabled={saving || !invoiceValid} size="lg">
          {saving ? "保存中..." : "設定を保存"}
        </Button>
      </div>
    </div>
  )
}
