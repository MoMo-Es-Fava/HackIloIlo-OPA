# SMS helpers

Texts are outbound only: IRPC does not read replies.

`buildStatusMessage(order, language)` builds the order status text. Dates use Asia/Manila. Prices come from the order's locked unit price or service rates, never today's price list. A drying-only pickup message refers to palay rather than rice. Rejection reasons are included as entered by staff.

`SmsService.notifyStatusChange(order, language)` sends it to `contactPhone` and records it in `SmsLog`. With `SMS_PROVIDER=mock`, nothing is sent to TextBee.

`buildPriceReply(prices, language, riceTypes?)` lists current prices for the weekly price text. All helpers are independent of the database, network and clock.

Run tests from the repository root: `npm test -w api -- --runInBand`.
