/**
 * VTK.js 模块类型声明垫片
 *
 * vtk.js v35 部分子路径模块缺少官方 .d.ts 文件，
 * 在此统一声明为 any，避免 TS7016 编译错误。
 * 待 vtk.js 官方补全类型后可逐步删除对应条目。
 */

declare module "@kitware/vtk.js/Filters/General/OBBTree"
declare module "@kitware/vtk.js/IO/XML/XMLPolyDataWriter"
declare module "@kitware/vtk.js/IO/XML/XMLWriter"
declare module "@kitware/vtk.js/Interaction/Manipulators"
declare module "@kitware/vtk.js/IO/Geometry/STLWriter/Constants"
declare module "@kitware/vtk.js/macros2.js"
declare module "@kitware/vtk.js/Widgets/Representations/SplineContextRepresentation.js"
declare module "@kitware/vtk.js/Widgets/Representations/SphereHandleRepresentation.js"
declare module "@kitware/vtk.js/Widgets/Widgets3D/SplineWidget/behavior.js"
declare module "@kitware/vtk.js/Widgets/Widgets3D/SplineWidget/state.js"
