import pyvista as pv
import numpy as np
from PIL import Image
import math
import time
import sys
import random
from pyvista.plotting import _vtk, opts

l_color = (191, 2, 5)
u_color = (99, 108, 224)
b_color = (32, 80, 218)

def distance(p1, p2):
    x1, y1, z1 = p1
    x2, y2, z2 = p2
    return math.sqrt(math.pow(x1 - x2, 2) + math.pow(y1 - y2, 2) + math.pow(z1 - z2, 2))


def isPointInPlane(points, point):
    return abs(distanceBetweenPointToPlane(point, points)) < 0.00001


def distanceBetweenPointToPlane(point, points):
    p1 = np.array(points[0])
    p2 = np.array(points[1])
    p3 = np.array(points[2])
    v1 = p3 - p1
    v2 = p2 - p1
    cp = np.cross(v1, v2)
    a, b, c = cp
    d = -np.dot(cp, p3)
    x1, y1, z1 = point
    d = abs((a * x1 + b * y1 + c * z1 + d))
    e = (math.sqrt(a * a + b * b + c * c))
    return d/e


def normalize(vector):
    return np.array(vector) / np.linalg.norm(vector)


def normalOfPlane(points):
    p1 = np.array(points[0])
    p2 = np.array(points[1])
    p3 = np.array(points[2])
    v1 = p3 - p1
    v2 = p2 - p1
    return np.cross(v1, v2)


def sortKey(val):
    return val[2]


def angleBetweenLineAndPane(vec, a, b, c):
    norm = [a, b, c]
    origin = [0, 0, 0]
    val = np.dot(vec, norm) / (distance(vec, origin) * distance(norm, origin))
    return math.pi / 2 - math.acos(abs(val))


def checkLeft(points):
    # 找到切面的法线
    #
    # 任选 3 个点构成一个平面，然后在剩下点中找到该平面上的一个点
    # 剩下 4 个点构成另一个平行的平面
    # 从一个平面中任选一点，计算它与另一平面间的距离 w1
    # 同一个平面内 4 个点间距离，可以得到 w2, w3
    # max(w1, w2, w3) 的方向即 x 轴所在方向
    # min(w1 w2, w3) 的方向即 up 轴所在方向
    # 如果 w1 最大，则 left 为平面法线方向
    arr1 = [points[0], points[1], points[2]]
    j = 0
    for i in range(3, 7):
        if isPointInPlane(arr1, points[i]):
            arr1.append(points[i])
            j += 1
            break
    if j == 0:
        # fatal error
        return None
    arr2 = points[3:]
    arr2 = arr2[:j] + arr2[j + 1:]
    w1 = distanceBetweenPointToPlane(arr1[0], arr2)
    arr3 = [
        [0, 1, distance(arr1[0], arr1[1])],
        [1, 2, distance(arr1[1], arr1[2])],
        [2, 3, distance(arr1[2], arr1[3])],
        [3, 0, distance(arr1[3], arr1[0])],
        [0, 2, distance(arr1[0], arr1[2])],
        [1, 3, distance(arr1[1], arr1[3])],
    ]
    arr3.sort(key=sortKey)
    w2Item = arr3[0]
    w3Item = arr3[2]
    maxW = max(w1, w2Item[2], w3Item[2])
    h = None
    if (maxW == w2Item[2]):
        h = arr1[w2Item[0]] - arr1[w2Item[1]]
    elif (maxW == w3Item[2]):
        h = arr1[w3Item[0]] - arr1[w3Item[1]]
    else:
        h = normalOfPlane(arr1)
    minW = min(w1, w2Item[2], w3Item[2])
    v = None
    if (minW == w2Item[2]):
        v = arr1[w2Item[0]] - arr1[w2Item[1]]
    elif (minW == w3Item[2]):
        v = arr1[w3Item[0]] - arr1[w3Item[1]]
    else:
        v = normalOfPlane(arr1)
    return [h, v]

