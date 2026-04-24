/**
 * 设备信息工具
 * 统一管理设备像素比、窗口尺寸等设备相关计算
 */
export const DeviceUtils = {
  /** 获取设备像素比，默认为 1 */
  getDPR: (): number => window.devicePixelRatio || 1,

  /** 获取容器高度（窗口高度减去工具栏高度 80px） */
  getContainerHeight: (): number => window.innerHeight - 80,

  /** 获取容器高度（乘以 DPR，用于像素级计算） */
  getContainerHeightPx: (): number => DeviceUtils.getContainerHeight() * DeviceUtils.getDPR(),
}
