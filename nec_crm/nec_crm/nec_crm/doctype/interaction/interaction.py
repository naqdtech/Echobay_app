import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import get_datetime, getdate, now_datetime, time_diff_in_hours

EDIT_WINDOW_HOURS = 24


def _is_privileged() -> bool:
    return frappe.session.user == "Administrator" or "System Manager" in frappe.get_roles()


class Interaction(Document):
    def before_insert(self):
        self.autofill_sales_person()

    def validate(self):
        self.set_party_name()
        self.validate_same_day_datetime()
        if not self.is_new():
            self.validate_edit_window()

    def after_insert(self):
        self.update_party_last_touch()

    def on_trash(self):
        if not _is_privileged():
            frappe.throw(_("Interactions cannot be deleted."), frappe.PermissionError)

    def autofill_sales_person(self):
        """Resolve the logged-in user to their Sales Person + Territory.

        Managers/admins may log on behalf of a rep by setting sales_person
        explicitly; for everyone else it is forced to their own record.
        """
        user = frappe.session.user
        own = frappe.db.get_value("Sales Person", {"user": user, "enabled": 1})
        if not own:
            # fall back to the standard Employee.user_id chain
            employee = frappe.db.get_value("Employee", {"user_id": user})
            if employee:
                own = frappe.db.get_value("Sales Person", {"employee": employee, "enabled": 1})

        if not _is_privileged() and "Sales Manager" not in frappe.get_roles():
            if not own:
                frappe.throw(
                    _("No Sales Person record is linked to your user. Ask your admin to set it up.")
                )
            self.sales_person = own
        elif not self.sales_person:
            self.sales_person = own

        if self.sales_person and not self.territory:
            self.territory = frappe.db.get_value(
                "Territory", {"territory_manager": self.sales_person}
            )
        # fall back: take territory from the party itself
        if not self.territory and self.party:
            self.territory = frappe.db.get_value(self.party_type, self.party, "territory")

    def set_party_name(self):
        if not self.party:
            return
        fieldname = "customer_name" if self.party_type == "Customer" else "lead_name"
        self.party_name = frappe.db.get_value(self.party_type, self.party, fieldname) or self.party

    def validate_same_day_datetime(self):
        """interaction_datetime is editable within the same day only —
        a rep can adjust the time of today's visit, not backdate last week."""
        if _is_privileged():
            return
        anchor = getdate(self.creation) if not self.is_new() else getdate(now_datetime())
        if getdate(get_datetime(self.interaction_datetime)) != anchor:
            frappe.throw(
                _("Interaction date must be {0}. Backdating is not allowed.").format(
                    frappe.format(anchor, {"fieldtype": "Date"})
                )
            )

    def validate_edit_window(self):
        if _is_privileged():
            return
        if time_diff_in_hours(now_datetime(), self.creation) > EDIT_WINDOW_HOURS:
            frappe.throw(
                _("Interactions are locked {0} hours after creation and can no longer be edited.").format(
                    EDIT_WINDOW_HOURS
                )
            )

    def update_party_last_touch(self):
        """Keep the party's last_interaction_date fresh so the Silence report
        is a plain column read, not a subquery per row."""
        current = frappe.db.get_value(self.party_type, self.party, "last_interaction_date")
        if current and get_datetime(current) >= get_datetime(self.interaction_datetime):
            return
        frappe.db.set_value(
            self.party_type,
            self.party,
            "last_interaction_date",
            self.interaction_datetime,
            update_modified=False,
        )
        if self.party_type == "Customer":
            days = (getdate(now_datetime()) - getdate(get_datetime(self.interaction_datetime))).days
            frappe.db.set_value(
                "Customer",
                self.party,
                "days_since_last_interaction",
                max(days, 0),
                update_modified=False,
            )
