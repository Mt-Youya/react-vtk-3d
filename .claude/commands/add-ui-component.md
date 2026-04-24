# 添加 UI 组件

基于 `@base-ui/react` + Tailwind CSS 添加新的 shadcn 风格 UI 组件到 `src/ui/` 目录。

## 使用方式

```
/add-ui-component <组件名> [描述]
```

**示例**:
- `/add-ui-component dialog 模态对话框`
- `/add-ui-component tooltip 悬浮提示`
- `/add-ui-component select 下拉选择器`

---

## 执行步骤

用户输入：**$ARGUMENTS**

### 第一步：查看现有组件

读取 `src/ui/` 目录下的现有组件（accordion.tsx、button.tsx、alert.tsx），了解：
- 组件的命名规范（命名空间导出 vs 具名导出）
- `cn()` 工具函数的使用方式（来自 `src/lib/utils.ts`）
- `cva` 的使用方式（如果需要变体）

### 第二步：确认 Base UI 是否有对应组件

查看 `node_modules/@base-ui/react/` 目录，确认目标组件是否存在：

```bash
ls node_modules/@base-ui/react/
```

**Base UI 已有组件**（截至 1.0.0-rc.0）：
`accordion`, `alert-dialog`, `checkbox`, `collapsible`, `dialog`, `field`, `fieldset`, `form`, `menu`, `number-field`, `popover`, `preview-card`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `slider`, `switch`, `tabs`, `toast`, `toggle`, `toggle-group`, `tooltip`

### 第三步：实现组件

**如果 Base UI 有对应原语**：

```typescript
import { ComponentName } from "@base-ui/react/component-name"
import { cn } from "@/lib/utils"

// 使用命名空间访问：ComponentName.Root, ComponentName.Trigger 等
const Root = React.forwardRef<...>(({ className, ...props }, ref) => (
    <ComponentName.Root
        ref={ref}
        className={cn("基础样式", className)}
        {...props}
    />
))
Root.displayName = "ComponentName"

export { Root as ComponentNameRoot, ... }
```

**如果没有对应原语**（纯样式组件）：

```typescript
import { cn } from "@/lib/utils"
import { cva, type VariantProps } from "class-variance-authority"

const componentVariants = cva("基础样式", {
    variants: {
        variant: { default: "...", ... },
        size: { sm: "...", md: "...", lg: "..." },
    },
    defaultVariants: { variant: "default", size: "md" },
})

interface ComponentProps
    extends React.HTMLAttributes<HTMLDivElement>,
        VariantProps<typeof componentVariants> {}

function Component({ className, variant, size, ...props }: ComponentProps) {
    return <div className={cn(componentVariants({ variant, size }), className)} {...props} />
}
```

### 第四步：动画（如需要）

Base UI 组件支持以下 CSS 数据属性实现进入/退出动画：
- `data-open` / `data-closed` — 开关状态
- `data-starting-style` — 进入动画起始帧
- `data-ending-style` — 退出动画结束帧

```css
/* 在 src/styles/global.css 中添加 */
[data-starting-style] { opacity: 0; transform: scale(0.95); }
[data-ending-style] { opacity: 0; transform: scale(0.95); }
```

### 第五步：事件处理最佳实践

**React 组件**：优先使用直接 `onClick` 绑定，而非事件委托：

```typescript
// ✅ 推荐：直接绑定
<button onClick={handleClick}>
  <Icon /> 文字
</button>

// ❌ 避免：ul 上的事件委托（无法处理 SVG 图标点击）
<ul onClick={handleActionsClick}>
  <li data-action="xxx"><Icon /> 文字</li>
</ul>
```

**非 React 组件（纯 TS 类）**：
- 多元素点击：使用**事件委托**（父元素统一监听）
- 单元素点击：使用 `onclick` 直接绑定

```typescript
// 事件委托（减少监听器数量）
parent.addEventListener("click", (e) => {
    const target = (e.target as HTMLElement).closest(".item-class")
    if (!target) return
    // 处理点击
})

// 单元素直接绑定
element.onclick = () => { /* ... */ }
```

### 第六步：验证

运行 `pnpm build:dev` 确认无 TypeScript 错误。

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/ui/accordion.tsx` | Base UI 命名空间组件参考 |
| `src/ui/button.tsx` | cva 变体组件参考 |
| `src/ui/alert.tsx` | 带 GSAP 动画的组件参考 |
| `src/lib/utils.ts` | `cn()` 合并 className 工具 |
| `src/styles/global.css` | 全局动画关键帧 |
