import type { ReactNode } from 'react';

interface PanelContainerProps {
  title: string;
  children: ReactNode;
  className?: string;
  accent?: string;
}

export function PanelContainer({
  title,
  children,
  className = '',
  accent,
}: PanelContainerProps) {
  return (
    <div className={`panel ${className}`}>
      <div
        className="panel-header"
        style={accent ? { '--panel-accent': accent } as React.CSSProperties : undefined}
      >
        {title}
      </div>
      <div className="panel-body">{children}</div>
    </div>
  );
}