def save_vtp_file(txt):
    vtp_fno = random_fno() + '.vtp'
    f = open(vtp_fno, 'w')
    f.write(txt)
    f.close()
    return vtp_fno

def slice_at_center(l_vtp, u_vtp):
    # pv.set_plot_theme('paraview')
    # pv.global_theme.colorbar_horizontal.height = 0
    l_vtp = save_vtp_file(l_vtp)
    u_vtp = save_vtp_file(u_vtp)
    
    datasetL = pv.read(l_vtp)
    datasetU = pv.read(u_vtp)

    comb = datasetL + datasetU
    p2 = pv.Plotter(shape=(2, 4))
    p2.add_mesh(datasetL)
    obbMesh = pv.PolyData()
    comb.obbTree.GenerateRepresentation(0, obbMesh)
    p2.add_mesh(obbMesh, style='wireframe')
    norm, vaxis = checkLeft(obbMesh.points)
    centers = []
    tolerances = [5]
    if not (norm is None):
        plane = pv.Plane(center=obbMesh.center,
                        direction=norm, i_size=80, j_size=80)
        p2.add_mesh(plane, style="wireframe")
        idx = 1
        for tolerance in tolerances:
            p2.subplot(0, idx)
            vn = normalize(norm) * tolerance
            center = np.array(obbMesh.center) - vn
            centers.append(center)
            p2.add_mesh_slice(datasetL, normal=norm, origin=center,
                            origin_translation=False, tubing=False)
            idx += 1
    p2.subplot(1, 0)
    p2.add_mesh(datasetU)
    obbMesh = pv.PolyData()
    comb.obbTree.GenerateRepresentation(0, obbMesh)
    p2.add_mesh(obbMesh, style='wireframe')
    norm, vaxis = checkLeft(obbMesh.points)
    if not (norm is None):
        plane = pv.Plane(center=obbMesh.center,
                        direction=norm, i_size=80, j_size=80)
        p2.add_mesh(plane, style="wireframe")
        idx = 1
        for tolerance in tolerances:
            p2.subplot(1, idx)
            vn = normalize(norm) * tolerance
            center = np.array(obbMesh.center) - vn
            p2.add_mesh_slice(datasetU, normal=norm, origin=center,
                            origin_translation=False, tubing=False)
            idx += 1

    pvcc = random_fno() + '.pvcc'
    slice_vtp = random_fno() + '.vtp'

    for i in range(0, len(tolerances)):
        p1 = pv.Plotter(off_screen=True, window_size=(2048,1024))
        p1.set_background((255, 255, 255))
        center = centers[i]
        p1.add_mesh(p2.plane_sliced_meshes[i], color=l_color)  # 下颚
        p1.add_mesh(p2.plane_sliced_meshes[i + len(tolerances)], color=u_color)  # 上颚
        p1.camera.focal_point = center
        p1.camera.position = center + normalize(norm) * 50.5
        p1.camera.up = vaxis
        p1.camera.view_angle = 60
        p1.camera.thickness = 10
        p1.camera.zoom(1)
        slice_img = random_fno() + '.png'
        # p1.show()
        p1.screenshot(slice_img, window_size=(2048, 1024))
        p1.camera.to_paraview_pvcc(pvcc)
        combined1 = p2.plane_sliced_meshes[i] + p2.plane_sliced_meshes[i + len(tolerances)]
        combined1.save(slice_vtp)
        input_image = Image.open(slice_img)
        rotationNeeded = False
        # 如果 u_color 在下方，则图片需要旋转 180°
        iw, ih = input_image.size
        for i in range(0, iw):
            has_l_color = False
            has_u_color = False
            for j in range(0, ih):
                current_pixel = input_image.getpixel((i, j))
                if has_l_color and current_pixel == u_color:
                    rotationNeeded = True
                    break
                elif has_u_color and current_pixel == l_color:
                    rotationNeeded = False
                    break
                elif not has_l_color and current_pixel == l_color:
                    has_l_color = True
                elif not has_u_color and current_pixel == u_color:
                    has_u_color = True

        if rotationNeeded:
            rotated_image = input_image.rotate(180, expand=True)
            rotated_image.save(slice_img)

    return (slice_img, l_vtp, u_vtp, pvcc, slice_vtp, rotationNeeded)

