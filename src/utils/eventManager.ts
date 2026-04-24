/**
 * 事件监听器管理器
 * 统一管理 addEventListener / removeEventListener，防止内存泄漏
 */

type EventHandler = EventListenerOrEventListenerObject

interface ListenerRecord {
  target: EventTarget
  type: string
  handler: EventHandler
  options?: AddEventListenerOptions | boolean
}

export class EventManager {
  private listeners: ListenerRecord[] = []

  /**
   * 添加事件监听器并记录，以便后续统一清理
   */
  on(
    target: EventTarget,
    type: string,
    handler: EventHandler,
    options?: AddEventListenerOptions | boolean,
  ): this {
    target.addEventListener(type, handler, options)
    this.listeners.push({ target, type, handler, options })
    return this
  }

  /**
   * 移除指定事件监听器
   */
  off(target: EventTarget, type: string, handler: EventHandler): this {
    target.removeEventListener(type, handler)
    this.listeners = this.listeners.filter(
      (l) => !(l.target === target && l.type === type && l.handler === handler),
    )
    return this
  }

  /**
   * 清理所有已注册的事件监听器
   */
  dispose(): void {
    this.listeners.forEach(({ target, type, handler, options }) => {
      target.removeEventListener(type, handler, options)
    })
    this.listeners = []
  }

  /**
   * 返回当前已注册的监听器数量（用于调试）
   */
  get size(): number {
    return this.listeners.length
  }
}
