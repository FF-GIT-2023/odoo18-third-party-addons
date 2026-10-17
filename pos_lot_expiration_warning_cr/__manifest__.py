# -*- coding: utf-8 -*-
# Part of Odoo Module Developed by CandidRoot Solutions Pvt. Ltd.
# See LICENSE file for full copyright and licensing details.

{
    "name": "POS Lot Expiration Warning",
    "category": "Point of Sale",
    "summary": "Warn cashiers when an expired lot or serial number is selected in POS.",
    "version": "18.0.1.0.0",
    "author": "CandidRoot Solutions Pvt. Ltd.",
    "website": "https://www.candidroot.com",
    "description": """
        POS Lot Expiration Warning
        ==========================
        Shows a non-blocking warning in POS when a cashier selects a
        lot or serial number whose expiration date has already passed.
    """,
    "depends": ["point_of_sale", "product_expiry"],
    "data": [
        "views/pos_config_views.xml",
    ],
    "assets": {
        "point_of_sale._assets_pos": [
            "pos_lot_expiration_warning_cr/static/src/overrides/pos_store.patch.js",
        ],
    },
    "license": "OPL-1",
    "installable": True,
    "application": False,
    "auto_install": False,
    "images": ["static/description/banner.png"]
}
