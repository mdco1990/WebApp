import React from 'react'
import { useToast } from '../shared/toast'

export interface SourceItem {
  id?: number
  name: string
  amount_cents: number
}

interface Props {
  title?: string
  helpText?: string
  sources: SourceItem[]
  isDarkMode: boolean
  parseLocaleAmount: (v: string) => number
  onUpdate: (index: number, next: SourceItem) => void
  onBlurSave: (index: number) => void
  onRemoveUnsaved: (index: number) => void
  onDeletePersisted: (id: number) => Promise<void>
  onAddEmpty: () => void
  addButtonText?: string
}

const IncomeSources: React.FC<Props> = ({
  title = 'Income Sources',
  helpText,
  sources,
  isDarkMode,
  parseLocaleAmount,
  onUpdate,
  onBlurSave,
  onRemoveUnsaved,
  onDeletePersisted,
  onAddEmpty,
  addButtonText = '+ Add Income Source',
}) => {
  const { push } = useToast()
  return (
    <div className="col-lg-6 mb-4">
      <h5>{title}</h5>
      {helpText ? <p className="text-muted small mb-3">{helpText}</p> : null}
      <div className="row g-2">
        {sources.map((source, index) => (
          <div key={source.id || index} className="col-12">
            <div className="row g-2">
              <div className="col-sm-6 col-12">
                <input
                  type="text"
                  className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                  value={source.name}
                  placeholder="Source name"
                  onChange={(e) => onUpdate(index, { ...source, name: e.target.value })}
                  onBlur={() => onBlurSave(index)}
                />
              </div>
              <div className="col-sm-4 col-8">
                <input
                  type="number"
                  className={`form-control form-control-sm ${isDarkMode ? 'bg-dark text-light border-secondary' : ''}`}
                  value={source.amount_cents / 100}
                  onChange={(e) => onUpdate(index, { ...source, amount_cents: Math.round(parseLocaleAmount(e.target.value || '0') * 100) })}
                  onBlur={() => onBlurSave(index)}
                  inputMode="decimal" step="0.01"
                />
              </div>
              <div className="col-sm-2 col-4">
                <button
                  className="btn btn-sm btn-outline-danger w-100"
                  onClick={async () => {
                    if (!source.id) {
                      onRemoveUnsaved(index)
                      return
                    }
                    try {
                      await onDeletePersisted(source.id)
                    } catch (err) {
                      console.error('Delete failed', err)
                      push('Failed to delete. Please try again.', 'error')
                    }
                  }}
                  title="Delete this source"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
      <button className="btn btn-sm btn-outline-primary mt-2" onClick={onAddEmpty}>
        {addButtonText}
      </button>
    </div>
  )
}

export default IncomeSources