def screenShot(l_vtp, u_vtp, camera_info):
    focal_point, up, position = camera_info
    l_vtp = save_vtp_file(l_vtp)
    u_vtp = save_vtp_file(u_vtp)
    
    datasetL = pv.read(l_vtp)
    datasetU = pv.read(u_vtp)
    
    comb = datasetL + datasetU
    p1 = pv.Plotter(off_screen=True, window_size=(1024, 768))
    p1.set_background('#52576e')
    tooth_color = '#f1eee2'
    actorL = p1.add_mesh(datasetL, color=tooth_color)
    actorU = p1.add_mesh(datasetU, color=tooth_color)
    
    p1.camera.focal_point = focal_point
    p1.camera.position = position
    p1.camera.up = up
    slice_imgs = {
        'left': '',
        'right': '',
        'center': '',
        'upper': '',
        'lower': '',
    }
    slice_imgs['center'] = random_fno() + '.png'
    p1.screenshot(slice_imgs['center'], window_size=(1024, 768))
    slice_imgs['left'] = random_fno() + '.png'
    p1.camera.azimuth = 90
    p1.screenshot(slice_imgs['left'], window_size=(1024, 768))
    slice_imgs['right'] = random_fno() + '.png'
    p1.camera.azimuth = -90
    p1.screenshot(slice_imgs['right'], window_size=(1024, 768))
    slice_imgs['upper'] = random_fno() + '.png'
    p1.camera.azimuth = 0
    p1.camera.elevation = -90
    actorL.visibility = False
    p1.screenshot(slice_imgs['upper'], window_size=(1024, 768))
    slice_imgs['lower'] = random_fno() + '.png'
    p1.camera.focal_point = focal_point
    p1.camera.position = position
    p1.camera.up = up
    p1.camera.azimuth = 0
    p1.camera.elevation = 90
    actorL.visibility = True
    actorU.visibility = False
    p1.screenshot(slice_imgs['lower'], window_size=(1024, 768))
    
    return ([slice_imgs['left'], slice_imgs['right'], slice_imgs['center'], slice_imgs['upper'], slice_imgs['lower']], l_vtp, u_vtp)

def isLColorLike(color):
    return color == l_color

def isUColorLike(color):
    return color == u_color

def markByColor(input_image, checkColor, firstStop):
    iw, ih = input_image.size
    saved_i = -1
    saved_j = -1
    for i in range(0, ih):
        # 记录连续点
        start = 0
        prev = 0
        end = 0
        for j in range(0, iw):
            p = input_image.getpixel((j, i))
            if checkColor(p):
                if start == 0:
                    start = j
                    prev = start
                    end = start
                else:
                    if j != end + 1:
                        break
                    prev = end
                    end = j
        if start != 0 and end >= start:
            saved_i = i
            saved_j = math.floor((end - start) / 2) + start
            if firstStop:
                break

    if saved_i > -1 and saved_j > -1:
        return (saved_j, saved_i)
    else:
        return None

def mark1(file_name, u_keypoints, l_keypoints):
    input_image = Image.open(file_name)
    u_res = markByColor(input_image, isUColorLike, False)
    l_res = markByColor(input_image, isLColorLike, True)
    if u_res is not None and l_res is not None:
        print('mark1 done')
        u_keypoints['top'] = u_res
        l_keypoints['top'] = l_res
    else:
        print('failed to mark keypoint: ', file_name)


        
def computeCoverDegree(u_keypoints, l_keypoints):
    #计算覆盖（水平）程度
    cx= u_keypoints[0]
    cx1= l_keypoints[0]
    cDist = abs(cx1 - cx) / 17.55
    print(f'覆盖距离 = {cDist}, u_keypoints={u_keypoints}, l_keypoints={l_keypoints}')
    if (cDist > 3 and cDist <= 5):
        return (cDist, 1)
    elif (cDist > 5 and cDist <= 8):
        return (cDist, 2)
    elif (cDist > 8):
        return (cDist, 3)
    else:
        return (cDist, 0)
    
