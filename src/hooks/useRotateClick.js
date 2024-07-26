import getParentElement from "@/utils/getParentElement"
import ARIA_NAME from "@/constants/aria-name.js"

export default (function() {
    const AriaName = ARIA_NAME.Expanded
    return function useRotateClick(e) {
        const target = getParentElement.call(this, e.target)
        const img = [...target.children].find(child => child.getAttribute("role") === "img")
        const expanded = target.getAttribute(AriaName)
        if (expanded === "true") {
            img.classList.toggle("rotate-90")
            target.setAttribute(AriaName, "false")
        } else {
            img.classList.toggle("rotate-90")
            target.setAttribute(AriaName, "true")
        }
    }
})()
