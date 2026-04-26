import { Document, Page, Text, View, StyleSheet, pdf, Font } from "@react-pdf/renderer"
import React from "react"
import type { ProposalContent, EstimateContent, Profile } from "@/types"
import { formatCurrency } from "./tax"

const styles = StyleSheet.create({
  page: { padding: 48, fontFamily: "Helvetica", fontSize: 10, color: "#333" },
  coverPage: { padding: 0, backgroundColor: "#1d4ed8" },
  coverContent: { flex: 1, padding: 60, justifyContent: "center", alignItems: "center" },
  coverTitle: { fontSize: 24, color: "white", fontWeight: "bold", textAlign: "center", marginBottom: 16 },
  coverClient: { fontSize: 14, color: "rgba(255,255,255,0.85)", textAlign: "center" },
  coverDate: { fontSize: 10, color: "rgba(255,255,255,0.7)", textAlign: "center", marginBottom: 12 },
  coverCompany: { fontSize: 10, color: "rgba(255,255,255,0.7)", textAlign: "center", marginTop: 40 },
  sectionTitle: { fontSize: 13, fontWeight: "bold", color: "#1d4ed8", marginBottom: 8, paddingBottom: 4, borderBottom: "2 solid #dbeafe" },
  body: { lineHeight: 1.7, marginBottom: 6 },
  item: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3 },
  bullet: { color: "#60a5fa", marginRight: 6, width: 10 },
  section: { marginBottom: 24 },
  tableHeader: { flexDirection: "row", borderBottom: "2 solid #e5e7eb", paddingBottom: 6, marginBottom: 6, fontWeight: "bold", color: "#4b5563" },
  tableRow: { flexDirection: "row", borderBottom: "1 solid #f3f4f6", paddingVertical: 5 },
  colName: { flex: 1 },
  colNum: { width: 80, textAlign: "right" },
  colQty: { width: 40, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 4, paddingTop: 4 },
  totalLabel: { width: 120, textAlign: "right", color: "#6b7280" },
  totalValue: { width: 100, textAlign: "right" },
  grandTotal: { fontWeight: "bold", fontSize: 12, color: "#1d4ed8", borderTop: "2 solid #e5e7eb", marginTop: 4, paddingTop: 6 },
  h1: { fontSize: 22, fontWeight: "bold", marginBottom: 8, color: "#111827" },
  meta: { fontSize: 9, color: "#9ca3af", marginBottom: 4 },
  highlight: { backgroundColor: "#eff6ff", padding: 12, borderRadius: 6, marginBottom: 16 },
  highlightAmount: { fontSize: 20, fontWeight: "bold", color: "#1d4ed8", textAlign: "right" },
  highlightLabel: { fontSize: 9, color: "#6b7280", textAlign: "right", marginBottom: 4 },
  infoRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  addressBlock: { textAlign: "right", color: "#6b7280" },
})

export async function generateProposalPDF(content: ProposalContent, profile: Partial<Profile>): Promise<Buffer> {
  const doc = React.createElement(
    Document,
    null,
    // 表紙
    React.createElement(
      Page,
      { size: "A4", style: styles.coverPage },
      React.createElement(
        View,
        { style: styles.coverContent },
        React.createElement(Text, { style: styles.coverDate }, content.date),
        React.createElement(Text, { style: styles.coverTitle }, content.title),
        React.createElement(Text, { style: styles.coverClient }, `${content.client_name} 御中`),
        profile.company_name
          ? React.createElement(Text, { style: styles.coverCompany }, profile.company_name)
          : null
      )
    ),
    // 本文ページ
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      ...content.sections.map(section =>
        React.createElement(
          View,
          { style: styles.section, key: section.title },
          React.createElement(Text, { style: styles.sectionTitle }, section.title),
          React.createElement(Text, { style: styles.body }, section.body),
          ...(section.items || []).map((item, i) =>
            React.createElement(
              View,
              { style: styles.item, key: i },
              React.createElement(Text, { style: styles.bullet }, "▶"),
              React.createElement(Text, { style: { flex: 1 } }, item)
            )
          )
        )
      )
    )
  )

  const instance = pdf(doc)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}

