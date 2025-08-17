import React from 'react';

// Lightweight sub components to reduce App complexity
export type PageHeaderProps = { title: string; loading: boolean; HeaderControlsComp: React.ReactNode };

export const PageHeader: React.FC<PageHeaderProps> = ({ title, loading, HeaderControlsComp }) => (
  <div className="page-header d-print-none">
    <div className="container-xl">
      <div className="row g-2 align-items-center">
        <div className="col">
          <div className="page-pretitle">Personal Finance</div>
          <h5 className="page-title d-flex align-items-center gap-2">
            {title}
            {loading && (
              <span
                className="spinner-border spinner-border-sm text-light"
                aria-live="polite"
                aria-label="Loading"
              ></span>
            )}
          </h5>
        </div>
        <div className="col-auto ms-auto d-print-none">{HeaderControlsComp}</div>
      </div>
    </div>
  </div>
);

export interface SectionTabsProps {
  active: string;
  t: (k: string, opts?: Record<string, unknown>) => string;
}

export const SectionTabs: React.FC<SectionTabsProps> = ({ active, t }) => (
  <div className="page-header-tabs">
    <div className="container-xl">
      <ul className="nav nav-tabs nav-pills nav-fill" aria-label="Sections">
        {['planning', 'tracking', 'savings', 'analytics'].map((id) => (
          <li key={id} className="nav-item">
            <a
              href={`#${id}`}
              className={`nav-link ${active === id ? 'active' : ''}`}
              aria-current={active === id ? 'page' : undefined}
            >
              {t(`nav.${id}`, { defaultValue: id.charAt(0).toUpperCase() + id.slice(1) })}
            </a>
          </li>
        ))}
      </ul>
    </div>
  </div>
);
