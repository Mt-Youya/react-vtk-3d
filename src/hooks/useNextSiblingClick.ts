import ARIA_NAME from "@/constants/aria-name"

const useNextSiblingClick: (this: HTMLElement, e: MouseEvent) => void = (function () {
    function returnTarget(this: HTMLElement, target: HTMLElement): HTMLElement {
        if (target !== this) {
            return returnTarget.call(this, target.parentElement as HTMLElement)
        }
        return target
    }

    const AriaName = ARIA_NAME.Expanded

    return function useNextSiblingClick(this: HTMLElement, e: MouseEvent): void {
        const target = returnTarget.call(this, e.target as HTMLElement)
        const sibling = target.nextElementSibling as HTMLElement
        const expanded = sibling.getAttribute(AriaName)
        if (expanded === "true") {
            sibling.setAttribute(AriaName, "false")
        } else {
            sibling.setAttribute(AriaName, "true")
        }
    }
})()

export default useNextSiblingClick
