# Building AgentDeck: A Mobile ACP Client Powered by TapUI

[AgentDeck](https://github.com/mantou132/agent-deck) is a mobile ACP (Agent Client Protocol) client built with Tauri 2. It turns your desktop coding agents (such as Claude Code, Codex, Cursor, pi, etc.) into remote services that you can access from your mobile phone anytime, anywhere.

Building a responsive, native-feeling mobile experience on touch screens and smaller viewports is always challenging. AgentDeck chose **Gem + TapUI + Tailwind CSS** as its frontend stack. In this post, we share our experience leveraging TapUI's component system and mobile-first infrastructure to build a fluid, lightweight mobile application.

---

## 1. Why TapUI?

When developing mobile web or hybrid apps (via Tauri or Capacitor), developers typically encounter several pain points:

1. **Desktop UI libraries are ill-fitted for mobile**: Controls are too small, and touch gestures or fluid view transitions are absent.
2. **Heavy frameworks and runtime overhead**: Traditional SPAs carry bulky virtual DOM runtimes that cause dropped frames and input latency on mobile hardware.
3. **Complex Safe Area adaptation**: Adapting to iOS Home Indicators, Android punch-hole notches, and edge-to-edge system bars usually demands tedious glue code.

TapUI is a mobile-first UI library built upon [Gem](https://github.com/mantou132/gem). Written entirely with standard Web Components and free of heavy dependencies, it provides touch gestures, stack navigation, bottom sheets, and automatic safe area handling out of the box. It was a natural fit for AgentDeck.

---

## 2. Mobile Foundation: `initApp` and Safe Area

In AgentDeck's entry point (`src/main.ts`), we initialize the mobile host environment in a single call using TapUI's `initApp`:

```ts
import { initApp } from '@mantou/tap-ui/helper/webapp';
import { html } from '@mantou/gem/lib/element';
import { startApp } from './state/app';

initApp({
  template: html`<agentdeck-app class="block h-full"></agentdeck-app>`,
});

startApp();
```

`initApp` standardizes viewport meta tags, prevents unintended pinch-zoom, and eliminates bounce/rubber-banding issues. Combined with `tauri-plugin-edge-to-edge-api`, the app extends smoothly under system bars.

---

## 3. Page Scaffolding and Stack Navigation

### `<tap-page>` and `<tap-navbar>`

Across all primary screens in AgentDeck (session list, session conversation, settings, file browser), `<tap-page>` serves as the foundational skeleton:

```ts
render = () => {
  return html`
    <tap-page class="bg-bg text-text">
      <tap-navbar
        slot="header"
        title=${this.title}
        back
        @backclick=${() => Stack.pop()}
      ></tap-navbar>

      <!-- Main page content -->
      <div class="p-4">...</div>
    </tap-page>
  `;
};
```

- `<tap-page>` manages the inner scroll container and safe-area padding automatically, preventing body scrolling collisions.
- `<tap-navbar>` standardizes title, subtitle, back navigation, and action buttons.

### `Stack`: Native-Feeling Gesture Navigation

Mobile UX relies heavily on hierarchical transitions and edge-swipe back gestures. Rather than setting up complex routing tables, AgentDeck uses TapUI's `Stack` navigation:

```ts
import { Stack } from '@mantou/tap-ui/elements/stack';

// Push a session page with edge-swipe-back enabled
export const openSession = (sessionId: string) => {
  Stack.push({
    content: html`
      <agentdeck-session-page class="block h-full" .sessionId=${sessionId}></agentdeck-session-page>
    `,
    gesture: true,
  });
};

// Open settings page
export const openSettings = () => {
  Stack.push({
    content: html`
      <agentdeck-settings-page class="block h-full" .canGoBack=${true}></agentdeck-settings-page>
    `,
    gesture: true,
  });
};
```

By enabling `gesture: true`, views gain interactive edge-swipe dismissals matching iOS and Android native conventions without writing custom touch listeners.

---

## 4. Key Interactive Components in Practice

### `<tap-swipeout>`: Swipeable Action Cards

In the session list (`session-group.ts`), users can quickly delete historic sessions. We wrap each item with `<tap-swipeout>`:

```ts
<tap-swipeout class="overflow-hidden rounded-2xl">
  <div slot="right" class="flex h-full items-stretch">
    <button
      class="flex w-16 items-center justify-center bg-negative text-white"
      @click=${() => this.#deleteSession(session.id)}
    >
      <tap-use class="size-5" .element=${icons.delete}></tap-use>
    </button>
  </div>

  <!-- Session card content -->
  <div class="session-card">...</div>
</tap-swipeout>
```

Swiping left smoothly reveals the delete action, springing back into place upon release or interaction.

### `<tap-sheet>` and `Sheet`: Bottom Drawers

On mobile screens, standard modal dialogs can obstruct context. AgentDeck houses complex secondary workflows (MCP tool execution logs, attachment selectors, session details) inside bottom sheets:

- Declarative: Use `<tap-sheet>` combined with `<tap-reflect .target=${document.body}>` to mount at root level.
- Imperative: Trigger dynamically via `Sheet.open({ content: ... })`.

### In-App Browser and Rich Media

- **`Browser.open`**: When agents return links in messages, TapUI's `Browser` modal opens them inside the app. Together with Tauri's webproxy, local dev servers can be inspected effortlessly.
- **`<tap-code-block>`**: Renders syntax-highlighted code snippets and JSON parameters with horizontal scrolling.
- **`<tap-carousel>`**: Guides new users through desktop Relay pairing in a step-by-step carousel.

---

## 5. Seamless Theme Integration with Tailwind CSS

AgentDeck uses Tailwind CSS for layout styling, while TapUI relies on CSS custom properties for theming. TapUI's `extendTheme` makes them harmonize seamlessly:

```ts
// src/styles/theme.ts
import { extendTheme } from '@mantou/tap-ui/lib/theme';
import './tailwind.css';

export const agentDeckTheme = extendTheme({
  colorScheme: 'light dark',
  primaryColor: 'var(--color-primary)',
  highlightColor: 'var(--color-highlight)',
  textColor: 'var(--color-text)',
  describeColor: 'var(--color-describe)',
  backgroundColor: 'var(--color-bg)',
  lightBackgroundColor: 'var(--color-bg-light)',
  hoverBackgroundColor: 'var(--color-bg-hover)',
  borderColor: 'var(--color-border)',
  disabledColor: 'var(--color-disabled)',
  normalRound: 'var(--radius-xl)',
});
```

By binding design tokens to CSS variables, all TapUI components and bespoke Tailwind utility classes share the same color palette and border radii, adapting automatically to dark mode.

Using `extendIcons` and `<tap-use>`, custom SVG stroke icons can be registered and rendered cleanly:

```ts
import { extendIcons } from '@mantou/tap-ui/lib/icons';

export const icons = extendIcons({
  settings: rune('...'),
  folder: rune('...'),
});
```

---

## 6. Practical Mobile Utilities

TapUI also bundles handy utilities in `lib/*` that simplify mobile engineering:

- **`compressionImage`**: Compresses camera photos and gallery screenshots on the client side before uploading them as agent attachments, conserving mobile bandwidth and LLM token usage.
- **`Time`**: Provides friendly relative time strings ("just now", "5 mins ago", "yesterday").
- **`loadLocale`**: Handles on-demand dynamic loading of localization dictionaries.

---

## Conclusion

Throughout AgentDeck's development, TapUI served not merely as a set of widgets, but as a **comprehensive mobile UI toolkit**.

From low-level viewport tuning in `initApp` and `Stack` edge-swipe gestures to top-level `<tap-page>`, `<tap-navbar>`, and `<tap-sheet>` components, TapUI removed the friction of mobile hybrid development, allowing us to focus on the ACP protocol and agent conversational interactions.

If you are planning to build lightweight, fast-loading mobile or desktop web applications, give [TapUI](https://github.com/mantou132/gem/tree/main/packages/tap-ui) a try!
