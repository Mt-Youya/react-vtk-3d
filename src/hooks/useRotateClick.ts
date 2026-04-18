import ARIA_NAME from "@/constants/aria-name"

function getParentElement(this: HTMLElement, target: HTMLElement): HTMLElement {
    if (target !== this) {
        return getParentElement.call(this, target.parentElement as HTMLElement)
    }
    return target
}

const useRotateClick: (this: HTMLElement, e: MouseEvent) => void = (function () {
    const AriaName = ARIA_NAME.Expanded

    return function useRotateClick(this: HTMLElement, e: MouseEvent): void {
        const target = getParentElement.call(this, e.target as HTMLElement)
        const img = [...target.children].find(
            (child) => child.getAttribute("role") === "img",
        ) as HTMLElement | undefined
        const expanded = target.getAttribute(AriaName)
        if (expanded === "true") {
            img?.classList.toggle("rotate-90")
            target.setAttribute(AriaName, "false")
        } else {
            img?.classList.toggle("rotate-90")
            target.setAttribute(AriaName, "true")
        }
    }
})()

export default useRotateClick
