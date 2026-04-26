import PptxGenJS from "pptxgenjs"
import type { ProposalContent, Profile } from "@/types"

export async function generateProposalPPTX(content: ProposalContent, profile: Partial<Profile>): Promise<Buffer> {
  const pptx = new PptxGenJS()
  pptx.layout = "LAYOUT_16x9"
  pptx.author = profile.company_name || "PropoAI"
  pptx.title = content.title

  const BLUE = "1d4ed8"
  const WHITE = "FFFFFF"
  const GRAY = "6b7280"
  const LIGHT_BLUE = "eff6ff"

  // 表紙スライド
  const cover = pptx.addSlide()
  cover.background = { color: BLUE }
  cover.addText(content.client_name + " 御中", {
    x: 0.5, y: 1.5, w: 9, h: 0.6,
    fontSize: 16, color: "rgba(255,255,255,0.8)", align: "center",
  })
  cover.addText(content.title, {
    x: 0.5, y: 2.2, w: 9, h: 1.5,
    fontSize: 32, color: WHITE, bold: true, align: "center",
  })
  cover.addText(content.date, {
    x: 0.5, y: 4.2, w: 9, h: 0.4,
    fontSize: 12, color: "rgba(255,255,255,0.7)", align: "center",
  })
  if (profile.company_name) {
    cover.addText(profile.company_name, {
      x: 0.5, y: 4.8, w: 9, h: 0.4,
      fontSize: 12, color: "rgba(255,255,255,0.7)", align: "center",
    })
  }

  // 各セクションをスライドに
  for (const section of content.sections) {
    const slide = pptx.addSlide()

    // セクションタイトル
    slide.addShape(pptx.ShapeType.rect, {
      x: 0, y: 0, w: 10, h: 1.1, fill: { color: BLUE },
    })
    slide.addText(section.title, {
      x: 0.5, y: 0.15, w: 9, h: 0.8,
      fontSize: 20, color: WHITE, bold: true,
    })

    // 本文
    const bodyText = section.body
    slide.addText(bodyText, {
      x: 0.5, y: 1.3, w: 9, h: 2.8,
      fontSize: 12, color: "111827", lineSpacingMultiple: 1.5,
      valign: "top",
    })

    // 箇条書き
    if (section.items && section.items.length > 0) {
      const bulletText = section.items.map(item => ({ text: item, options: { bullet: { type: "bullet" as const } } }))
      slide.addText(bulletText, {
        x: 0.5, y: 4.2, w: 9, h: 2.0,
        fontSize: 11, color: "374151",
      })
    }

    // フッター
    slide.addText(profile.company_name || "", {
      x: 0, y: 6.8, w: 10, h: 0.3,
      fontSize: 8, color: GRAY, align: "right",
    })
  }

  const buffer = await pptx.write({ outputType: "nodebuffer" }) as Buffer
  return buffer
}
