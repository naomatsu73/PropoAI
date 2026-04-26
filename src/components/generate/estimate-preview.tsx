import type { EstimateContent, Profile } from "@/types"
import { formatCurrency } from "@/lib/tax"

interface Props {
  content: EstimateContent
  profile: Partial<Profile>
}

export function EstimatePreview({ content, profile }: Props) {
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden max-w-3xl mx-auto">
      <div className="p-8">
        {/* ヘッダー */}
        <div className="flex justify-between items-start mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">見積書</h1>
            <p className="text-sm text-gray-500 mt-1">発行日: {content.date}</p>
            {content.invoice_number && (
              <p className="text-xs text-gray-400 mt-0.5">登録番号: {content.invoice_number}</p>
            )}
          </div>
          <div className="text-right">
            {profile.company_name && (
              <p className="font-semibold text-gray-900">{profile.company_name}</p>
            )}
            {profile.address && <p className="text-sm text-gray-500">{profile.address}</p>}
            {profile.phone && <p className="text-sm text-gray-500">{profile.phone}</p>}
          </div>
        </div>

        {/* 宛先 */}
        <div className="mb-8">
          <p className="text-lg font-semibold text-gray-900">{content.client_name} 御中</p>
          <p className="text-sm text-gray-500 mt-1">件名: {content.title}</p>
        </div>

        {/* 合計金額 */}
        <div className="bg-blue-50 rounded-lg p-4 mb-6 text-right">
          <p className="text-sm text-gray-500">合計金額（税込）</p>
          <p className="text-3xl font-bold text-blue-700">{formatCurrency(content.total)}</p>
        </div>

        {/* 明細テーブル */}
        <table className="w-full text-sm mb-6">
          <thead>
            <tr className="border-b-2 border-gray-200">
              <th className="text-left py-2 font-semibold text-gray-700">項目</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-28">単価</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-16">数量</th>
              <th className="text-right py-2 font-semibold text-gray-700 w-32">小計</th>
            </tr>
          </thead>
          <tbody>
            {content.items.map((item, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-3 text-gray-800">{item.name}</td>
                <td className="py-3 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                <td className="py-3 text-right text-gray-600">{item.quantity}</td>
                <td className="py-3 text-right font-medium text-gray-800">{formatCurrency(item.subtotal)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* 合計計算 */}
        <div className="ml-auto w-64 space-y-2 text-sm">
          <div className="flex justify-between text-gray-600">
            <span>小計</span>
            <span>{formatCurrency(content.subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-600">
            <span>消費税（{content.tax_rate}%）</span>
            <span>{formatCurrency(content.tax_amount)}</span>
          </div>
          {content.withholding_tax_amount > 0 && (
            <div className="flex justify-between text-gray-600">
              <span>源泉徴収税（-10.21%）</span>
              <span>-{formatCurrency(content.withholding_tax_amount)}</span>
            </div>
          )}
          <div className="flex justify-between font-bold text-base border-t border-gray-200 pt-2 text-gray-900">
            <span>合計</span>
            <span>{formatCurrency(content.total)}</span>
          </div>
        </div>

        {/* 備考 */}
        {(content.payment_terms || content.notes) && (
          <div className="mt-8 pt-6 border-t border-gray-100 space-y-2 text-sm text-gray-600">
            {content.payment_terms && <p>支払い条件: {content.payment_terms}</p>}
            {content.notes && <p className="whitespace-pre-wrap">{content.notes}</p>}
          </div>
        )}

        {/* 振込先 */}
        {profile.bank_name && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">振込先</p>
            <p className="text-sm text-gray-600">
              {profile.bank_name} {profile.bank_branch} {profile.bank_account_type}
              {profile.bank_account_number} {profile.bank_account_holder}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
