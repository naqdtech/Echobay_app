/** Registry of the query reports surfaced in the app's Manager view. */

export interface ReportDef {
    name: string;   // exact ERPNext Report name
    label: string;  // shown in the app
    group: "Activity" | "Pipeline" | "Integrity";
    blurb: string;
    dateRange?: boolean;              // show a from/to date control
    defaults?: Record<string, unknown>; // extra filters sent every run
}

export const REPORTS: ReportDef[] = [
    {
        name: "Interaction Log",
        label: "Interaction log",
        group: "Activity",
        blurb: "Every touch, newest first — the live weekly report.",
        dateRange: true,
    },
    {
        name: "Sales Person Activity Summary",
        label: "Sales person activity",
        group: "Activity",
        blurb: "Per rep: interactions by channel, clients touched, leads.",
        dateRange: true,
    },
    {
        name: "Customer Silence Report",
        label: "Customer silence",
        group: "Activity",
        blurb: "Who has gone quiet, longest silence first.",
        defaults: { min_days: 0 },
    },
    {
        name: "Lead Funnel Report",
        label: "Lead funnel",
        group: "Pipeline",
        blurb: "New leads, conversion rate and days to convert.",
        dateRange: true,
    },
    {
        name: "Open and Overdue Tasks",
        label: "Open & overdue tasks",
        group: "Pipeline",
        blurb: "Every open task, bucketed by due date.",
    },
    {
        name: "Backdated Interactions",
        label: "Backdated interactions",
        group: "Integrity",
        blurb: "Logged well after they supposedly happened.",
        dateRange: true,
        defaults: { min_hours_late: 24 },
    },
    {
        name: "Interactions by Hour",
        label: "Interactions by hour",
        group: "Integrity",
        blurb: "Spot end-of-day batch logging per rep.",
        dateRange: true,
    },
];

export function reportByName(name: string): ReportDef | undefined {
    return REPORTS.find((r) => r.name === name);
}

/** First day of the current month, ISO. */
export function monthStartISO(): string {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
