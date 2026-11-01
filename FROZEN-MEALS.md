# Frysta matlådor

Owner: För restaurangen → Ändra Frysta matlådor. Twenty rows accept only owner-entered dish names; empty rows are hidden from customers. Saving uses the existing atomic, owner-authorized publish_menu_section_v1 RPC. No database migration or native build. No live dishes are seeded or deleted during deployment.

Customer: Choose 1 / 5 / 10 meals at 65 / 290 / 550 kr. Use minus/plus per dish, then add exactly the package quantity. Cart and order include the selected dish quantities. Checkout reloads current availability and rejects obsolete or malformed frozen selections.

Validation: npm run verify:frozen-meals; npm run verify:closed-days; React component simulation of mixed 2+3 quantities, minus/plus limits, cart reset, 20 blank fields and draft preservation; Expo export for both iOS and Android.

Workflow: .eas/workflows/update-ios.yml publishes an OTA to production on both platforms, runtime 1.0.9.
