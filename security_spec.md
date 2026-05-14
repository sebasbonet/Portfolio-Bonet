# Security Specification for FolioTrack

## Data Invariants
1. A portfolio must belong to the user who created it (`userId == request.auth.uid`).
2. Holdings and Transactions must belong to an existing portfolio owned by the user.
3. Dividends are user-specific and must match `request.auth.uid`.
4. Transaction quantity and price must be positive.
5. All timestamps (`updatedAt`, `date`) must be validated against `request.time`.

## The Dirty Dozen Payloads (Rejection Targets)
1. Creating a portfolio for another user (`userId` mismatch).
2. Updating a portfolio's `userId` (Immutable).
3. Creating a transaction with a negative quantity.
4. Overwriting a transaction's `date` with a client-side past timestamp instead of `request.time` (for system fields).
5. Deleting a portfolio that doesn't belong to the user.
6. Reading another user's dividend records.
7. Injecting a 1MB string into the `symbol` field.
8. Modifying a news item (News is read-only for users, system-managed).
9. Creating a holding without a valid `symbol`.
10. Sell transaction exceeding the total quantity held (requires logic but rules can enforce non-negative result state if tracked).
11. Changing the `portfolioId` of a holding after creation.
12. Accessing data without authentication.

## Test Cases (Expected Denial)
- `create /portfolios/1 {userId: 'hacker'}` (Deny: UID mismatch)
- `update /portfolios/my_id {userId: 'hacker'}` (Deny: Immutable)
- `create /portfolios/1/transactions/tx1 {quantity: -10}` (Deny: Range check)
- `get /news/1` (Allow: Public read, but Deny: write)
