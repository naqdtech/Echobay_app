"""Whitelisted endpoints for the NEC CRM React app.

Dashboard-style aggregates are pre-computed here so the app renders each
screen from one round-trip instead of composing five client-side calls.
Standard CRUD (logging an interaction, toggling a ToDo, creating a Lead)
goes through frappe.client.* from the frontend.

Territory scoping: list queries made through frappe.get_list/get_all with
the user's session already respect User Permissions. Raw SQL aggregates
are filtered explicitly by the resolved sales person / permitted
territories below — never trust the client for scoping.
"""

import frappe
from frappe import _
from frappe.utils import (
    add_days,
    get_datetime,
    getdate,
    now_datetime,
    nowdate,
    strip_html_tags,
)

SILENCE_THRESHOLD_DAYS = 30


# ── identity helpers ─────────────────────────────────────


def _resolve_sales_person(user: str | None = None) -> str | None:
    user = user or frappe.session.user
    sp = frappe.db.get_value("Sales Person", {"user": user, "enabled": 1})
    if not sp:
        employee = frappe.db.get_value("Employee", {"user_id": user})
        if employee:
            sp = frappe.db.get_value("Sales Person", {"employee": employee, "enabled": 1})
    return sp


def _is_manager() -> bool:
    roles = frappe.get_roles()
    return "Sales Manager" in roles or "System Manager" in roles


def _permitted_territories(user: str | None = None) -> list[str]:
    """Territories the user is scoped to (with descendants). Empty = unrestricted."""
    user = user or frappe.session.user
    roots = frappe.get_all(
        "User Permission",
        filters={"user": user, "allow": "Territory"},
        pluck="for_value",
    )
    if not roots:
        return []
    territories: set[str] = set()
    for root in roots:
        bounds = frappe.db.get_value("Territory", root, ["lft", "rgt"], as_dict=True)
        if not bounds:
            continue
        territories.update(
            frappe.get_all(
                "Territory",
                filters={"lft": [">=", bounds.lft], "rgt": ["<=", bounds.rgt]},
                pluck="name",
            )
        )
    return sorted(territories)


@frappe.whitelist()
def get_context():
    """Who am I — called once after login."""
    user = frappe.session.user
    sales_person = _resolve_sales_person(user)
    return {
        "user": user,
        "full_name": frappe.db.get_value("User", user, "full_name"),
        "sales_person": sales_person,
        "territories": _permitted_territories(user),
        "is_manager": _is_manager(),
    }


# ── home dashboard ───────────────────────────────────────


@frappe.whitelist()
def home_dashboard():
    user = frappe.session.user
    sales_person = _resolve_sales_person(user)
    territories = _permitted_territories(user)
    today = nowdate()

    interaction_filters = {"interaction_datetime": ["between", [f"{today} 00:00:00", f"{today} 23:59:59"]]}
    if sales_person:
        interaction_filters["sales_person"] = sales_person
    today_interactions = frappe.db.count("Interaction", interaction_filters)

    open_tasks = frappe.db.count("ToDo", {"allocated_to": user, "status": "Open"})
    overdue_tasks = frappe.db.count(
        "ToDo", {"allocated_to": user, "status": "Open", "date": ["<", today]}
    )

    due_today = frappe.get_all(
        "ToDo",
        filters={"allocated_to": user, "status": "Open", "date": today},
        fields=["name", "description", "priority", "date", "reference_type", "reference_name", "assigned_by"],
        order_by="priority desc",
        limit_page_length=3,
    )
    for t in due_today:
        t["description"] = strip_html_tags(t["description"] or "")[:140]

    silent_filters: dict = {
        "disabled": 0,
        "days_since_last_interaction": [">=", SILENCE_THRESHOLD_DAYS],
    }
    if territories:
        silent_filters["territory"] = ["in", territories]
    silent = frappe.get_all(
        "Customer",
        filters=silent_filters,
        fields=["name", "customer_name", "territory", "days_since_last_interaction"],
        order_by="days_since_last_interaction desc",
        limit_page_length=3,
    )
    silent_count = frappe.db.count("Customer", silent_filters)

    return {
        "today_interactions": today_interactions,
        "open_tasks": open_tasks,
        "overdue_tasks": overdue_tasks,
        "due_today": due_today,
        "silent_customers": silent,
        "silent_count": silent_count,
    }


# ── clients list ─────────────────────────────────────────


@frappe.whitelist()
def get_clients():
    """Customers + open Leads for the rep's territory, with days-since-last-touch
    and receivable outstanding (read from real invoices, never self-reported)."""
    territories = _permitted_territories()

    customer_filters: dict = {"disabled": 0}
    lead_filters: dict = {"status": ["not in", ["Converted", "Do Not Contact"]]}
    if territories:
        customer_filters["territory"] = ["in", territories]
        lead_filters["territory"] = ["in", territories]

    customers = frappe.get_all(
        "Customer",
        filters=customer_filters,
        fields=[
            "name", "customer_name", "territory", "mobile_no",
            "sales_notes", "last_interaction_date", "days_since_last_interaction",
        ],
        limit_page_length=0,
    )

    outstanding = {}
    if customers:
        rows = frappe.db.sql(
            """
            select customer, sum(outstanding_amount) as outstanding
            from `tabSales Invoice`
            where docstatus = 1 and outstanding_amount > 0
              and customer in %(customers)s
            group by customer
            """,
            {"customers": [c.name for c in customers]},
            as_dict=True,
        )
        outstanding = {r.customer: r.outstanding for r in rows}

    today = getdate(nowdate())
    for c in customers:
        c["party_type"] = "Customer"
        c["outstanding"] = float(outstanding.get(c.name) or 0)
        if c.days_since_last_interaction is None and c.last_interaction_date:
            c["days_since_last_interaction"] = (today - getdate(c.last_interaction_date)).days

    leads = frappe.get_all(
        "Lead",
        filters=lead_filters,
        fields=[
            "name", "lead_name", "company_name", "territory", "mobile_no",
            "status", "sales_notes", "last_interaction_date",
        ],
        limit_page_length=0,
    )
    for l in leads:
        l["party_type"] = "Lead"
        l["customer_name"] = l.company_name or l.lead_name
        l["outstanding"] = 0
        l["days_since_last_interaction"] = (
            (today - getdate(l.last_interaction_date)).days if l.last_interaction_date else None
        )

    return {"customers": customers, "leads": leads}


