import { AlertDialog } from "@web/core/confirmation_dialog/confirmation_dialog";
import { _t } from "@web/core/l10n/translation";
import { patch } from "@web/core/utils/patch";
import { PosStore } from "@point_of_sale/app/store/pos_store";

function parseExpirationDate(value) {
    if (!value) {
        return false;
    }
    const date = luxon.DateTime.fromISO(value);
    return date.isValid ? date : false;
}

patch(PosStore.prototype, {
    async addLineToOrder(vals, order, opts = {}, configure = true) {
        const line = await super.addLineToOrder(...arguments);
        if (opts.code?.type === "lot" && line) {
            await this.showExpiredLotWarning(line.product_id, {
                modifiedPackLotLines: {},
                newPackLotLines: [{ lot_name: opts.code.code }],
            });
        }
        return line;
    },

    async editLots(product, packLotLinesToEdit) {
        const result = await super.editLots(...arguments);
        await this.showExpiredLotWarning(product, result);
        return result;
    },

    async showExpiredLotWarning(product, lotChanges) {
        if (!this.config.lot_expiration_warning || !product || !lotChanges) {
            return;
        }

        const selectedLotNames = [
            ...Object.values(lotChanges.modifiedPackLotLines || {}),
            ...(lotChanges.newPackLotLines || []).map((lot) => lot.lot_name),
        ].filter(Boolean);
        if (!selectedLotNames.length) {
            return;
        }

        const existingLots = await this.getExpirationWarningLots(product, selectedLotNames);
        const now = luxon.DateTime.now();
        const expiredLots = selectedLotNames
            .map((lotName) => existingLots.find((lot) => lot.name === lotName))
            .filter((lot) => {
                const expirationDate = parseExpirationDate(lot?.expiration_date);
                return expirationDate && expirationDate <= now;
            });

        if (!expiredLots.length) {
            return;
        }

        const body = expiredLots
            .map((lot) => {
                const expirationDate = parseExpirationDate(lot.expiration_date);
                return _t(
                    "The lot/serial number %(lot_name)s for product %(product_name)s expired on %(expiration_date)s. Please verify before selling.",
                    {
                        lot_name: lot.name,
                        product_name: product.display_name,
                        expiration_date: expirationDate.toFormat("yyyy-MM-dd HH:mm:ss"),
                    }
                );
            })
            .join("\n\n");

        this.dialog.add(AlertDialog, {
            title: _t("Expired Lot/Serial Number"),
            body,
        });
    },

    async getExpirationWarningLots(product, lotNames) {
        try {
            return await this.data.call("pos.order.line", "get_lot_expiration_warning_data", [
                this.company.id,
                product.id,
                lotNames,
            ]);
        } catch {
            return [];
        }
    },
});
