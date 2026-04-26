import type { ProposalContent, Profile } from "@/types"

interface Props {
  content: ProposalContent
  profile: Partial<Profile>
}

export function ProposalPreview({ content, profile }: Props) {
  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden max-w-3xl mx-auto">
      {/* 表紙 */}
      <div className="bg-blue-700 text-white p-10 text-center">
        <p className="text-sm opacity-75 mb-2">{content.date}</p>
        <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
        <p className="text-lg opacity-90">{content.client_name} 御中</p>
        {profile.company_name && (
          <p className="mt-6 text-sm opacity-75">{profile.company_name}</p>
        )}
      </div>

      {/* 本文セクション */}
      <div className="p-8 space-y-8">
        {content.sections.map((section, i) => (
          <section key={i}>
            <h2 className="text-lg font-bold text-blue-700 border-b-2 border-blue-100 pb-2 mb-3">
              {section.title}
            </h2>
            <p className="text-gray-700 leading-relaxed whitespace-pre-wrap text-sm">{section.body}</p>
            {section.items && section.items.length > 0 && (
              <ul className="mt-3 space-y-1">
                {section.items.map((item, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-blue-500 mt-0.5">▶</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      {/* フッター */}
      <div className="border-t border-gray-100 p-6 text-center text-xs text-gray-400">
        {profile.company_name} · {profile.phone || ""} · {profile.address || ""}
      </div>
    </div>
  )
}
