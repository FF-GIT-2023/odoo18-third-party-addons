from odoo import fields, models


class ProductCategory(models.Model):
    _inherit = "product.category"

    report_category = fields.Selection(
        [
            ("product", "PRODUCT"),
            ("rent", "RENT"),
            ("gift_cards", "Gift Cards"),
            ("service_deposit", "Service Deposit"),
            ("oth_sale_pos", "Oth/Sale/Pos"),
        ],
        "Report Category",
    )
    report_category_bool = fields.Boolean("Report", default=False)
    is_service = fields.Boolean("Is-Service", default=False)
