/**
 * Module-level context store，替代 window.* 全局变量污染。
 * 用于在 VTK core 模块之间共享渲染上下文，避免直接挂载到 window。
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

interface CoreContext {
  renderer: AnyObj | null
  selectorDataSource: { output: AnyObj[] | null } | null
  hlCells: number[]
  apiSpecificRenderWindow: AnyObj | null
}

const ctx: CoreContext = {
  renderer: null,
  selectorDataSource: null,
  hlCells: [],
  apiSpecificRenderWindow: null,
}

export function getRenderer(): AnyObj | null {
  return ctx.renderer
}

export function setRenderer(renderer: AnyObj): void {
  ctx.renderer = renderer
}

export function getSelectorDataSource(): { output: AnyObj[] | null } | null {
  return ctx.selectorDataSource
}

export function setSelectorDataSource(ds: { output: AnyObj[] | null }): void {
  ctx.selectorDataSource = ds
}

export function getHlCells(): number[] {
  return ctx.hlCells
}

export function setHlCells(cells: number[]): void {
  ctx.hlCells = cells
}

export function clearHlCells(): void {
  ctx.hlCells = []
}

export function getApiSpecificRenderWindow(): AnyObj | null {
  return ctx.apiSpecificRenderWindow
}

export function setApiSpecificRenderWindow(rw: AnyObj): void {
  ctx.apiSpecificRenderWindow = rw
}
