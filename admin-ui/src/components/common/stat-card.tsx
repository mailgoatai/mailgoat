import type { LucideIcon } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '../ui/card';

type StatCardProps = {
  label: string;
  value: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, icon: Icon }: StatCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardDescription>{label}</CardDescription>
        <CardTitle className="flex items-center justify-between text-lg">
          {value}
          <Icon className="h-4 w-4 text-primary" />
        </CardTitle>
      </CardHeader>
    </Card>
  );
}
