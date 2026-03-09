/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { PaymentScreen } from "@point_of_sale/app/screens/payment_screen/payment_screen";
import { TipPopup } from "@salesperson_pos_order_line/js/tip_popup";
import { useService } from "@web/core/utils/hooks";

patch(PaymentScreen.prototype, {

    setup() {
        super.setup();
        this.dialog = useService("dialog");
        this.orm = useService("orm");
    },

    async addTip() {

        const order = this.currentOrder;
        const tipProduct = this.pos.config.tip_product_id;

        order.get_orderlines()
            .filter(line => line.get_product() === tipProduct)
            .forEach(line => line.delete());

        this.dialog.add(TipPopup, {
            order: order,

            getPayload: async (tips) => {

                let totalTip = 0;

                for (const tip of tips) {

                    const line = tip.line;

                    if (line) {

                        line.tip_amount = tip.amount;
                        line.salesperson = tip.salesperson;
                        line.user_id = tip.user_id;

                        totalTip += tip.amount;
                    }
                }

                if (totalTip > 0) {

                    const tipLine = await this.pos.addLineToCurrentOrder({
                        product_id: tipProduct,
                        price_unit: totalTip,
                        qty: 1,
                    });

                    tipLine.salesperson = "";
                    tipLine.user_id = null;

                }

                order.is_tipped = true;

            },
        });
    },

});