@frappe.whitelist()
def get_client_detail(party_type: str, party: str):
    if party_type not in ("Customer", "Lead"):
        frappe.throw(_("Invalid party type"))
    doc = frappe.get_doc(party_type, party)  # raises PermissionError if out of territory
    doc.check_permission("read")

    detail = {
        "name": doc.name,
        "party_type": party_type,
        "customer_name": doc.get("customer_name") or doc.get("company_name") or doc.get("lead_name"),
        "territory": doc.get("territory"),
        "mobile_no": doc.get("mobile_no"),
        "sales_notes": doc.get("sales_notes"),
        "last_interaction_date": doc.get("last_interaction_date"),
        "outstanding": 0,
    }
    if party_type == "Customer":
        detail["outstanding"] = float(
            frappe.db.sql(
                """select coalesce(sum(outstanding_amount), 0) from `tabSales Invoice`
                   where docstatus = 1 and customer = %s and outstanding_amount > 0""",
                party,
            )[0][0]
        )
    return detail


@frappe.whitelist()
def get_timeline(party_type: str, party: str, start: int = 0, page_length: int = 20):
    """Reverse-chronological interaction timeline, chunked for infinite scroll."""
    return frappe.get_list(
        "Interaction",
        filters={"party_type": party_type, "party": party},
        fields=[
            "name", "channel", "interaction_datetime", "notes", "direction",
            "duration_minutes", "sentiment", "sales_person", "contact_person", "creation",
        ],
        order_by="interaction_datetime desc",
        limit_start=int(start),
        limit_page_length=int(page_length),
    )


# ── week KPIs (Me screen) ────────────────────────────────


def _week_window(offset_weeks: int = 0):
    today = getdate(nowdate())
    monday = add_days(today, -today.weekday() - 7 * offset_weeks)
    return monday, add_days(monday, 6)


def _week_stats(user: str, sales_person: str | None, start, end) -> dict:
    span = [f"{start} 00:00:00", f"{end} 23:59:59"]

    ifilters: dict = {"interaction_datetime": ["between", span]}
    if sales_person:
        ifilters["sales_person"] = sales_person
    interactions = frappe.db.count("Interaction", ifilters)

    touched = frappe.db.sql(
        """select count(distinct party) from `tabInteraction`
           where interaction_datetime between %(f)s and %(t)s
           {cond}""".format(cond="and sales_person = %(sp)s" if sales_person else ""),
        {"f": span[0], "t": span[1], "sp": sales_person},
    )[0][0]

    new_leads = frappe.db.count("Lead", {"owner": user, "creation": ["between", span]})
    tasks_closed = frappe.db.count(
        "ToDo", {"allocated_to": user, "status": "Closed", "modified": ["between", span]}
    )
    return {
        "interactions": interactions,
        "clients_touched": touched,
        "new_leads": new_leads,
        "tasks_closed": tasks_closed,
    }


@frappe.whitelist()
def week_summary():
    user = frappe.session.user
    sales_person = _resolve_sales_person(user)
    this_start, this_end = _week_window(0)
    prev_start, prev_end = _week_window(1)
    return {
        "this_week": _week_stats(user, sales_person, this_start, this_end),
        "last_week": _week_stats(user, sales_person, prev_start, prev_end),
        "week_start": str(this_start),
        "week_end": str(this_end),
    }


# ── manager snapshot ─────────────────────────────────────


@frappe.whitelist()
def manager_snapshot():
    if not _is_manager():
        frappe.throw(_("Not permitted"), frappe.PermissionError)

    start, end = _week_window(0)
    span = (f"{start} 00:00:00", f"{end} 23:59:59")

    per_rep = frappe.db.sql(
        """
        select sp.name as sales_person, sp.sales_person_name,
               coalesce(i.total, 0) as interactions,
               coalesce(i.in_person, 0) as in_person,
               coalesce(i.calls, 0) as calls,
               coalesce(i.whatsapp, 0) as whatsapp,
               coalesce(i.unique_parties, 0) as unique_parties
        from `tabSales Person` sp
        left join (
            select sales_person,
                   count(*) as total,
                   sum(channel = 'In-person') as in_person,
                   sum(channel = 'Call') as calls,
                   sum(channel = 'WhatsApp') as whatsapp,
                   count(distinct party) as unique_parties
            from `tabInteraction`
            where interaction_datetime between %(f)s and %(t)s
            group by sales_person
        ) i on i.sales_person = sp.name
        where sp.enabled = 1 and sp.is_group = 0
        order by interactions desc
        """,
        {"f": span[0], "t": span[1]},
        as_dict=True,
    )

    total_interactions = sum(r.interactions for r in per_rep)
    new_leads = frappe.db.count("Lead", {"creation": ["between", list(span)]})
    silent_count = frappe.db.count(
        "Customer",
        {"disabled": 0, "days_since_last_interaction": [">=", SILENCE_THRESHOLD_DAYS]},
    )

    return {
        "week_start": str(start),
        "week_end": str(end),
        "total_interactions": total_interactions,
        "new_leads": new_leads,
        "silent_count": silent_count,
        "per_rep": per_rep,
    }
