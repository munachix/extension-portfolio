# Permission justifications
**Single purpose:** shows sold-price links, a fee/profit calculator and a summary of sold prices on marketplace pages the user is viewing.
| Permission | Justification |
|---|---|
| `storage` | Saves the user's cost/shipping defaults, fee overrides, inventory log and license status locally. |
| Content scripts on ebay.com, poshmark.com, mercari.com, depop.com, etsy.com | Reads the title/price of the listing, or the prices on a sold-results page, that the user is viewing. Nothing is sent anywhere. |
| Host: license server | Verifies a Pro license key (Creem). Only the key and a random browser id are sent. |
No background requests to marketplaces. **Remote code:** none.
