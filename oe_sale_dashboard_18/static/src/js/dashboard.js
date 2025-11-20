/** @odoo-module **/
/* This module is under copyright of 'OdooElevate' */

import { registry } from "@web/core/registry";
import { Component, useState, onMounted, useRef } from "@odoo/owl";
import { useService } from "@web/core/utils/hooks";
import { _t } from "@web/core/l10n/translation";

// Get the action registry for registering our component
const actionRegistry = registry.category("actions");

class OeSaleDashboard extends Component {
    setup() {
        super.setup();
        // Initialize state variables for selected date and fetched data
        const today = new Date().toISOString().split('T')[0];
        this.state = useState({
            selectedDate: today,
            postedSalesData: [],
            unpostedSalesData: [],
            quotationsData: [],
            isLoading: false,
        });

        // Odoo services
        this.orm = useService("orm");
        this.notification = useService("notification");

        // Currency formatter for display
        this.currencyFormatter = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
            useGrouping: true
        });

        // Load dashboard data when the component is mounted
        onMounted(async () => {
            console.log("OE Sales Dashboard - Selected Date (default):", this.state.selectedDate);
            await this._loadDashboardData(this.state.selectedDate);
        });
    }

    /**
     * Formats a number as currency.
     * @param {number} value - The number to format.
     * @returns {string} - The formatted string.
     */
    formatNumber(value) {
        return this.currencyFormatter.format(value);
    }

    /**
     * Handles the change event of the date input.
     * Updates the selected date and reloads dashboard data.
     * @param {Event} ev - The change event.
     */
    onDateChange(ev) {
        this.state.selectedDate = ev.target.value;
        this._loadDashboardData(this.state.selectedDate);
    }

    /**
     * Calculates the start and end dates for various periods relative to a report date.
     * Periods include 'today', 'yesterday', 'last_week', 'last_month', 'last_year_fiscal'.
     * Assumes fiscal year starts on July 1st.
     * @param {string} reportDateStr - The reference date in 'YYYY-MM-DD' format.
     * @returns {object} An object containing date ranges for each period.
     */
    _calculateDateRanges(reportDateStr) {
        const reportDate = new Date(reportDateStr);
        reportDate.setHours(0, 0, 0, 0); // Normalize to start of day (25 June 2025 00:00:00)

        const ranges = {};

        // Today: selected date (e.g., 25 June 2025)
        ranges.today = {
            start: new Date(reportDate),
            end: new Date(reportDate.getFullYear(), reportDate.getMonth(), reportDate.getDate(), 23, 59, 59, 999)
        };

        // Yesterday: day before selected date (e.g., 24 June 2025)
        const yesterday = new Date(reportDate);
        yesterday.setDate(reportDate.getDate() - 1);
        ranges.yesterday = {
            start: new Date(yesterday),
            end: new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate(), 23, 59, 59, 999)
        };

        // Last Week: last 7 days from (selected_date - 1), meaning selected_date - 7 to selected_date - 1
        // Example: if selected date is 25 June 2025, need 18 June 2025 - 24 June 2025
        const lastWeekEnd = new Date(reportDate);
        lastWeekEnd.setDate(reportDate.getDate() - 1); // Day before selected date (24 June 2025)
        lastWeekEnd.setHours(23, 59, 59, 999);

        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6); // 7 days ending yesterday (18 June 2025)
        lastWeekStart.setHours(0, 0, 0, 0);
        ranges.last_week = { start: lastWeekStart, end: lastWeekEnd };

        // Last Month: from 1st day of current month to (selected_date - 1)
        // Example: if selected date is 25 June 2025, need 1 June 2025 - 24 June 2025
        const lastMonthStart = new Date(reportDate.getFullYear(), reportDate.getMonth(), 1);
        const lastMonthEnd = new Date(reportDate);
        lastMonthEnd.setDate(reportDate.getDate() - 1); // Day before selected date
        lastMonthEnd.setHours(23, 59, 59, 999);
        ranges.last_month = { start: lastMonthStart, end: lastMonthEnd };

        // Last Year (Fiscal Year: July 1st to (selected_date - 1) of current fiscal year)
        // Example 1: if selected date is 25 June 2025, need 1 July 2024 - 24 June 2025
        // Example 2: if selected date is 25 October 2025, need 1 July 2025 - 24 October 2025
        let fiscalYearStart;
        const currentYear = reportDate.getFullYear();
        const currentMonth = reportDate.getMonth(); // 0-indexed

        if (currentMonth + 1 >= 7) { // Current date is in fiscal year (July - Dec)
            fiscalYearStart = new Date(currentYear, 6, 1); // July 1st of current calendar year
        } else { // Current date is in fiscal year (Jan - Jun)
            fiscalYearStart = new Date(currentYear - 1, 6, 1); // July 1st of previous calendar year
        }
        fiscalYearStart.setHours(0, 0, 0, 0);

        const fiscalYearEnd = new Date(reportDate);
        fiscalYearEnd.setDate(reportDate.getDate() - 1); // Day before selected date
        fiscalYearEnd.setHours(23, 59, 59, 999);

        ranges.last_year_fiscal = { start: fiscalYearStart, end: fiscalYearEnd };


        // Format dates to YYYY-MM-DD HH:MM:SS for Odoo domain comparison
        const formatForOdoo = (date) => date.toISOString().slice(0, 19).replace('T', ' ');

        for (const key in ranges) {
            ranges[key].startStr = formatForOdoo(ranges[key].start);
            ranges[key].endStr = formatForOdoo(ranges[key].end);
        }

        return ranges;
    }

    /**
     * Fetches sales data for a specific company and period.
     * @param {number} companyId - The ID of the company.
     * @param {string} start_date_str - The start date of the period in YYYY-MM-DD HH:MM:SS format.
     * @param {string} end_date_str - The end date of the period in YYYY-MM-DD HH:MM:SS format.
     * @param {Array} baseDomain - The base domain for the sales order query (e.g., state, invoice_status).
     * @returns {number} The total amount for the given period.
     */
    async _fetchSalesByCompanyAndPeriod(companyId, start_date_str, end_date_str, baseDomain) {
        let domain = [
            ['company_id', '=', companyId],
            ['date_order', '>=', start_date_str],
            ['date_order', '<=', end_date_str],
            ...baseDomain
        ];

        // Fetch sales orders
        const salesOrders = await this.orm.searchRead(
            "sale.order",
            domain,
            ['amount_total']
        );

        // Sum the total amount
        let total = 0.0;
        for (const order of salesOrders) {
            total += order.amount_total;
        }
        return total;
    }

    /**
     * Loads all dashboard data (posted, unposted, quotations) for the selected date.
     * @param {string} reportDateStr - The reference date string (YYYY-MM-DD).
     */
    async _loadDashboardData(reportDateStr) {
        this.state.isLoading = true;
        try {
            const companies = await this.orm.searchRead(
                "res.company",
                [],
                ['id', 'name']
            );

            // Calculate date ranges once for all data fetching
            const dateRanges = this._calculateDateRanges(reportDateStr);

            const postedSales = [];
            const unpostedSales = [];
            const quotations = [];

            for (const company of companies) {
                const companyId = company.id;
                const companyName = company.name;

                // Fetch Posted Sale Orders
                const postedToday = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.today.startStr, dateRanges.today.endStr, [['state', '=', 'sale'], ['invoice_status', '=', 'invoiced']]);
                const postedYesterday = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.yesterday.startStr, dateRanges.yesterday.endStr, [['state', '=', 'sale'], ['invoice_status', '=', 'invoiced']]);
                const postedLastWeek = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_week.startStr, dateRanges.last_week.endStr, [['state', '=', 'sale'], ['invoice_status', '=', 'invoiced']]);
                const postedLastMonth = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_month.startStr, dateRanges.last_month.endStr, [['state', '=', 'sale'], ['invoice_status', '=', 'invoiced']]);
                const postedLastYear = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_year_fiscal.startStr, dateRanges.last_year_fiscal.endStr, [['state', '=', 'sale'], ['invoice_status', '=', 'invoiced']]);

                postedSales.push({
                    company_name: companyName,
                    Today: postedToday,
                    Yesterday: postedYesterday,
                    "Last Week": postedLastWeek,
                    "Last Month": postedLastMonth,
                    "Last Year": postedLastYear,
                });

                // Fetch Unposted Sale Orders
                const unpostedToday = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.today.startStr, dateRanges.today.endStr, [['state', '=', 'sale'], '|', ['invoice_status', '=', 'to invoice'], ['invoice_status', '=', 'no']]);
                const unpostedYesterday = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.yesterday.startStr, dateRanges.yesterday.endStr, [['state', '=', 'sale'], '|', ['invoice_status', '=', 'to invoice'], ['invoice_status', '=', 'no']]);
                const unpostedLastWeek = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_week.startStr, dateRanges.last_week.endStr, [['state', '=', 'sale'], '|', ['invoice_status', '=', 'to invoice'], ['invoice_status', '=', 'no']]);
                const unpostedLastMonth = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_month.startStr, dateRanges.last_month.endStr, [['state', '=', 'sale'], '|', ['invoice_status', '=', 'to invoice'], ['invoice_status', '=', 'no']]);
                const unpostedLastYear = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_year_fiscal.startStr, dateRanges.last_year_fiscal.endStr, [['state', '=', 'sale'], '|', ['invoice_status', '=', 'to invoice'], ['invoice_status', '=', 'no']]);

                unpostedSales.push({
                    company_name: companyName,
                    Today: unpostedToday,
                    Yesterday: unpostedYesterday,
                    "Last Week": unpostedLastWeek,
                    "Last Month": unpostedLastMonth,
                    "Last Year": unpostedLastYear,
                });

                // Fetch All Quotations
                const quotesToday = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.today.startStr, dateRanges.today.endStr, [['state', 'in', ['draft', 'sent']]]);
                const quotesYesterday = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.yesterday.startStr, dateRanges.yesterday.endStr, [['state', 'in', ['draft', 'sent']]]);
                const quotesLastWeek = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_week.startStr, dateRanges.last_week.endStr, [['state', 'in', ['draft', 'sent']]]);
                const quotesLastMonth = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_month.startStr, dateRanges.last_month.endStr, [['state', 'in', ['draft', 'sent']]]);
                const quotesLastYear = await this._fetchSalesByCompanyAndPeriod(companyId, dateRanges.last_year_fiscal.startStr, dateRanges.last_year_fiscal.endStr, [['state', 'in', ['draft', 'sent']]]);

                quotations.push({
                    company_name: companyName,
                    Today: quotesToday,
                    Yesterday: quotesYesterday,
                    "Last Week": quotesLastWeek,
                    "Last Month": quotesLastMonth,
                    "Last Year": quotesLastYear,
                });
            }

            // Calculate "Total" rows for each section
            const calculateTotals = (data) => {
                if (data.length === 0) return {
                    company_name: "Total", Today: 0, Yesterday: 0, "Last Week": 0, "Last Month": 0, "Last Year": 0
                };
                return {
                    company_name: "Total",
                    Today: data.reduce((sum, item) => sum + item.Today, 0),
                    Yesterday: data.reduce((sum, item) => sum + item.Yesterday, 0),
                    "Last Week": data.reduce((sum, item) => sum + item["Last Week"], 0),
                    "Last Month": data.reduce((sum, item) => sum + item["Last Month"], 0),
                    "Last Year": data.reduce((sum, item) => sum + item["Last Year"], 0),
                };
            };

            const postedSalesTotal = calculateTotals(postedSales);
            const unpostedSalesTotal = calculateTotals(unpostedSales);
            const quotationsTotal = calculateTotals(quotations);

            this.state.postedSalesData = [...postedSales, postedSalesTotal];
            this.state.unpostedSalesData = [...unpostedSales, unpostedSalesTotal];
            this.state.quotationsData = [...quotations, quotationsTotal];

            this.notification.add(_t(`Sales data updated for: ${this.state.selectedDate}`), { type: 'success' });

        } catch (error) {
            console.error("Error loading dashboard data:", error);
            this.notification.add(_t("Error loading sales data. Please check console for details."), { type: 'danger' });
        } finally {
            this.state.isLoading = false;
        }
    }
}

// Register the component as an Odoo client action
OeSaleDashboard.template = "oe_sale_dashboard_18.yearly_sales_dashboard_template";
actionRegistry.add("oe_sale_dashboard_18_tag", OeSaleDashboard);
