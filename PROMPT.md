## Task description

Help me write an Autoconsent rule for the CMP located at the provided URL.

First, use the navigate tool to navigate to the site.

Then, use the screenshot tool to see the consent notice.

Then, use the search_html and print_element tools search the HTML for text that appears in the consent notice and inspect the consent popup HTML.

Next, create an Autoconsent rule. Once we have a draft rule, test it using the test_rule tool to see if it works correctly.

Note that test_rule will run the rule in a separate browser page and will not affect the page that you previously navigated to. Screenshotting, clicking, and other tools will not work in the test_rule page.

There is no way to test the optIn functionality of a rule, so don't bother with this for now.

## Example Autoconsent rules

```json
{
  "name": "simple-cmp",
  "detectCmp": [{ "exists": "#cookie-banner" }],
  "detectPopup": [{ "visible": "#cookie-banner" }],
  "optOut": [{ "click": "#reject-all" }],
  "optIn": [{ "click": "#accept-all" }]
}
```

```json
{
  "name": "multi-step-cmp",
  "detectCmp": [{ "exists": "#cookie-banner" }],
  "detectPopup": [{ "visible": "#cookie-banner" }],
  "optOut": [
    { "click": "#manage-preferences" },
    { "waitForThenClick": ".reject-all" }
  ],
  "optIn": [{ "click": "#accept-all" }]
}
```

```json
{
    "name": "advanced-settings-cmp",
    "detectCmp": [{ "exists": "#cookie-banner" }],
    "detectPopup": [{ "visible": "#cookie-banner" }],
    "optIn": [{ "waitForThenClick": "#accept-all" }],
    "optOut": [
      {
          "click": "#settings-button"
      },
      {
        "waitForVisible": "#settings-dialog"
      },
      {
          "click": "#settings-dialog input[type=checkbox]:not([disabled]):checked",
          "all": true,
          "optional": true
      },
      {
          "click": "#save-button"
      }
    ]
}
```

## Rule syntax reference

An Autoconsent CMP rule is written as a JSON file adhering to the `AutoConsentCMPRule` type.

A JSON rule has the following components:

* `name` - to identify this CMP.
* `detectCMP` - which determines if this CMP is included on the page.
* `detectPopup` - which determines if a popup is being shown by the CMP.
* `optOut` - a list of actions to do an 'opt-out' from the popup screen. i.e. denying all consents possible.
* `optIn` - a list of actions for an 'opt-in' from the popup screen.
* (optional) `prehideSelectors` - a list of CSS selectors to "pre-hide" early before detecting a CMP. This helps against flickering. Pre-hiding is done using CSS `opacity` and `z-index`, so it should be used with care to prevent conflicts with the opt-out process.
* (optional) `intermediate` - a boolean flag indicating that the ruleset is part of a multi-stage process. This is `false` by default.
* (optional) `vendorUrl` - link to the CMP vendor site, for reference.
* (optional) `cosmetic` - a boolean flag indicating that the rule is purely cosmetic and does not affect the consent state. This is `false` by default.
* (optional) `runContext` - an object describing when this rule should be tried:
  * `main` - boolean, set to `true` if the rule should be executed in top-level documents (default: `true`)
  * `frame` - boolean, set to `true` if the rule should be executed in nested frames (default: `false`)
  * `urlPattern` - string, specifies a regular expression that should match the page URL (default: empty)
* (optional) `test` - a list of actions to verify a successful opt-out. This is currently only used in Playwright tests.

`detectCMP`, `detectPopup`, `optOut`, `optIn`, and `test` are defined as a set of checks or actions on the page. These are lists of `AutoConsentRuleStep` objects. For `detect` checks, we return true for the check if all steps return true. For opt in and out, we execute actions in order, exiting if one fails. The following checks/actions are supported:

### Element selectors

Many rules use `ElementSelector` to locate elements in a page. `ElementSelector` can be a string, or array of strings, which are used to locate elements as follows:

