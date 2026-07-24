/** @odoo-module **/

import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { PosOrderline } from "@point_of_sale/app/models/pos_order_line";
import { Orderline } from "@point_of_sale/app/generic_components/orderline/orderline";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

patch(ProductScreen.prototype, {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.dialog = useService("dialog");
    },

    async addProductToOrder(product, options) {
        const result = await this.orm.read("product.product", [product.id], ["qty_available", "type"]);
        const latestQty = result[0].qty_available;

        if (latestQty <= 0 && product.type !== "service")
            {
                this.dialog.add(AlertDialog,
                    {
                    title: _t("Out of Stock"),
                    body: _t(
                        `The product "${product.display_name}" is out of stock and cannot be sold. Please update the stock.`
                    ),
                    });

                return;
            }

        await super.addProductToOrder(product, options);
    },
});


patch(PosOrderline.prototype, {
     set_quantity(quantity, keepPrice) {
            const product = this.get_product();

            if (quantity > product.qty_available && product.type !== "service")
            {
                return {
                    title: _t("Not Enough Stock"),
                    body: _t(
                        `Available quantity for "${product.display_name}" is "${product.qty_available}".`
                    ),
                };
                quantity = product.qty_available;
            }

            return super.set_quantity(quantity, keepPrice);
        },

});