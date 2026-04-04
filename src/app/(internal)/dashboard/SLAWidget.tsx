'use client';

import { useEffect, useState } from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';

interface SLAStats {
  activeCases: number;
  onTrack: number;
  approachingSLA: number;
  overdue: number;
  breachRate: number;
}

function SkeletonCard() {
  return (
    <Card>
      <CardHeader>
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </CardContent>
    </Card>
  );
}

export function SLAWidget() {
  const [stats, setStats] = useState<SLAStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSLAStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const response = await fetch('/api/sla/stats');
        if (!response.ok) {
          throw new Error('Failed to fetch SLA stats');
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'An error occurred'
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchSLAStats();
  }, []);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }

  if (error || !stats) {
    return (
      <Card className="col-span-full">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-red-600 dark:text-red-400">
              {error || 'Failed to load SLA statistics'}
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Cases */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Active Cases
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.activeCases}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Total cases in progress
            </p>
          </CardContent>
        </Card>

        {/* On Track */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              On Track
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400">
                {stats.onTrack}
              </div>
              <StatusBadge status="success" className="text-xs" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Meeting SLA targets
            </p>
          </CardContent>
        </Card>

        {/* Approaching SLA */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Approaching SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                {stats.approachingSLA}
              </div>
              <StatusBadge status="warning" className="text-xs" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Within 2 days of deadline
            </p>
          </CardContent>
        </Card>

        {/* Overdue */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400">
              Overdue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end justify-between">
              <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                {stats.overdue}
              </div>
              <StatusBadge status="error" className="text-xs" />
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Past SLA deadline
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Breach Rate */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">SLA Breach Rate</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-end gap-4">
            <div className="text-4xl font-bold text-gray-900 dark:text-white">
              {stats.breachRate.toFixed(1)}%
            </div>
            <div className="flex-1">
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className={`h-2 rounded-full transition-all ${
                    stats.breachRate > 20
                      ? 'bg-red-600'
                      : stats.breachRate > 10
                        ? 'bg-amber-600'
                        : 'bg-green-600'
                  }`}
                  style={{ width: `${Math.min(stats.breachRate, 100)}%` }}
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
            {stats.breachRate > 20
              ? 'High breach rate - immediate action needed'
              : stats.breachRate > 10
                ? 'Moderate breach rate - monitor closely'
                : 'Breach rate within acceptable range'}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
