"""Open and Overdue Tasks — per rep, grouped by due-date bucket."""

import frappe
from frappe.utils import strip_html_tags


def execute(filters=None):
    filters = frappe._dict(filters or {})

    conditions = ["t.status = 'Open'"]
    values = {}
    if filters.get("allocated_to"):
        conditions.append("t.allocated_to = %(allocated_to)s")
        values["allocated_to"] = filters.allocated_to

    data = frappe.db.sql(
        f"""
        select
            case
                when t.date is null then 'No due date'
                when t.date < curdate() then 'Overdue'
                when t.date = curdate() then 'Due today'
                when t.date <= date_add(curdate(), interval 7 day) then 'This week'
                else 'Later'
            end as bucket,
            t.allocated_to,
            t.assigned_by,
            t.date as due_date,
            t.priority,
            t.description,
            t.reference_type,
            t.reference_name
        from `tabToDo` t
        where {" and ".join(conditions)}
        order by field(bucket, 'Overdue', 'Due today', 'This week', 'Later', 'No due date'),
                 t.date asc
        """,
        values,
        as_dict=True,
    )
    for row in data:
        row["description"] = strip_html_tags(row["description"] or "")[:160]

    columns = [
        {"fieldname": "bucket", "label": "Bucket", "fieldtype": "Data", "width": 100},
        {"fieldname": "allocated_to", "label": "Assigned to", "fieldtype": "Link", "options": "User", "width": 160},
        {"fieldname": "assigned_by", "label": "Assigned by", "fieldtype": "Link", "options": "User", "width": 160},
        {"fieldname": "due_date", "label": "Due date", "fieldtype": "Date", "width": 100},
        {"fieldname": "priority", "label": "Priority", "fieldtype": "Data", "width": 80},
        {"fieldname": "description", "label": "Task", "fieldtype": "Data", "width": 320},
        {"fieldname": "reference_type", "label": "Linked to", "fieldtype": "Data", "width": 100},
        {"fieldname": "reference_name", "label": "Reference", "fieldtype": "Dynamic Link", "options": "reference_type", "width": 150},
    ]
    return columns, data
