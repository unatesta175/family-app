"use client";

import { Carousel } from "@/components/carousel";
import { StatsMonthBarChart } from "@/components/stats-month-bar-chart";
import { StatsCalendarHeatmap } from "@/components/stats-calendar-heatmap";
import { StatsTrendChart } from "@/components/stats-trend-chart";
import type { DailyPoint, MonthCalendar } from "@/lib/stats";

export function StatsChartCarousel({ series, calendar }: { series: DailyPoint[]; calendar: MonthCalendar }) {
  const views = [
    <StatsMonthBarChart key="bar" series={series} />,
    <StatsCalendarHeatmap key="calendar" calendar={calendar} />,
    <StatsTrendChart key="trend" series={series} />,
  ];

  return <Carousel items={views} />;
}