def computeOverlapping(u_keypoints, l_keypoints,r_keypoint):
    #计算覆合（垂直）程度
    cy = u_keypoints[1]
    cy1 = l_keypoints[1]
    cy2 = r_keypoint[1]
    oDist = (cy - cy1) / 17.55
    oDist1 = abs(cy1 - cy2) / 17.55
    
    print(f'覆合距离 = {oDist}, u_keypoints={u_keypoints}, l_keypoints={l_keypoints},r_keypoints={r_keypoint}')
    if (oDist >= 0):
        return (oDist, 0)
    elif (oDist < 0):
        if (0 < abs(oDist)/oDist1 <= 1/3):
            return (abs(oDist),0)
        if (1/3 < abs(oDist)/oDist1 <= 1/2):
            return (abs(oDist),1)
        if (1/2 < abs(oDist)/oDist1 <= 2/3):
            return (abs(oDist),2)
        if (2/3 < abs(oDist)/oDist1):
            return (abs(oDist),3)
    



def random_fno():
    milli = round(time.time() * 1000)
    random.seed(milli)
    fno = str(milli) + str(round(sys.maxsize * random.random())) # 当前时间 + 随机数
    return fno

def convertScreenCoordToModelCoord(pvcc, flipped, slice_vtp, coords):
    print(f'flipped={flipped}')
    p1 = pv.Plotter(window_size=(2048,1024))
    p1.enable_surface_point_picking(picker = opts.PickerType.HARDWARE)
    p1.camera = pv.Camera.from_paraview_pvcc(pvcc)
    slice_mesh = pv.read(slice_vtp)
    p1.add_mesh(slice_mesh)
    pointPicker = _vtk.vtkPointPicker()
    renderer = p1.iren.get_poked_renderer()
    arrRes = []
    for coord in coords:
        x, y = coord
        if flipped:
            x = 2048 - x
            y = 1024 - y
        res = pointPicker.Pick(x, 1024 - y, 0, renderer)
        
        if res == 0:
            print(f'failed to pick point: ({x}, ${y})')
        else:
            pointId = pointPicker.GetPointId()
            point = pointPicker.GetActor().mapper.dataset.points[pointId]
            arrRes.append(point.tolist())
            # print(f'picked point id: {pointId} ({point})')
            # sphere = pv.Sphere(center=point, radius=.1)
            # p1.add_mesh(sphere, color='red')
    return arrRes
####
def visualizeforthree(slice_img, u_keypoints, l_keypoints, r_keypoints):
    input_image = Image.open(slice_img)
    cx = u_keypoints[0]
    cy = u_keypoints[1]
    draw_point(input_image, int(cx), int(cy))
    cx = l_keypoints[0]
    cy = l_keypoints[1]
    draw_point(input_image, int(cx), int(cy))
    cx = r_keypoints[0]
    cy = r_keypoints[1]
    draw_point(input_image,int(cx), int(cy))
    
    for pt in l_keypoints, u_keypoints , r_keypoints:
        cx, cy = pt
        print(pt)
        draw_point(input_image, int(cx), int(cy))
    input_image.save(slice_img)
#####


def visualize(slice_img, u_keypoints, l_keypoints):
    input_image = Image.open(slice_img)
    cx, cy = u_keypoints['top']
    draw_point(input_image, cx, cy)
    cx, cy = l_keypoints['top']
    draw_point(input_image, cx, cy)
    for pt in l_keypoints['root'] + u_keypoints['root']:
        cx, cy = pt
        draw_point(input_image, cx, cy)
    input_image.save(slice_img)
    



def draw_point(input_image, cx, cy):
    for i in range(-1, 2):
        for j in range(-1, 2):
            input_image.putpixel((cx + j, cy + i), (0, 1, 0))