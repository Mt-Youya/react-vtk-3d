import ARIA_NAME from "@/constants/aria-name.js"

export default (function () {
    function returnTarget(target) {
        if (target !== this) {
            return returnTarget.call(this, target.parentElement)
        }
        return target
    }

    const AriaName = ARIA_NAME.Expanded

    return function useNextSiblingClick(e) {
        const target = returnTarget.call(this, e.target)
        const sibling = target.nextElementSibling
        const expanded = sibling.getAttribute(AriaName)
        if (expanded === "true") {
            sibling.setAttribute(AriaName, "false")
        } else {
            sibling.setAttribute(AriaName, "true")
        }
    }
})()
