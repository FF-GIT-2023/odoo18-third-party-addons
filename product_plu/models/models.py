# -*- coding: utf-8 -*-

from odoo import models, fields, api
import os.path
import base64


class ProductTemplate(models.Model):
    _inherit = 'product.template'

    is_plu = fields.Char(string='PLU', related='product_variant_ids.is_plu', readonly=False,store=True)
    export_barcode = fields.Char(string='Barcode', store=True, related='product_variant_ids.export_barcode',)
    is_export_piece = fields.Boolean(string='Is Piece', related='product_variant_ids.is_export_piece', readonly=False)

    @api.model
    def create(self, vals):
        product_template_id = super(ProductTemplate, self).create(vals)
        related_vals = {}
        if vals.get('is_plu'):
            related_vals['is_plu'] = vals['is_plu']

        if related_vals:
            product_template_id.write(related_vals)

        return product_template_id


class ProductProduct(models.Model):
    _inherit = 'product.product'

    is_plu = fields.Char(string='PLU',store=True)
    export_barcode = fields.Char(string='Barcode', store=True,compute='split_barcode_length')
    is_export_piece = fields.Boolean(string='Piece', default=False)


    @api.depends('barcode','product_tmpl_id.barcode')
    def split_barcode_length(self):
        for i in self:
            if i.barcode and len(i.barcode)==12:
                i.export_barcode =i.barcode[2:7]
            else:
                i.export_barcode= ""
        return



class Productexport(models.TransientModel):
    _name = 'product.export'

    is_product_export = fields.Boolean(string='Export')
    product_id = fields.Many2one('product.product', string="Product")
    sale_price = fields.Float(string="Sale Price",related='product_id.lst_price')
    to_weight = fields.Boolean(related='product_id.to_weight', string='To Weigh With Scale',
                               help="Check if the product should be weighted using the hardware scale integration")



    def text_product_export(self):
        prod_obj = self.env['product.product'].search([('to_weight', '=', True)])
        file_pro = ''
        if prod_obj:
            for pro in prod_obj:
                no = '0' if pro.is_export_piece else '1'

                file_pro += str(pro.is_plu) + ',' + str(pro.export_barcode) + ',' + str(pro.name) + ',' + str(pro.lst_price) + ',' + str(no) + '\r\n'

        values = {

            'name':'plu.txt',

            'res_model': 'ir.ui.view',

            'res_id': False,

            'type': 'binary',

            'public': True,

            'datas': base64.b64encode(file_pro.encode('utf-8')),

        }

        # Using your data create as attachment.

        attachment_id = self.env['ir.attachment'].sudo().create(values)

        # Prepare your download URL download_url = '/web/content/' + str(attachment_id.id) + '?download=True'


        download_url = '/web/content/' + str(attachment_id.id) + '?download=True'
        # download_url = '/web/content/' + str(file) + '?download=True'
        base_url = self.env['ir.config_parameter'].sudo().get_param('web.base.url')

        # Return so it will download in your system return {
        return {

            "type": "ir.actions.act_url",

            "url": str(base_url) + str(download_url),

            "target": "new",

        }



