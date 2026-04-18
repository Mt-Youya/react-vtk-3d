export default function isDisabled(target: HTMLElement, attrName = "aria-disabled"): boolean {
    const disabled = target.getAttribute(attrName)
    if (disabled === "true") {
        return true
    } else if (disabled === "false") {
        return false
    }
    return false
}
