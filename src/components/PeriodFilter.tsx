import { addMonths, monthEnd, monthKey, monthStart, todayISO } from '../lib/dates'
import type { Period } from '../types'
import { cx } from './ui'

export type PeriodPreset = 'month' | 'last-month' | '3-months' | 'year' | 'custom'

export interface PeriodState {
  preset: PeriodPreset
  period: Period
}

export function presetPeriod(preset: Exclude<PeriodPreset, 'custom'>): Period {
  const month = monthKey(todayISO())
  switch (preset) {
    case 'month':
      return { from: monthStart(month), to: monthEnd(month) }
    case 'last-month': {
      const m = addMonths(month, -1)
      return { from: monthStart(m), to: monthEnd(m) }
    }
    case '3-months':
      return { from: monthStart(addMonths(month, -2)), to: monthEnd(month) }
    case 'year':
      return { from: `${month.slice(0, 4)}-01-01`, to: `${month.slice(0, 4)}-12-31` }
  }
}

export const defaultPeriodState = (): PeriodState => ({ preset: 'month', period: presetPeriod('month') })

const PRESETS: Array<{ id: PeriodPreset; label: string }> = [
  { id: 'month', label: 'Mês atual' },
  { id: 'last-month', label: 'Mês passado' },
  { id: '3-months', label: '3 meses' },
  { id: 'year', label: 'Este ano' },
  { id: 'custom', label: 'Personalizado' },
]

export default function PeriodFilter({ value, onChange }: { value: PeriodState; onChange: (v: PeriodState) => void }) {
  const { preset, period } = value
  return (
    // No celular os botões ficam em uma linha só, que rola para o lado, em vez de quebrar em duas.
    <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0 [&::-webkit-scrollbar]:hidden" role="group" aria-label="Período">
      {PRESETS.map((p) => {
        const active = preset === p.id
        return (
          <button
            key={p.id}
            type="button"
            aria-pressed={active}
            onClick={() => onChange({ preset: p.id, period: p.id === 'custom' ? period : presetPeriod(p.id) })}
            className={cx(
              'h-9 shrink-0 whitespace-nowrap rounded-full border px-4 text-sm transition',
              active ? 'border-accent bg-accent/15 text-accent' : 'border-line bg-card text-neutral-400 hover:border-neutral-600 hover:text-neutral-100',
            )}
          >
            {p.label}
          </button>
        )
      })}
      {preset === 'custom' && (
        <>
          <input
            type="date"
            aria-label="Data inicial"
            className="field h-9 w-auto shrink-0 bg-card"
            value={period.from}
            max={period.to}
            onChange={(e) => e.target.value && onChange({ preset, period: { ...period, from: e.target.value } })}
          />
          <span className="shrink-0 text-xs text-neutral-500">até</span>
          <input
            type="date"
            aria-label="Data final"
            className="field h-9 w-auto shrink-0 bg-card"
            value={period.to}
            min={period.from}
            onChange={(e) => e.target.value && onChange({ preset, period: { ...period, to: e.target.value } })}
          />
        </>
      )}
    </div>
  )
}
