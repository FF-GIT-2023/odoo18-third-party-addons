from odoo import fields, models


class Employee(models.Model):
    _inherit = "hr.employee"

    is_super_user = fields.Boolean("Super User")


class EmployeePublic(models.Model):
    _inherit = 'hr.employee.public'

    is_super_user = fields.Boolean(related='employee_id.is_super_user', store=True)