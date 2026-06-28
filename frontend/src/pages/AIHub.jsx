import { useMemo, useState } from 'react'
import {
  HiBeaker,
  HiChartBar,
  HiClipboardCheck,
  HiCloudUpload,
  HiCode,
  HiCollection,
  HiDocumentSearch,
  HiLightningBolt,
  HiLink,
  HiOutlineBell,
  HiOutlineShare,
  HiSearchCircle,
  HiShieldCheck,
  HiSparkles,
} from 'react-icons/hi'
import AIFeatureTool from '../components/AIFeatureTool'
import { aiFeatureCatalog } from '../config/aiFeatureCatalog'

const iconMap = {
  beaker: HiBeaker,
  bell: HiOutlineBell,
  chart: HiChartBar,
  clipboard: HiClipboardCheck,
  cloud: HiCloudUpload,
  code: HiCode,
  collection: HiCollection,
  document: HiDocumentSearch,
  lightning: HiLightningBolt,
  link: HiLink,
  search: HiSearchCircle,
  share: HiOutlineShare,
  shield: HiShieldCheck,
  sparkles: HiSparkles,
  clock: HiClipboardCheck,
}

export default function AIHub() {
  const [selectedPath, setSelectedPath] = useState(aiFeatureCatalog[0]?.path)
  const selectedFeature = aiFeatureCatalog.find((feature) => feature.path === selectedPath) || aiFeatureCatalog[0]
  const categories = useMemo(() => [...new Set(aiFeatureCatalog.map((feature) => feature.category))], [])
  const customCount = aiFeatureCatalog.filter((feature) => feature.type === 'Custom AI').length
  const gapCount = aiFeatureCatalog.length - customCount

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-600">AI Hub</p>
          <h1 className="mt-1 text-3xl font-bold text-gray-900">RAG AI Workbench</h1>
          <p className="mt-2 max-w-3xl text-gray-500">
            Select a RAG capability, choose a content-specific task button, adjust the prompt if needed, and run the analysis from one workspace.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="card min-w-[120px] p-4 text-center">
            <p className="text-2xl font-bold text-indigo-600">{aiFeatureCatalog.length}</p>
            <p className="text-xs text-gray-500">AI tools</p>
          </div>
          <div className="card min-w-[120px] p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{customCount}</p>
            <p className="text-xs text-gray-500">Custom</p>
          </div>
          <div className="card min-w-[120px] p-4 text-center">
            <p className="text-2xl font-bold text-amber-600">{gapCount}</p>
            <p className="text-xs text-gray-500">Gap tools</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[360px_1fr]">
        <aside className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">AI capabilities</h2>
          <div className="space-y-5">
            {categories.map((category) => (
              <div key={category}>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-gray-400">{category}</p>
                <div className="space-y-2">
                  {aiFeatureCatalog
                    .filter((feature) => feature.category === category)
                    .map((feature) => {
                      const Icon = iconMap[feature.icon] || HiSparkles
                      const active = selectedFeature?.path === feature.path
                      return (
                        <button
                          key={feature.path}
                          type="button"
                          onClick={() => setSelectedPath(feature.path)}
                          className={`w-full rounded-xl border p-3 text-left transition ${
                            active
                              ? 'border-indigo-300 bg-indigo-50 shadow-sm'
                              : 'border-gray-200 bg-gray-50 hover:border-indigo-200 hover:bg-white'
                          }`}
                        >
                          <div className="flex gap-3">
                            <span className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg ${
                              active ? 'bg-indigo-600 text-white' : 'bg-white text-indigo-600'
                            }`}>
                              <Icon className="h-5 w-5" />
                            </span>
                            <span>
                              <span className="block text-sm font-semibold text-gray-900">{feature.title}</span>
                              <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-gray-500">{feature.description}</span>
                            </span>
                          </div>
                        </button>
                      )
                    })}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <main>
          <AIFeatureTool key={selectedFeature?.path} feature={selectedFeature} embedded />
        </main>
      </div>
    </div>
  )
}
