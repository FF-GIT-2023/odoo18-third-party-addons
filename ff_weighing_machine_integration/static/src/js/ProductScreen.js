/** @odoo-module **/
import { patch } from "@web/core/utils/patch";
import { ProductScreen } from "@point_of_sale/app/screens/product_screen/product_screen";
import { useService } from "@web/core/utils/hooks";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";


patch(ProductScreen.prototype, {
setup() {
    super.setup();
        this._boundKeyPressHandler = this._onKeyPress.bind(this);
        window.addEventListener("keydown", this._boundKeyPressHandler);
        },

    willUnmount() {
                super.willUnmount();
                window.removeEventListener("keydown", this._boundKeyPressHandler);
            },
    _onKeyPress(event) {
                if (event.key === "Tab") {
                    event.preventDefault();
                    const order = this.pos.get_order();
                    const orderline = order.get_selected_orderline();
                    if (!orderline) {
                        this.dialog.add(AlertDialog, {
                            title: _t("Empty Order"),
                            body: _t("Please add a product first."),
                        });
                        return;
                    }
                    fetch("http://192.168.1.171:5000/weight")
                        .then(response => response.json())
                        .then(data => {
                            if (data.weight) {
                                const order = this.pos.get_order();
                                const orderline = order.get_selected_orderline();
                                if (orderline) {
                                    orderline.set_quantity(parseFloat(data.weight));
                                }
                            }
                        }).catch(err => {
                            console.error("Error fetching weight:", err);
                        });

                }
            }
});










//odoo.define("ff_weighing_machine_integration.weighing_machine_integration", function (require) {
//    "use strict";
//
//    const ProductScreen = require("point_of_sale.ProductScreen");
//    const Registries = require("point_of_sale.Registries");
//
//    const ProductScreenExtend = (ProductScreen) =>
//        class extends ProductScreen {
//            setup() {
//                super.setup(...arguments);
//                this._boundKeyPressHandler = this._onKeyPress.bind(this);
//                window.addEventListener("keydown", this._boundKeyPressHandler);
//            }
//
//            willUnmount() {
//                super.willUnmount();
//                window.removeEventListener("keydown", this._boundKeyPressHandler);
//            }
//
//            _onKeyPress(event) {
//                if (event.key === "Tab") {
//                    event.preventDefault();
//                    const order = this.env.pos.get_order();
//                    const orderline = order.get_selected_orderline();
//                    if (!orderline) {
//                        this.showPopup("ErrorPopup", {
//                            title: this.env._t("Empty Order"),
//                            body: this.env._t("Please add a product first."),
//                        });
//                        return;
//                    }
//                    fetch("http://192.168.1.171:5000/weight")
//                        .then(response => response.json())
//                        .then(data => {
//                            if (data.weight) {
//                                const order = this.env.pos.get_order();
//                                const orderline = order.get_selected_orderline();
//                                if (orderline) {
//                                    orderline.set_quantity(parseFloat(data.weight));
//                                }
//                            }
//                        }).catch(err => {
//                            console.error("Error fetching weight:", err);
//                        });
//
//                }
//            }
//        };
//
//    Registries.Component.extend(ProductScreen, ProductScreenExtend);
//    return ProductScreenExtend;
//});
