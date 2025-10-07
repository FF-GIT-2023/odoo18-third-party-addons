from odoo import models, fields

class PosConfig(models.Model):
    _inherit = 'pos.config'

    pos_device_ip_bool = fields.Boolean("Pos Device Boolean", defult=False)
    pos_device_ip = fields.Char(string="Pos Device IP Address", help="The IP address of the Pos device")
