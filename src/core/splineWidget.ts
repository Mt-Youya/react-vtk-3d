import { m as macro } from "@kitware/vtk.js/macros2.js"
import vtkAbstractWidgetFactory from "@kitware/vtk.js/Widgets/Core/AbstractWidgetFactory.js"
import vtkPlanePointManipulator from "@kitware/vtk.js/Widgets/Manipulators/PlaneManipulator.js"
import vtkSplineContextRepresentation from "@kitware/vtk.js/Widgets/Representations/SplineContextRepresentation.js"
import vtkSphereHandleRepresentation from "@kitware/vtk.js/Widgets/Representations/SphereHandleRepresentation.js"
import widgetBehavior from "@kitware/vtk.js/Widgets/Widgets3D/SplineWidget/behavior.js"
import generateState from "@kitware/vtk.js/Widgets/Widgets3D/SplineWidget/state.js"
import { ViewTypes } from "@kitware/vtk.js/Widgets/Core/WidgetManager/Constants.js"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

type Point3D = [number, number, number]

function vtkSplineWidget(publicAPI: AnyObj, model: AnyObj): void {
    model.classHierarchy.push("vtkSplineWidget")
    const superClass = {
        ...publicAPI,
    }

    model.methodsToLink = [
        "boundaryCondition",
        "close",
        "outputBorder",
        "fill",
        "borderColor",
        "errorBorderColor",
        "scaleInPixels",
    ]
    publicAPI.getRepresentationsForViewType = (viewType: unknown) => {
        switch (viewType) {
            case ViewTypes.DEFAULT:
            case ViewTypes.GEOMETRY:
            case ViewTypes.SLICE:
            case ViewTypes.VOLUME:
            default:
                return [
                    {
                        builder: vtkSphereHandleRepresentation,
                        labels: ["handles", "moveHandle"],
                    },
                    {
                        builder: vtkSplineContextRepresentation,
                        labels: ["handles", "moveHandle"],
                    },
                ]
        }
    }

    publicAPI.setManipulator = (manipulator: AnyObj) => {
        superClass.setManipulator(manipulator)
        model.widgetState.getMoveHandle().setManipulator(manipulator)
        model.widgetState.getHandleList().forEach((handle: AnyObj) => {
            handle.setManipulator(manipulator)
        })
    }

    publicAPI.addPoints = (points: Point3D[]) => {
        for (const p of points) {
            const lastHandle = model.widgetState.addHandle()
            lastHandle.setOrigin(p)
        }
    }

    publicAPI.setManipulator(
        model.manipulator ||
            vtkPlanePointManipulator.newInstance({
                useCameraNormal: true,
            }),
    )
}

const defaultValues = (initialValues: AnyObj) => ({
    freehandMinDistance: 0.1,
    allowFreehand: false,
    resolution: 32,
    defaultCursor: "pointer",
    handleSizeInPixels: 10,
    resetAfterPointPlacement: false,
    behavior: widgetBehavior,
    widgetState: generateState(),
    ...initialValues,
})

function extend(publicAPI: AnyObj, model: AnyObj, initialValues: AnyObj = {}): void {
    Object.assign(model, defaultValues(initialValues))
    vtkAbstractWidgetFactory.extend(publicAPI, model, initialValues)
    macro.setGet(publicAPI, model, [
        "manipulator",
        "freehandMinDistance",
        "allowFreehand",
        "resolution",
        "defaultCursor",
        "handleSizeInPixels",
        "resetAfterPointPlacement",
    ])
    vtkSplineWidget(publicAPI, model)
}

const newInstance = macro.newInstance(extend, "vtkSplineWidget")

const vtkSplineWidget$1 = {
    newInstance,
    extend,
}

export { vtkSplineWidget$1 as default, extend, newInstance }
