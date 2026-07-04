"""Install / migrate hooks: custom fields and permission helpers.

Custom fields are created with `create_custom_fields`, which is idempotent —
safe to run on every migrate.
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

CUSTOM_FIELDS = {
    "Customer": [
        {
            "fieldname": "sales_notes_section",
            "label": "Sales notes",
            "fieldtype": "Section Break",
            "insert_after": "customer_name",
            "collapsible": 0,
        },
        {
            "fieldname": "sales_notes",
            "label": "Sales notes",
            "fieldtype": "Long Text",
            "insert_after": "sales_notes_section",
            "description": "Persistent context for reps — payment habits, who to talk to, preferences.",
        },
        {
            "fieldname": "last_interaction_date",
            "label": "Last interaction date",
            "fieldtype": "Datetime",
            "insert_after": "sales_notes",
            "read_only": 1,
            "no_copy": 1,
        },
        {
            "fieldname": "days_since_last_interaction",
            "label": "Days since last interaction",
            "fieldtype": "Int",
            "insert_after": "last_interaction_date",
            "read_only": 1,
            "no_copy": 1,
            "in_list_view": 0,
            "in_standard_filter": 1,
        },
    ],
    "Lead": [
        {
            "fieldname": "sales_notes_section",
            "label": "Sales notes",
            "fieldtype": "Section Break",
            "insert_after": "lead_name",
        },
        {
            "fieldname": "sales_notes",
            "label": "Sales notes",
            "fieldtype": "Long Text",
            "insert_after": "sales_notes_section",
        },
        {
            "fieldname": "last_interaction_date",
            "label": "Last interaction date",
            "fieldtype": "Datetime",
            "insert_after": "sales_notes",
            "read_only": 1,
            "no_copy": 1,
        },
    ],
    # Direct rep <-> login mapping. ERPNext's Sales Person only reaches a User
    # through Employee.user_id, which this client does not maintain.
    "Sales Person": [
        {
            "fieldname": "user",
            "label": "User",
            "fieldtype": "Link",
            "options": "User",
            "insert_after": "sales_person_name",
            "unique": 1,
            "description": "Login user for this rep — used by NEC CRM to auto-fill interactions.",
        },
    ],
}


def after_install():
    make_custom_fields()


def after_migrate():
    make_custom_fields()


def make_custom_fields():
    create_custom_fields(CUSTOM_FIELDS, ignore_validate=True)


def setup_rep(user: str, territory: str, sales_person: str | None = None):
    """One-call onboarding for a rep. Run from bench:

        bench --site <site> execute nec_crm.install.setup_rep \
            --kwargs "{'user': 'habeeb@example.com', 'territory': 'Kerala South'}"

    - gives the user the Sales User role
    - creates the territory-scoping User Permission (applies to Customer,
      Lead and Interaction through their territory link field)
    - links the Sales Person record to the user
    """
    user_doc = frappe.get_doc("User", user)
    roles = {r.role for r in user_doc.roles}
    if "Sales User" not in roles:
        user_doc.append("roles", {"role": "Sales User"})
        user_doc.save(ignore_permissions=True)

    if not frappe.db.exists(
        "User Permission",
        {"user": user, "allow": "Territory", "for_value": territory},
    ):
        frappe.get_doc(
            {
                "doctype": "User Permission",
                "user": user,
                "allow": "Territory",
                "for_value": territory,
                "apply_to_all_doctypes": 1,
            }
        ).insert(ignore_permissions=True)

    if sales_person and frappe.db.exists("Sales Person", sales_person):
        frappe.db.set_value("Sales Person", sales_person, "user", user)

    frappe.db.commit()
