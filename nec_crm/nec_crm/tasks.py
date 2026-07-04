"""Scheduled jobs (wired in hooks.py)."""

import frappe
from frappe.utils import nowdate, strip_html_tags


def recompute_customer_silence():
    """Nightly: refresh days_since_last_interaction across the customer master
    in one statement. Keeps the Silence report a plain indexed column read."""
    frappe.db.sql(
        """
        update `tabCustomer`
        set days_since_last_interaction = case
            when last_interaction_date is null then null
            else greatest(datediff(curdate(), date(last_interaction_date)), 0)
        end
        """
    )
    frappe.db.commit()


def send_task_reminders():
    """Morning WhatsApp nudge per rep listing tasks due today or overdue.
    Sends through the existing Evolution API integration (frappe_whatsapp_evo
    on evo.naqd.in). If that app is missing the job logs and exits quietly —
    reminders are a convenience, never a hard dependency.
    """
    today = nowdate()
    todos = frappe.get_all(
        "ToDo",
        filters={"status": "Open", "date": ["<=", today]},
        fields=["name", "allocated_to", "description", "date", "reference_type", "reference_name"],
        order_by="allocated_to, date asc",
        limit_page_length=0,
    )
    if not todos:
        return

    by_user: dict[str, list] = {}
    for t in todos:
        if t.allocated_to:
            by_user.setdefault(t.allocated_to, []).append(t)

    for user, items in by_user.items():
        mobile = frappe.db.get_value("User", user, "mobile_no")
        if not mobile:
            continue
        overdue = [t for t in items if str(t.date) < today]
        due_today = [t for t in items if str(t.date) == today]

        lines = ["Good morning. Your tasks for today:"]
        if due_today:
            lines.append("")
            lines.append("Due today:")
            lines += [f"- {strip_html_tags(t.description or '')[:80]}" for t in due_today[:5]]
        if overdue:
            lines.append("")
            lines.append(f"Overdue ({len(overdue)}):")
            lines += [f"- {strip_html_tags(t.description or '')[:80]} (was due {t.date})" for t in overdue[:5]]
        lines.append("")
        lines.append("Open the NEC CRM app to update them.")

        _send_whatsapp(mobile, "\n".join(lines))


def _send_whatsapp(to: str, message: str):
    """Best-effort text send via the bench's frappe_whatsapp_evo app.
    Verify the entry-point name against the installed app version; adjust
    here if it differs — this is the only place the integration is touched.
    """
    for attr in (
        "frappe_whatsapp_evo.api.send_whatsapp_message",
        "frappe_whatsapp_evo.api.send_whatsapp_with_media",
    ):
        try:
            fn = frappe.get_attr(attr)
        except Exception:
            continue
        try:
            if attr.endswith("send_whatsapp_with_media"):
                fn(to=to, message=message, attach_type=None)
            else:
                fn(to=to, message=message)
            return
        except Exception:
            frappe.log_error(
                title="NEC CRM task reminder failed",
                message=f"to={to} via {attr}\n{frappe.get_traceback()}",
            )
            return
    frappe.log_error(
        title="NEC CRM task reminder skipped",
        message="frappe_whatsapp_evo entry point not found on this bench.",
    )
