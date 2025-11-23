from odoo import fields, models


class ProductTemplate(models.Model):
    _inherit = "product.template"

    report_bool = fields.Selection([("tip", "Tip")], "Report")
