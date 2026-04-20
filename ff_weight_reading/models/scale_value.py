from odoo import models, fields, api, _
from odoo.exceptions import UserError


class ScaleValue(models.Model):
    _name = 'scale.value'

    scale_value = fields.Float("Scale Value", digits=(16, 3))
    current_date = fields.Datetime("Current Date", default=fields.Date.today())

    @api.constrains('current_date')
    def _check_scale_value(self):
        obj = self.env['scale.value'].search([])
        if len(obj) > 1:
            raise UserError(_("Another Record is already Created !"))


    @api.model
    def get_latest_weight(self):
        record = self.search([], order="current_date desc, id desc", limit=1)
        return record.scale_value if record else 0.0