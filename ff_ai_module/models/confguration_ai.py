from odoo import models,fields,api,_
from odoo.exceptions import UserError


class ConfigurationAI(models.Model):
    _name = "ai.configuration"

    url = fields.Char("URL")
    api_key = fields.Char("API Key")
    state = fields.Selection([('active', 'Active'), ('disable', 'Disable')], default='disable', tracking=True)

    @api.constrains('state')
    def _state_duplication(self):
        obj = self.env['ai.configuration'].search([('state', '=ilike', 'active')])
        if len(obj) > 1:
            raise UserError(_("Another Record is already in Active Status!"))

    def action_submit(self):
        self.state = 'active'

    def action_disable(self):
        self.state = 'disable'