export async function generateEstimatePDF(content: EstimateContent, profile: Partial<Profile>): Promise<Buffer> {
  const doc = React.createElement(
    Document,
    null,
    React.createElement(
      Page,
      { size: "A4", style: styles.page },
      React.createElement(Text, { style: styles.h1 }, "見 積 書"),
      React.createElement(
        View,
        { style: styles.infoRow },
        React.createElement(
          View,
          null,
          React.createElement(Text, { style: { fontSize: 12, fontWeight: "bold" } }, `${content.client_name} 御中`),
          React.createElement(Text, { style: styles.meta }, `件名: ${content.title}`),
          content.invoice_number
            ? React.createElement(Text, { style: styles.meta }, `登録番号: ${content.invoice_number}`)
            : null
        ),
        React.createElement(
          View,
          { style: styles.addressBlock },
          React.createElement(Text, { style: { fontWeight: "bold" } }, profile.company_name || ""),
          React.createElement(Text, { style: styles.meta }, profile.address || ""),
          React.createElement(Text, { style: styles.meta }, profile.phone || ""),
          React.createElement(Text, { style: styles.meta }, `発行日: ${content.date}`)
        )
      ),
      React.createElement(
        View,
        { style: styles.highlight },
        React.createElement(Text, { style: styles.highlightLabel }, "合計金額（税込）"),
        React.createElement(Text, { style: styles.highlightAmount }, formatCurrency(content.total))
      ),
      React.createElement(
        View,
        { style: styles.tableHeader },
        React.createElement(Text, { style: styles.colName }, "項目"),
        React.createElement(Text, { style: styles.colNum }, "単価"),
        React.createElement(Text, { style: styles.colQty }, "数量"),
        React.createElement(Text, { style: styles.colNum }, "小計")
      ),
      ...content.items.map((item, i) =>
        React.createElement(
          View,
          { style: styles.tableRow, key: i },
          React.createElement(Text, { style: styles.colName }, item.name),
          React.createElement(Text, { style: styles.colNum }, formatCurrency(item.unit_price)),
          React.createElement(Text, { style: styles.colQty }, String(item.quantity)),
          React.createElement(Text, { style: styles.colNum }, formatCurrency(item.subtotal))
        )
      ),
      React.createElement(
        View,
        { style: { marginTop: 12 } },
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, "小計"),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(content.subtotal))
        ),
        React.createElement(
          View,
          { style: styles.totalRow },
          React.createElement(Text, { style: styles.totalLabel }, `消費税（${content.tax_rate}%）`),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(content.tax_amount))
        ),
        content.withholding_tax_amount > 0
          ? React.createElement(
              View,
              { style: styles.totalRow },
              React.createElement(Text, { style: styles.totalLabel }, "源泉徴収税"),
              React.createElement(Text, { style: styles.totalValue }, `-${formatCurrency(content.withholding_tax_amount)}`)
            )
          : null,
        React.createElement(
          View,
          { style: [styles.totalRow, styles.grandTotal] },
          React.createElement(Text, { style: styles.totalLabel }, "合計"),
          React.createElement(Text, { style: styles.totalValue }, formatCurrency(content.total))
        )
      ),
      content.payment_terms || content.notes
        ? React.createElement(
            View,
            { style: { marginTop: 24, borderTop: "1 solid #e5e7eb", paddingTop: 12 } },
            content.payment_terms
              ? React.createElement(Text, { style: styles.meta }, `支払い条件: ${content.payment_terms}`)
              : null,
            content.notes
              ? React.createElement(Text, { style: styles.meta }, content.notes)
              : null
          )
        : null
    )
  )

  const instance = pdf(doc)
  const blob = await instance.toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return Buffer.from(arrayBuffer)
}
