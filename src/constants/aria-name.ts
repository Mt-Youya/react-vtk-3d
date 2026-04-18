const ARIA_NAME = {
    Selected: "aria-selected",
    Expanded: "aria-expanded",
    Checked: "aria-checked",
    Disabled: "aria-disabled",
    Hidden: "aria-hidden",
    Modal: "aria-modal",
} as const

export type AriaNameKey = keyof typeof ARIA_NAME
export type AriaNameValue = (typeof ARIA_NAME)[AriaNameKey]

export default ARIA_NAME
