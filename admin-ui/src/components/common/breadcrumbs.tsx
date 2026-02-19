import { ChevronRight } from 'lucide-react';

type BreadcrumbsProps = {
  items: string[];
};

export function Breadcrumbs({ items }: BreadcrumbsProps) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex items-center gap-1 text-sm text-slate-400">
        {items.map((item, index) => (
          <li key={item} className="flex items-center gap-1">
            {index > 0 ? <ChevronRight className="h-4 w-4" /> : null}
            <span className={index === items.length - 1 ? 'text-slate-200' : ''}>{item}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
