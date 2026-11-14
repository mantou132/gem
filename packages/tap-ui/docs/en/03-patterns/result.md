# `<tap-pat-result>`

Result page for a whole-page state, such as an operation succeeding or failing, or a missing permission. Buttons only emit events; navigating or closing is up to the caller.

## Example

<gbp-example name="tap-pat-result" src="https://esm.sh/@mantou/tap-ui/patterns/result">

```json
[
  {
    "style": "width: 100%; height: 400px",
    "status": "success",
    "heading": "Payment Successful",
    "description": "Your order has been placed and will ship within 24 hours.",
    "primary": "View Order",
    "secondary": "Back to Home"
  },
  {
    "style": "width: 100%; height: 400px",
    "status": "error",
    "heading": "Submission Failed",
    "description": "Please check your network connection and try again.",
    "primary": "Retry"
  }
]
```

</gbp-example>

## API

<gbp-api name="tap-pat-result" src="/src/patterns/result.ts"></gbp-api>
