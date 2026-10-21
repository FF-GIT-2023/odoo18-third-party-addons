import { patch } from "@web/core/utils/patch";
import { ErrorDialog } from "@web/core/errors/error_dialogs";
import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import {PosData} from "@point_of_sale/app/models/data_service";
import {ProductProduct} from "@point_of_sale/app/models/product_product";
import {PosOrderline} from "@point_of_sale/app/models/pos_order_line";
import { useService } from "@web/core/utils/hooks";
import {rpc} from "@web/core/network/rpc";
import {useEnv} from "@odoo/owl";
import {standardErrorDialogProps as error} from "../../../../../../addons/web/static/src/core/errors/error_dialogs";

patch(PosData.prototype, {
    async setup(env, {dialog}) {
        await super.setup(...arguments);
        this.models.dialog = dialog;
    },
});

patch(ProductProduct.prototype, {
    async checkProductLotExpiration(lot,product, company) {
        console.log("LOgggg:",lot, product)
        const lotData = await rpc("/web/dataset/call_kw", {
            model: "stock.lot",
            method: "search_read",
            args: [
                [
                    "|",
                    ["company_id", "=", false],
                    ["company_id", "=", company.id],
                    ["product_id", "=", product.id],
                    ["name", "=", lot],
                ],
            ],
            kwargs: {
                fields: ["id", "expiration_date", "product_id"],
            },
        });

        console.log("LOT DATA:", lotData);
        console.log("LOT DATA:", lotData[0].expiration_date);
        if (lotData[0].expiration_date) {
            const expiry = new Date(lotData[0].expiration_date);
            const today = new Date();

            expiry.setHours(0, 0, 0, 0);
            today.setHours(0, 0, 0, 0);

            if (expiry < today) {
                console.log("Expireddddddddd !!!!!!")
            }



            return false;
        }
    },
});

patch(PosOrderline.prototype, {
    async setPackLotLines({modifiedPackLotLines, newPackLotLines}) {
        console.log("usee:", this.product_id)
        console.log("newPackLotLines:", newPackLotLines)

        if (this.product_id.use_expiration_date) {
            for (const newLotLine of newPackLotLines) {
                if (
                    await this.product_id.checkProductLotExpiration(
                        newLotLine.lot_name,
                        this.product_id,
                        this.company
                    )
                ) {
                    return;
                }
            }
            for (const modifiedLotline of Object.values(modifiedPackLotLines)) {
                if (
                    await this.product_id.checkProductLotExpiration(
                        modifiedLotline,
                        this.company
                    )
                ) {
                    return;
                }
            }
        }
        return await super.setPackLotLines(...arguments);
    },
});



//     if (lotData.length === 0) {
    //         await this.models.dialog?.add(AlertDialog, {
    //             title: _t("Problem with lots"),
    //             body: _t("A lot was not found. No changes were applied."),
    //         });
    //         return true;
    //     }
    //
    //     const expiryDate = new Date(lotData[0].expiration_date.replace(" ", "T") + "Z");
    //     if (expiryDate < new Date()) {
    //         await this.models.dialog?.add(AlertDialog, {
    //             title: _t("Problem with lots"),
    //             body: _t(
    //                 "A lot is expired and you are not enabled to sell expired lots. No changes were applied."
    //             ),
    //         });
    //         return true;
    //     }



// patch(EditListInput.prototype, {
//     setup() {
//         super.setup(...arguments);
//         this.orm = this.orm || useService("orm");
//     },
//
//     async onSelectOption(optionValue) {
//         const lotName = optionValue;
//
//         let expiryMap = this.props.item.lot_expiry_map || {};
//         let lotData = expiryMap[lotName];
//         let productId = null;
//         const product = this.props.product
//         const lots = await this.orm.searchRead(
//                     "stock.lot",
//                     [["name", "=", lotName]],
//                     ["name", "expiration_date", "product_id"],
//                 );
//         console.log("lot_records:", lots)
//         if (lots && lots.length > 0) {
//                 lotData = lots[1];
//         }
//
//
//         if (!lotData) {
//             try {
//                 const lots = await this.orm.searchRead(
//                     "stock.lot",
//                     [["name", "=", lotName]],
//                     ["name", "expiration_date"]
//                 );
//
//                 if (lots && lots.length > 0) {
//                     lotData = lots[0];
//                 }
//             } catch (error) {
//                 console.error("Failed to fetch lot expiry via ORM:", error);
//             }
//         }
//
//
//         if (lotData?.expiration_date) {
//             const expiry = new Date(lotData.expiration_date);
//             const today = new Date();
//
//             expiry.setHours(0, 0, 0, 0);
//             today.setHours(0, 0, 0, 0);
//
//             if (expiry < today) {
//                 this.env.services.dialog.add(AlertDialog, {
//                     title: _t("Expired Lot"),
//                     body: _t(
//                         "Lot %s expired on %s. Please select another lot.",
//                         lotName,
//                         lotData.expiration_date
//                     ),
//                 });
//                 return;
//             }
//         }
//         return super.onSelectOption(...arguments);
//     },
// });