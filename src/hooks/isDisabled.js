export default function isDisabled(target, attrName = "aria-disabled") {
    const disabled = target.getAttribute(attrName)
    if (disabled === "true") {
        return true
    } else if (disabled === "false") {
        return false
    }
    return false
}
