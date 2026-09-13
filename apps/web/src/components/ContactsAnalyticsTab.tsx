import { useAuth } from "@clerk/clerk-react";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { api } from "../api";
import { ContactActivityChart } from "./ContactActivityChart";
import { AreaChartSkeleton } from "./skeletons/ChartSkeletons";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/Card";
import { SelectRoot as Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/Select";

export function ContactsAnalyticsTab() {
  const { getToken } = useAuth();
  // Left undefined for the first fetch — the server picks the most recent
  // year with any contact activity and reports it back, which this then
  // syncs into local state so the year Select shows the right value and
  // subsequent choices become explicit query params.
  const [year, setYear] = useState<number | undefined>(undefined);

  const { data, isLoading, error } = useQuery({
    queryKey: ["contacts", "analytics", year],
    queryFn: () => api.getContactAnalytics(getToken, year),
  });

  useEffect(() => {
    if (data && year === undefined) setYear(data.year);
  }, [data, year]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Most active contact</CardTitle>
          <CardDescription>Who you transacted with most, month by month</CardDescription>
        </CardHeader>
        <CardContent>
          <AreaChartSkeleton />
        </CardContent>
      </Card>
    );
  }

  if (error && !data) {
    return <p className="text-rust-400">{(error as Error).message}</p>;
  }

  if (!data) return null;

  return (
    <div className="flex flex-col gap-4">
      {data.availableYears.length > 1 && (
        <div className="flex justify-end">
          <Select value={String(data.year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="w-full sm:w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {data.availableYears.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <ContactActivityChart analytics={data} />
    </div>
  );
}
