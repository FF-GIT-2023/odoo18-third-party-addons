# -*- coding: utf-8 -*-
# from odoo import http


# class ProductPlu(http.Controller):
#     @http.route('/product_plu/product_plu/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/product_plu/product_plu/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('product_plu.listing', {
#             'root': '/product_plu/product_plu',
#             'objects': http.request.env['product_plu.product_plu'].search([]),
#         })

#     @http.route('/product_plu/product_plu/objects/<model("product_plu.product_plu"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('product_plu.object', {
#             'object': obj
#         })
