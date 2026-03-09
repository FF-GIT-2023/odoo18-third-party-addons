/** @odoo-module */
import { patch } from "@web/core/utils/patch";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { rpc } from "@web/core/network/rpc";

patch(PosOrderline.prototype, {
     setup() {
        super.setup(...arguments);
        this.rpc = rpc;
        },
     async get_salesperson(){
      const tipProduct = this.config.tip_product_id;
      if (this.product_id.id === tipProduct?.id){
        return;
      }

      if (typeof this.id !='string'){
              const data = await rpc("/get_pos_sales_person", {
            product_id: this.product_id.id,
            pos_order_line_id : this.id
        });
        if (data.sales_person){
        this.salesperson = data.sales_person
        }
     }
    },
    getDisplayData() {
        const tipProduct = this.config.tip_product_id;
        if (this.product_id.id !== tipProduct?.id) {
            this.get_salesperson();
        }
        return {
            ...super.getDisplayData(),
            salesperson: this.salesperson || "",
            tip_amount: this.tip_amount || 0,
        };
    },

});