- By default, strings are treated as CSS Selectors via the `querySelector` API. e.g. `#reject-cookies` to find an element whose `id` is 'reject-cookies'.
- Strings prefixed with `xpath/` are Xpath selectors which can locate elements in the page via `document.evaluate`. e.g. `xpath///*[@id="reject-cookies"]` can find an element whose `id` is 'reject-cookies'.
- If an array of strings is given, the selectors are applied in array order, with the search scope constrained each time but the first match of the previous selector. e.g. `['#reject-cookies', 'button']` first looks for an element with `id="reject-cookies"`, then looks for a match for `button` _that is a descendant_ of that element. Compared to normal CSS selectors, this allows piercing shadow DOM and iframes:
  - If one of the selectors returns an element that has a non-null `shadowRoot` property (open shadow DOM), the next selector will run within that element's shadow DOM.
  - If one of the selectors returns an iframe element with a non-null `contentDocument` property (same-origin iframe), the next selector will run within that iframe's document.

For example, consider the following DOM fragment:
```html
<open-shadow-root-element>
 <button>X</button>
</open-shadow-root-element>
```

Then `['open-shadow-root-element', 'button']` will find the button, but a usual CSS selector `'open-shadow-root-element button'` will not.

### Element exists

```javascript
{
  "exists": ElementSelector
}
```
Returns true if the given selector matches one or more elements.

### Element visible

```javascript
{
  "visible": ElementSelector,
  "check": "any" | "all" | "none"
}
```
Returns true if elements matched by ElementSelector are currently visible on the page. If `check` is `all` (default), every element must be visible. If `check` is `none`, no element should be visible. Visibility check is a CSS-based heuristic.

### Wait for element

```javascript
{
  "waitFor": ElementSelector,
  "timeout": 1000
}
```
Waits until `selector` exists in the page. After `timeout` ms the step fails.

### Wait for visibility

```javascript
{
  "waitForVisible": ElementSelector,
  "timeout": 1000,
  "check": "any" | "all" | "none"
}
```
Waits until element is visible in the page. After `timeout` ms the step fails.

### Click an element
```javascript
{
  "click": ElementSelector,
  "all": true | false,
}
```
Click on an element returned by `selector`. If `all` is `true`, all matching elements are clicked. If `all` is `false`, only the first returned value is clicked.

### Wait for then click
```javascript
{
  "waitForThenClick": ElementSelector,
  "timeout": 1000,
  "all": true | false
}
```
Combines `waitFor` and `click`.

### Unconditional wait
```javascript
{
  "wait": 1000,
}
```
Wait for the specified number of milliseconds.

### Hide
```javascript
{
  "hide": "CSS selector",
  "method": "display" | "opacity"
}
```
Hide the elements matched by the selectors. `method` defines how elements are hidden: "display" sets `display: none`, "opacity" sets `opacity: 0`. Method is "display" by default. Note that only a single string CSS selector is supported here, not an array.

### Cookie match
```javascript
{
  "cookieContains": "substring"
}
```
Checks if the substring is present in the document.cookie string.

### Eval

```javascript
{
  "eval": "SNIPPET_ID"
}
```
Evaluates a code snippet in the context of the page. The rule is considered successful if it *evaluates to a truthy value*. Snippets have to be explicitly defined in snippets.ts.
Eval rules are not 100% reliable because they can be affected by the page scripts, or blocked by a CSP policy on the page. Therefore, they should only be used as a last resort when none of the other rules are sufficient.

### Conditionals

```javascript
{
  "if": { "exists": ElementSelector },
  "then": [
    { "click": ".button1" },
    { "click": ".button3" }
  ],
  "else": [
    { "click": ".button2" }
  ]
}
```

Allows to do conditional branching in JSON rules. The `if` section can contain either a "visible" or "exists" rule. Depending on the result of that rule, `then` or `else` sequences will be executed. `else` section is optional.
The "if" rule is considered successful as long as all rules inside the chosen branch are successful. The other branch, as well as the result of the condition itself, do not affect the result of the whole rule.

### Any

```javascript
{
  "any": [
    { "exists": ".button1" },
    { "exists": ".button2" }
  ]
}
```

Evaluates a list of steps in order. If any return true (success), then the step returns true. If all steps return false, the `any` step returns false.

### Negation

```javascript
{
  "negated": true | false
}
```

If `negated` is true, the result will be inverted. For example, `{ "exists": ".my-class", "negated": true }` will return true if `.my-class` does not exist.

### Optional actions

All rules can include the `"optional": true` to ignore failure.
