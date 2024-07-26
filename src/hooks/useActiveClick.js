import ARIA_NAME from "@/constants/aria-name"

export default (function() {
    const AriaName = ARIA_NAME.Selected
    const ParentRoleName = "listitem"

    return function useActiveClick(e, callback) {
        if (e.target === this) return
        const target = e.target
        const role = target.role
        if (role === "img") {
            const src = target.src
            const visible = target.dataset.visible
            if (src.includes("Close")) {
                target.src = src.replace("Close", "")
                if (visible === "false") {
                    target.dataset.visible = "true"
                }
            } else {
                target.src = src.replace("Eye", "EyeClose")
                if (visible === "true") {
                    target.dataset.visible = "false"
                }
            }
        } else {
            const parent = target.parentElement.role === ParentRoleName ? target.parentElement.parentElement : target.parentElement
            const siblings = [...parent.children].filter(el => el.role === ParentRoleName && el !== target)

            const activeTarget = target.parentElement.role === ParentRoleName ? target.parentElement : target

            for (const sibling of siblings) {
                sibling.setAttribute(AriaName, "false")
            }

            activeTarget.setAttribute(AriaName, "true")

        }

        callback && callback()
    }
})()
