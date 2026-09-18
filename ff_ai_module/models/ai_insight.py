import requests
from odoo import models, fields, api, _
from odoo.exceptions import UserError, ValidationError


class AIPrompt(models.Model):
    _name = 'ai.insight'
    _description = 'AI Prompt Generator'
    _rec_name = 'prompt_text'

    prompt_text = fields.Text(string='Prompt', required=True, tracking=True)
    response_text = fields.Text(string='AI Response', readonly=True)
    switch_bool = fields.Boolean("switch", default=False)

    def _get_odoo_financial_context(self):
        """ Fetch real-time sales and purchases totals from Odoo ORM """
        product_list = []
        product_recs = self.env['product.product'].with_company(self.env.company).search([('type','=','consu')])
        for product in product_recs:
            product_data = {
                'product_id': product.id,
                'product_name': product.name,
                'product_type': product.type,
                'product_categories': product.categ_id.name,
                'cost_price': product.standard_price,
                'average cost': product.avg_cost,
                'selling_price': product.list_price,
                'onhand_qty': product.qty_available,
                'closing_stock_value': product.total_value,
                'free_to_use': product.free_qty,
                'incoming_qty': product.incoming_qty,
                'outgoing_qty': product.outgoing_qty,
                'product_unit': product.uom_id.name
            }
            product_list.append(product_data)

        stock_lot = []
        lot_recs = self.env['stock.lot'].with_company(self.env.company).search([])

        for lot in lot_recs:
            lot_data = {
                'lot_name': lot.name,
                'product': lot.product_id.name,
                'product_quantity': lot.product_qty,
                'lot_company': lot.company_id.name,
                'lot_total_value': lot.total_value,
                'lot_average_cost': lot.avg_cost,
                'cost': lot.standard_price,
                'lot_expiration_date': lot.expiration_date,
                'lot_removal_date': lot.removal_date,
                'lot_best_before_date': lot.use_date,
                'lot_alert_date': lot.alert_date,
                'lot_creation_date': lot.create_date
            }
            stock_lot.append(lot_data)

        sale_orders = self.env['sale.order'].with_company(self.env.company).search([('state', 'in', ['sale', 'done'])])
        sale_list = []
        sales_tax_list=[]
        for sale in sale_orders:
            sales_tax_list.append(sale.amount_tax)
            sale_list.append(sale.name)
        total_sales = sum(sale_orders.mapped('amount_untaxed'))

        pos_list =[]
        pos_orders = self.env['pos.order'].with_company(self.env.company).search([])
        for lines in pos_orders.lines:
            pos_lines_data = {
                'order reference': lines.order_id.name,
                'order_date': lines.order_id.date_order,
                'session_name': lines.order_id.session_id.name,
                'employee': lines.order_id.user_id.name,
                'product': lines.product_id.name,
                'quantity': lines.qty,
                'Product UOM': lines.product_uom_id.name,
                'product unit price': lines.price_unit,
                'discount_per_product': lines.discount,
                'price_tax_exclude': lines.price_subtotal,
                'price_tax_including': lines.price_subtotal_incl,
                'tax_per_product': lines.price_subtotal_incl - lines.price_subtotal,
                'Total_tax': lines.order_id.amount_tax,
                'total_amount': lines.order_id.amount_total,
                'paid_amount_order': lines.order_id.amount_paid,
                'order_margin': lines.order_id.margin
            }
            pos_list.append(pos_lines_data)
        pos_payment_list = []
        pos_payment = self.env['pos.payment'].with_company(self.env.company).search([])
        for payment in pos_payment:
            pos_payment_dict = {
                'session': payment.session_id.name,
                'pos_order': payment.pos_order_id.name,
                'amount': payment.amount,
                'payment_method': payment.payment_method_id.name
            }
            pos_payment_list.append(pos_payment_dict)


        purchase_tax_list = []
        purchase_orders = self.env['purchase.order'].with_company(self.env.company).search([('state', 'in', ['purchase', 'done'])])
        purchase_data = []
        for purchase in purchase_orders:
            for line in purchase.order_line:
                pur_product_data = {
                    'purchase name': purchase.name,
                    'purchase_date': purchase.date_approve,
                    'product_id': line.product_id.id,
                    'product_name': line.product_id.name,
                    'product_qty': line.product_qty,
                    'received_qty': line.qty_received,
                    'invoiced_qty': line.qty_invoiced,
                    'price_unit': line.price_unit,
                    'taxes': line.taxes_id.name,
                    'subtotal': line.price_subtotal,
                }
                purchase_data.append(pur_product_data)
            purchase_tax_list.append(purchase.amount_tax)
        total_purchases = sum(purchase_orders.mapped('amount_untaxed'))
        total_profit = total_sales - total_purchases

        context = f"""
        --- ODOO SYSTEM DATA CONTEXT ---
        Product data: {product_list}
        Stock Lot data: {stock_lot}
        Sale Order: {sale_list}
        sales tax: {sales_tax_list}
        Total Confirmed Sales Amount (Untaxed): {total_sales:.2f}
        purchase tax: {purchase_tax_list}
        purchase data: {purchase_data}
        Total Confirmed Purchase Amount (Untaxed): {total_purchases:.2f}
        Calculated Net Profit: {total_profit:.2f}
        Number of Sales Orders: {len(sale_orders)}
        Number of Purchase Orders: {len(purchase_orders)}
        POS Order Data : {pos_list}
        POS Order Payment Data: {pos_payment_list}
        --------------------------------
        """
        return context

    def action_generate_response(self):
        self.switch_bool = True
        for record in self:
            creds = self.env['ai.configuration'].search([('state','=','active')], limit=1)
            if not creds:
                raise ValidationError("Please configure the Api credentials !")

            system_context = record._get_odoo_financial_context()
            full_prompt = f"{system_context}\nUser Question: {record.prompt_text}"

            url = f"{creds.url}key={creds.api_key}"
            headers = {'Content-Type': 'application/json'}
            data = {
                "contents": [{
                    "parts": [{"text": full_prompt}]
                }]
            }

            try:
                response = requests.post(url, headers=headers, json=data, timeout=30)
                if response.status_code == 200:
                    if 'candidates' in response.json():
                        ai_text = response.json()['candidates'][0]['content']['parts'][0]['text']
                        record.write({'response_text': ai_text})
                else:
                    record.write(
                        {'response_text': f"Unexpected API response structure:\n {response.json()['error']['message']}"})
            except requests.exceptions.RequestException as e:
                raise UserError(_(f"Failed to communicate with AI provider.\nError Details: {str(e)}"))

