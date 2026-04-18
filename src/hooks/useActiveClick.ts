import ARIA_NAME from "@/constants/aria-name"

const useActiveClick: (this: HTMLElement, e: MouseEvent, callback?: () => void) => void = (function () {
    const AriaName = ARIA_NAME.Selected
    const ParentRoleName = "listitem"

    return function useActiveClick(this: HTMLElement, e: MouseEvent, callback?: () => void): void {
        if (e.target === this) return
        const target = e.target as HTMLElement
        const role = target.role
        if (role === "img") {
            const imgTarget = target as HTMLImageElement
            const src = imgTarget.src
            const visible = imgTarget.dataset.visible
            if (src.includes("Close")) {
                imgTarget.src = src.replace("Close", "")
                if (visible === "false") {
                    imgTarget.dataset.visible = "true"
                }
            } else {
                imgTarget.src = src.replace("Eye", "EyeClose")
                if (visible === "true") {
                    imgTarget.dataset.visible = "false"
                }
            }
        } else {
            const parent =
                target.parentElement?.role === ParentRoleName
                    ? target.parentElement.parentElement!
                    : target.parentElement!
            const siblings = [...parent.children].filter(
                (el) => (el as HTMLElement).role === ParentRoleName && el !== target,
            ) as HTMLElement[]

            const activeTarget =
                target.parentElement?.role === ParentRoleName ? target.parentElement : target

            for (const sibling of siblings) {
                sibling.setAttribute(AriaName, "false")
            }

            activeTarget.setAttribute(AriaName, "true")
        }

        callback?.()
    }
})()

export default useActiveClick
