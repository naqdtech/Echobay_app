"""Customer Silence Report — the killer report.

Every customer, sorted by how long they have gone without a touch.
Never-contacted customers sort first. days_since_last_interaction is
recomputed nightly by nec_crm.tasks.recompute_customer_silence.
"""

import frappe


def execute(filters=None):
    filters = frappe._dict(filters or {})

    conditions = ["c.disabled = 0"]
    values = {}
    if filters.get("territory"):
        # include the subtree so filtering by a zone covers its cities
        bounds = frappe.db.get_value("Territory", filters.territory, ["lft", "rgt"], as_dict=True)
        if bounds:
            conditions.append(
                "c.territory in (select name from `tabTerritory` where lft >= %(lft)s and rgt <= %(rgt)s)"
            )
            values.update({"lft": bounds.lft, "rgt": bounds.rgt})
    if filters.get("min_days"):
        conditions.append(
            "(c.days_since_last_interaction is null or c.days_since_last_interaction >= %(min_days)s)"
        )
        values["min_days"] = int(filters.min_days)

    data = frappe.db.sql(
        f"""
        select
            c.name as customer,
            c.customer_name,
            c.territory,
            c.last_interaction_date,
            c.days_since_last_interaction,
            case when c.last_interaction_date is null then 'Never contacted' else '' end as flag
        from `tabCustomer` c
        where {" and ".join(conditions)}
        order by (c.last_interaction_date is null) desc,
                 c.days_since_last_interaction desc
        """,
        values,
        as_dict=True,
    )

    columns = [
        {"fieldname": "customer", "label": "Customer", "fieldtype": "Link", "options": "Customer", "width": 160},
        {"fieldname": "customer_name", "label": "Name", "fieldtype": "Data", "width": 180},
        {"fieldname": "territory", "label": "Territory", "fieldtype": "Link", "options": "Territory", "width": 120},
        {"fieldname": "last_interaction_date", "label": "Last interaction", "fieldtype": "Datetime", "width": 150},
        {"fieldname": "days_since_last_interaction", "label": "Days silent", "fieldtype": "Int", "width": 100},
        {"fieldname": "flag", "label": "", "fieldtype": "Data", "width": 130},
    ]
    return columns, data
