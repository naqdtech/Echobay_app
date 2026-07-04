"""Lead Funnel — new leads per rep per month, conversion rate, days to convert.

Days-to-convert approximates conversion time as (modified - creation) of
converted leads; Stage 1 does not track an explicit conversion timestamp.
"""

import frappe


def execute(filters=None):
    filters = frappe._dict(filters or {})
    values = {"from_date": filters.from_date, "to_date": filters.to_date}

    data = frappe.db.sql(
        """
        select
            date_format(ld.creation, '%%Y-%%m') as month,
            coalesce(sp.name, ld.owner) as rep,
            count(*) as new_leads,
            sum(ld.status = 'Converted') as converted,
            round(100 * sum(ld.status = 'Converted') / count(*), 1) as conversion_pct,
            round(avg(case when ld.status = 'Converted'
                           then datediff(ld.modified, ld.creation) end), 1) as avg_days_to_convert
        from `tabLead` ld
        left join `tabSales Person` sp on sp.user = ld.owner
        where ld.creation between %(from_date)s and concat(%(to_date)s, ' 23:59:59')
        group by month, rep
        order by month desc, new_leads desc
        """,
        values,
        as_dict=True,
    )

    columns = [
        {"fieldname": "month", "label": "Month", "fieldtype": "Data", "width": 90},
        {"fieldname": "rep", "label": "Rep", "fieldtype": "Data", "width": 160},
        {"fieldname": "new_leads", "label": "New leads", "fieldtype": "Int", "width": 100},
        {"fieldname": "converted", "label": "Converted", "fieldtype": "Int", "width": 100},
        {"fieldname": "conversion_pct", "label": "Conversion %", "fieldtype": "Float", "width": 110},
        {"fieldname": "avg_days_to_convert", "label": "Avg days to convert", "fieldtype": "Float", "width": 150},
    ]
    return columns, data
