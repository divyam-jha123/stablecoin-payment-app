# Traveller API

The Traveller API turns scanned UPI payment QR codes into normalized merchant and payment details for the Traveller payment experience.

## QR parsing

`POST /v1/qr/parse` accepts the raw value produced by a QR scanner.

Request:

```json
{
  "qrData": "upi://pay?pa=coffee@bank&pn=Coffee%20House&am=250.50&cu=INR"
}
```

Response:

```json
{
  "data": {
    "merchant": {
      "name": "Coffee House",
      "vpa": "coffee@bank",
      "verificationStatus": "unverified"
    },
    "payment": {
      "currency": "INR",
      "inrAmount": "250.50",
      "amountEntryRequired": false
    }
  }
}
```

If the QR does not contain an amount, `inrAmount` is `null` and `amountEntryRequired` is `true` so the traveller can enter the payment amount.

## Validation and errors

The parser accepts standard `upi://pay` payloads, validates the payee address, merchant name, optional amount, and INR currency, and rejects ambiguous duplicate fields. Additional QR metadata is not treated as trusted instructions.

All errors use this shape:

```json
{
  "error": {
    "code": "INVALID_UPI_QR",
    "message": "Scan a UPI payment QR"
  }
}
```

Relevant status codes:

| Status | Meaning                                   |
| ------ | ----------------------------------------- |
| `400`  | Invalid JSON structure or invalid UPI QR  |
| `404`  | Route not found                           |
| `405`  | HTTP method not supported by the route    |
| `413`  | Request body exceeds the configured limit |
| `415`  | Request is not `application/json`         |
| `500`  | Unexpected server error                   |

## Merchant-data safety

The merchant name and VPA come from the scanned QR and are returned with `verificationStatus: "unverified"`. Successful parsing confirms only that the data has an accepted UPI URI format; it does not prove that the VPA exists, that the merchant name is authentic, or that a merchant can receive a payout.

The endpoint only interprets the QR payload. It does not independently verify the merchant or claim that the displayed merchant has received a payment.
