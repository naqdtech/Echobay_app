export type PartyType = "Customer" | "Lead";
export type Channel = "Call" | "WhatsApp" | "In-person";

export interface AuthState {
    isAuthenticated: boolean;
    fullName: string;
    email: string;
    salesPerson: string | null;
    territories: string[];
    isManager: boolean;
}

export interface Client {
    name: string;
    party_type: PartyType;
    customer_name: string;
    territory?: string;
    mobile_no?: string;
    status?: string; // leads only
    sales_notes?: string;
    last_interaction_date?: string;
    days_since_last_interaction?: number | null;
    outstanding: number;
}

export interface Interaction {
    name: string;
    channel: Channel;
    interaction_datetime: string;
    notes: string;
    direction?: string;
    duration_minutes?: number;
    sentiment?: string;
    sales_person?: string;
    contact_person?: string;
    creation?: string;
}

export interface Todo {
    name: string;
    description: string;
    date?: string;
    priority?: string;
    status: "Open" | "Closed" | "Cancelled";
    reference_type?: string;
    reference_name?: string;
    assigned_by?: string;
    allocated_to?: string;
}

export interface HomeDashboard {
    today_interactions: number;
    open_tasks: number;
    overdue_tasks: number;
    due_today: Todo[];
    silent_customers: {
        name: string;
        customer_name: string;
        territory: string;
        days_since_last_interaction: number;
    }[];
    silent_count: number;
}

export interface WeekStats {
    interactions: number;
    clients_touched: number;
    new_leads: number;
    tasks_closed: number;
}

export interface WeekSummary {
    this_week: WeekStats;
    last_week: WeekStats;
    week_start: string;
    week_end: string;
}

export interface RepActivity {
    sales_person: string;
    sales_person_name: string;
    interactions: number;
    in_person: number;
    calls: number;
    whatsapp: number;
    unique_parties: number;
}

export interface ManagerSnapshot {
    week_start: string;
    week_end: string;
    total_interactions: number;
    new_leads: number;
    silent_count: number;
    per_rep: RepActivity[];
}
