# Permission justifications
**Single purpose:** helps find the cause of a reconciliation difference on the QuickBooks Online Reconcile screen.
| Permission | Justification |
|---|---|
| `storage` | License status. |
| Content script on qbo.intuit.com | Reads the Difference and the transactions shown on the Reconcile screen the user has open, highlights suspect rows, and sets readable tab titles. Never clicks, edits or saves. Nothing is transmitted. |
| Host: license server | Verifies a Pro license key (Creem). Only the key and a random browser id are sent. |
**Remote code:** none.
