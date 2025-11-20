# -*- coding: utf-8 -*-
# This module is under copyright of 'OdooElevate'
{
    'name': 'Sales Report Dashboard',
    'version': '1.1',
    'category': 'Sales',
    'summary': 'Custom dashboard for yearly sales report.',
    'description': """
        This module provides a custom sales dashboard to visualize yearly sales data.
        It includes posted sales orders, unposted sales orders, and quotations,
        with dynamic data updates based on selected dates.
        This module is under copyright of 'OdooElevate'.
    """,
    'author': 'Sheikh Muhammad Saad, OdooElevate',
    'website': 'https://odooelevate.odoo.com/',
    'depends': ['web', 'sale_management'],
    'data': [
        'views/dashboard_views.xml',
    ],
    'assets': {
        'web.assets_backend': [
            'oe_sale_dashboard_18/static/src/js/dashboard.js',
            'oe_sale_dashboard_18/static/src/xml/dashboard_template.xml',
        ],
    },
    'images': ['static/description/banner.gif'],
    'installable': True,
    'application': True,
    'auto_install': False,
    'license': 'AGPL-3',
}
