# `<tap-dialog>`

Modal dialog component. Provides title, message body, confirmation and cancel buttons, and supports imperative static method calls.

## Example

<gbp-example name="tap-dialog" src="https://esm.sh/@mantou/tap-ui/elements/dialog, https://esm.sh/@mantou/tap-ui/elements/button">

```json
[
  {
    "tagName": "tap-button",
    "innerHTML": "Open Dialog",
    "@click": "(evt) => (evt.target.nextElementSibling.open = true)"
  },
  {
    "open": true,
    "maskClosable": true,
    "header": "Confirm Action",
    "body": "Are you sure you want to proceed? This action cannot be undone.",
    "okText": "Confirm",
    "cancelText": "Cancel",
    "@close": "(evt) => (evt.target.open = false)",
    "@ok": "(evt) => (evt.target.open = false)",
    "@maskclick": "(evt) => (evt.target.open = false)"
  }
]
```

</gbp-example>

### Imperative Calling

```ts
import { TapDialogElement } from '@mantou/tap-ui/elements/dialog';

// Open a general dialog
TapDialogElement.open({
  header: 'Notice',
  body: 'Operation completed successfully!',
});

// Confirm dialog
TapDialogElement.confirm({
  header: 'Warning',
  body: 'This action will permanently delete data. Continue?',
  dangerDefaultOkBtn: true,
  onOk: () => {
    console.log('Confirmed');
  },
});
```

## API

<gbp-api name="tap-dialog" src="/src/elements/dialog.ts"></gbp-api>
