import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import { useService } from "@web/core/utils/hooks";

patch(ProductScreen.prototype, {
    setup() {
        super.setup();
        this.orm = useService("orm");
        this.dialog = useService("dialog");
    },

    async addProductToOrder(product, options) {

        const lots = await this.orm.searchRead("stock.lot", [["product_id", "=", product.id],], ["name", "expiration_date"]);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (const lot of lots) {

            if (lot.expiration_date) {

                const expiryDate = new Date(lot.expiration_date);
                expiryDate.setHours(0, 0, 0, 0);

                if (expiryDate < today) {

                    this.dialog.add(AlertDialog, {
                        title: _t("Expired Product"),
                        body: _t(
                            `The product "${product.display_name}" has an expired lot "${lot.name}" and cannot be sold.`
                        ),
                    });

                    return;
                }
            }
        }

        await super.addProductToOrder(product, options);
    },
});