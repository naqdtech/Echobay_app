"""Sales Person Activity Summary — answers "is this rep working?".

Per rep for the period: interactions split by channel, unique customers
touched, new leads created, leads converted. Leads are attributed through
the Sales Person.user custom field (Lead.owner = that user).
"""

import frappe


def execute(filters=None):
    filters = frappe._dict(filters or {})
    values = {"from_date": filters.from_date, "to_date": filters.to_date}

    data = frappe.db.sql(
        """
        select
            sp.name as sales_person,
            sp.sales_person_name,
            coalesce(i.total, 0) as total_interactions,
            coalesce(i.calls, 0) as calls,
            coalesce(i.whatsapp, 0) as whatsapp,
            coalesce(i.in_person, 0) as in_person,
            coalesce(i.unique_customers, 0) as unique_customers,
            coalesce(l.new_leads, 0) as new_leads,
            coalesce(l.converted, 0) as leads_converted
        from `tabSales Person` sp
        left join (
            select sales_person,
                   count(*) as total,
                   sum(channel = 'Call') as calls,
                   sum(channel = 'WhatsApp') as whatsapp,
                   sum(channel = 'In-person') as in_person,
                   count(distinct case when party_type = 'Customer' then party end) as unique_customers
            from `tabInteraction`
            where interaction_datetime between %(from_date)s and concat(%(to_date)s, ' 23:59:59')
            group by sales_person
        ) i on i.sales_person = sp.name
        left join (
            select u.name as user_id,
                   sum(ld.creation between %(from_date)s and concat(%(to_date)s, ' 23:59:59')) as new_leads,
                   sum(ld.status = 'Converted'
                       and ld.modified between %(from_date)s and concat(%(to_date)s, ' 23:59:59')) as converted
            from `tabUser` u
            join `tabLead` ld on ld.owner = u.name
            group by u.name
        ) l on l.user_id = sp.user
        where sp.enabled = 1 and sp.is_group = 0
        order by total_interactions desc
        """,
        values,
        as_dict=True,
    )

    columns = [
        {"fieldname": "sales_person", "label": "Sales person", "fieldtype": "Link", "options": "Sales Person", "width": 140},
        {"fieldname": "sales_person_name", "label": "Name", "fieldtype": "Data", "width": 140},
        {"fieldname": "total_interactions", "label": "Interactions", "fieldtype": "Int", "width": 110},
        {"fieldname": "calls", "label": "Calls", "fieldtype": "Int", "width": 80},
        {"fieldname": "whatsapp", "label": "WhatsApp", "fieldtype": "Int", "width": 90},
        {"fieldname": "in_person", "label": "In-person", "fieldtype": "Int", "width": 90},
        {"fieldname": "unique_customers", "label": "Unique customers", "fieldtype": "Int", "width": 130},
        {"fieldname": "new_leads", "label": "New leads", "fieldtype": "Int", "width": 90},
        {"fieldname": "leads_converted", "label": "Converted", "fieldtype": "Int", "width": 90},
    ]
    return columns, data
