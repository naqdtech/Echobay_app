import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "react-router-dom";
import { HiOutlineShare, HiOutlineChatBubbleLeftRight } from "react-icons/hi2";
import PageHeader from "../../components/PageHeader";
import FilterTabs from "../../components/FilterTabs";
import ReportTable from "../../components/ReportTable";
import { clientAPI, masterAPI, reportAPI, type ReportResult } from "../../api/erp";
import { sharePdf, sendViaEvo } from "../../utils/share";
import { inr } from "../../utils/format";
import type { Customer } from "../../types";

type Tab = "overview" | "ar" | "ledger" | "govt_summary" | "govt_ledger";

function fyStart(): string {
    const d = new Date();
    const y = d.getMonth() < 3 ? d.getFullYear() - 1 : d.getFullYear();
    return `${y}-04-01`;
}
const today = () => new Date().toISOString().split("T")[0];

export default function ClientDetail() {
    const { id = "" } = useParams();
    const name = decodeURIComponent(id);
    const location = useLocation();

    const [client, setClient] = useState<Customer | null>((location.state as any)?.customer || null);
    const [company, setCompany] = useState("");
    const [tab, setTab] = useState<Tab>("overview");
    const [from, setFrom] = useState(fyStart());
    const [to, setTo] = useState(today());

    const [balances, setBalances] = useState<{ receivable: number; govtFee: number } | null>(null);
    const [report, setReport] = useState<ReportResult | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!client) clientAPI.get(name).then(setClient);
        masterAPI.company().then((c) => setCompany(c));
    }, [name]); // eslint-disable-line

    // Overview balances
    useEffect(() => {
        if (!company) return;
        reportAPI.clientBalances(name, company).then(setBalances).catch(() => setBalances({ receivable: 0, govtFee: 0 }));
    }, [company, name]);

    // Tab reports
    useEffect(() => {
        if (!company || tab === "overview") { setReport(null); return; }
        setLoading(true);
        const filters: Record<string, any> =
            tab === "ledger"
                ? { company, party_type: "Customer", party: [name], from_date: from, to_date: to }
                : tab === "ar"
                    ? { company, report_date: to, party_type: "Customer", party: [name], range1: 30, range2: 60, range3: 90, range4: 120 }
                    : tab === "govt_ledger"
                        ? { company, party: name, from_date: from, to_date: to }
                        : { company, from_date: from, to_date: to, balance_type: "All" };
        const reportName =
            tab === "ledger" ? "General Ledger"
                : tab === "ar" ? "Accounts Receivable"
                    : tab === "govt_ledger" ? "Reimbursable Govt Fee - Party Ledger"
                        : "Reimbursable Govt Fee - Party Summary";

        reportAPI.run(reportName, filters)
            .then((r) => {
                // Party Summary returns all parties — keep only this client
                if (tab === "govt_summary") {
                    r = { ...r, result: r.result.filter((row: any) => (row.party ?? row[0]) === name) };
                }
                setReport(r);
            })
            .catch(() => setReport({ columns: [], result: [] }))
            .finally(() => setLoading(false));
    }, [tab, company, name, from, to]);

    const title = client?.customer_name || name;

    const dateRange = (
        <div className="flex gap-2 mb-3">
            <input type="date" className="input-field py-1.5 text-xs" value={from} onChange={(e) => setFrom(e.target.value)} />
            <input type="date" className="input-field py-1.5 text-xs" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
    );

    const spinner = (
        <div className="flex justify-center py-12">
            <span className="w-7 h-7 border-[3px] rounded-full animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-primary)" }} />
        </div>
    );

    return (
        <div className="page-container pb-24">
            <PageHeader title={title} subtitle={name} back="/clients"
                right={
                    <div className="flex items-center gap-1">
                        <button onClick={() => sharePdf("Customer", name, `Statement — ${title}`, "NEC Party Statement")}
                            className="p-2 rounded-lg" style={{ color: "var(--color-text-secondary)" }} aria-label="Share statement PDF">
                            <HiOutlineShare className="w-5 h-5" />
                        </button>
                        <button onClick={() => sendViaEvo("Customer", name, name, `Statement — ${title}`, "NEC Party Statement")}
                            className="p-2 rounded-lg" style={{ color: "#25D366" }} aria-label="Send statement on WhatsApp">
                            <HiOutlineChatBubbleLeftRight className="w-5 h-5" />
                        </button>
                    </div>
                } />

            <FilterTabs<Tab>
                value={tab} onChange={setTab}
                options={[
                    { key: "overview", label: "Overview" },
                    { key: "ar", label: "AR" },
                    { key: "ledger", label: "Ledger" },
                    { key: "govt_summary", label: "Govt Summary" },
                    { key: "govt_ledger", label: "Govt Ledger" },
                ]}
            />

            {tab === "overview" && (
                <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setTab("ar")} className="glass-card-hover p-4 text-left">
                            <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Receivable ›</p>
                            <p className="text-xl font-bold" style={{ color: balances && balances.receivable > 0 ? "#ef4444" : "var(--color-text)" }}>
                                {balances ? inr(balances.receivable) : "…"}
                            </p>
                        </button>
                        <button onClick={() => setTab("govt_summary")} className="glass-card-hover p-4 text-left">
                            <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: "var(--color-text-muted)" }}>Govt Fee Balance ›</p>
                            <p className="text-xl font-bold" style={{ color: "var(--color-text)" }}>
                                {balances ? inr(balances.govtFee) : "…"}
                            </p>
                        </button>
                    </div>
                    {client?.mobile_no && (
                        <div className="glass-card p-4 text-sm" style={{ color: "var(--color-text-secondary)" }}>
                            📱 {client.mobile_no}{client.email_id ? ` · ${client.email_id}` : ""}
                        </div>
                    )}
                    <p className="text-xs text-center pt-2" style={{ color: "var(--color-text-muted)" }}>
                        Use the tabs above for the full ledger & govt-fee reports.
                    </p>
                </div>
            )}

            {tab === "ar" && (
                loading ? spinner : report && (
                    <div className="glass-card p-2">
                        <ReportTable data={report}
                            show={["posting_date", "voucher_no", "due_date", "invoiced", "paid", "outstanding"]}
                            money={["invoiced", "paid", "outstanding"]}
                            empty="No outstanding invoices" />
                    </div>
                )
            )}

            {tab === "ledger" && (
                <>
                    {dateRange}
                    {loading ? spinner : report && (
                        <div className="glass-card p-2">
                            <ReportTable data={report}
                                show={["posting_date", "account", "debit", "credit", "balance"]}
                                money={["debit", "credit", "balance"]}
                                empty="No ledger entries in this period" />
                        </div>
                    )}
                </>
            )}

            {tab === "govt_summary" && (
                <>
                    {dateRange}
                    {loading ? spinner : report && (
                        <div className="glass-card p-2">
                            <ReportTable data={report}
                                show={["fee_type", "received_from_client", "paid_to_govt", "balance"]}
                                money={["received_from_client", "paid_to_govt", "balance"]}
                                empty="No govt-fee entries" />
                        </div>
                    )}
                </>
            )}

            {tab === "govt_ledger" && (
                <>
                    {dateRange}
                    {loading ? spinner : report && (
                        <div className="glass-card p-2">
                            <ReportTable data={report}
                                show={["posting_date", "fee_type", "received_cr", "paid_dr", "running_balance"]}
                                money={["received_cr", "paid_dr", "running_balance"]}
                                empty="No govt-fee ledger entries" />
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
