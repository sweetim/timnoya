import { LayoutGrid, Table } from "lucide-react"

export type ViewMode = "card" | "table"

type ViewToggleProps = {
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

export function ViewToggle({ value, onChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-xl bg-white/5 border border-white/5 p-0.5">
      <button
        type="button"
        onClick={() => onChange("card")}
        className={`flex items-center justify-center rounded-lg px-2.5 py-1.5 transition-all duration-200 ${value === "card" ? "bg-white/10 text-white shadow-xs" : "text-slate-500 hover:text-slate-300"}`}
        title="Card view"
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={() => onChange("table")}
        className={`flex items-center justify-center rounded-lg px-2.5 py-1.5 transition-all duration-200 ${value === "table" ? "bg-white/10 text-white shadow-xs" : "text-slate-500 hover:text-slate-300"}`}
        title="Table view"
      >
        <Table className="h-4 w-4" />
      </button>
    </div>
  )
}
