from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel, Field
import pyvista as pv
import random
import time
import sys
import os, shutil
import math
import io
import logging
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import util
# from oss_client import OssClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class StlInput(BaseModel):
    file: str
    faces: int


class VtpInput(BaseModel):
    file: str


class CoverDegreeInput(BaseModel):
    uModel: str
    lModel: str
    debug: Optional[bool] = Field(False)


class ScreenShotInput(BaseModel):
    uModel: str
    lModel: str
    focalPoint: list[float]
    up: list[float]
    position: list[float]
    debug: Optional[bool] = Field(False)


app = FastAPI()

origins = ['*']

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

response = {
    "code": 0,
    "data": None,
    "msg": "success"
}


@app.post('/api/stl-to-vtp')
def stl_to_vtp(input: StlInput):
    milli = round(time.time() * 1000)
    random.seed(milli)
    fno = str(milli) + str(round(sys.maxsize * random.random()))  # 当前时间 + 随机数

    # 生成 vtp 文件内容并保存到本地
    stl_file = fno + '.stl'
    if not os.path.exists('files/'):
        os.makedirs('files/')
    f = open('files/' + stl_file, 'w')
    f.write(input.file)
    f.close()
    reader = pv.get_reader('files/' + stl_file)
    mesh = reader.read()
    target_reduction = 1 - (input.faces / mesh.n_faces)
    pro_decimated = mesh.decimate(target_reduction, volume_preservation=True)
    pro_decimated.save('files/' + fno + '.vtp')
    vtp_file = open('files/' + fno + '.vtp', 'r')
    return vtp_file.read()


@app.post('/api/vtp-set-scalars-label')
def vtp_set_scalars_label(input: VtpInput):
    vtp_file = 'temp.vtp'
    if os.path.exists(vtp_file):
        os.remove(vtp_file)
    f = open(vtp_file, 'w')
    f.write(input.file)
    mesh = pv.read(vtp_file)
    v1 = mesh.cell_data
    if (v1.active_scalars is None):
        return {'code': -1, 'msg': '模型文件没有标注种子点'}
    v1.set_scalars(v1.active_scalars, 'Label')
    scalars = v1.active_scalars
    len1 = len(scalars)
    for i in range(len1):
        if math.isnan(scalars[i]):
            scalars[i] = 0
    mesh.save(vtp_file)
    f = open(vtp_file, 'r')
    res = f.read()
    f.close()
    os.remove(vtp_file)
    return {'data': res}


# @app.post('/api/screen-shot')
# def screen_shot(input: ScreenShotInput):
#     (slice_imgs, l_vtp, u_vtp) = util.screenShot(input.lModel, input.uModel,
#                                                  [input.focalPoint, input.up, input.position])
#     for item in slice_imgs:
#         if len(item) > 0 and os.path.exists(item):
#             shutil.move(item, f'./files/{item}')
#     if not input.debug:
#         for fn in [l_vtp, u_vtp]:
#             os.remove(fn)
#     old_slice_imgs = [f'./files/{item}' for item in slice_imgs]
#     # oss_client = OssClient()
#     # slice_imgs = [oss_client.upload_file(f'./files/{item}') for item in slice_imgs]
#     for i in range(0, len(old_slice_imgs)):
#         if slice_imgs[i] != old_slice_imgs:
#             os.remove(old_slice_imgs[i])
#     return {
#         'screenshots': {
#             'left': slice_imgs[0],
#             'right': slice_imgs[1],
#             'center': slice_imgs[2],
#             'upper': slice_imgs[3],
#             'lower': slice_imgs[4],
#         }
#     }


import json


@app.get("/api/getAllToothInfo")
def get_all_tooth_info(planId):
    if planId == '1098':
        f = open("./statics/initial-toothinfo.json", "r")
        text = f.read()
        response['data'] = json.loads(text)
        return response
    elif planId == '1088':
        f = open("./statics/save-toothinfo.json", "r")
        text = f.read()
        response['data'] = json.loads(text)
        return response


@app.get('/api/getToothWidthInfoById')
def get_tooth_width_info_by_id(id):
    f = open("./statics/toothWidthInfo.json", "r")
    text = f.read()
    response['data'] = json.loads(text)
    return response


@app.get("/api/getDigital")
def get_digital(id):
    response['data'] = {
        "maxillaFile": "/assets/models/up.stl",
        "upFilename": "up.stl",
        "mandibleFile": "/assets/models/down.stl",
        "downFilename": "down.stl"
    }
    return response


server_port = 9009


# ─────────────────────────────────────────────────────────────────────────────
# 牙齿分割端点
# ─────────────────────────────────────────────────────────────────────────────

# 权重文件路径（上下颌分别对应不同权重）
_WEIGHTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "tooth_segmentation", "weights")
_WEIGHTS = {
    "upper": os.path.join(_WEIGHTS_DIR, "meshsegnet_max.pth"),  # Maxilla 上颌
    "lower": os.path.join(_WEIGHTS_DIR, "meshsegnet_man.pth"),  # Mandible 下颌
}


@app.post(
    "/api/segment-teeth",
    summary="STL 牙齿分割",
    description=(
        "接收 STL 文件，使用 MeshSegNet 对每个三角面进行牙齿分割，"
        "返回带有每颗牙齿独立颜色的 GLB 二进制文件。\n\n"
        "参数 `jaw` 指定颌骨类型：`upper`（上颌）或 `lower`（下颌，默认）。"
    ),
    response_class=Response,
    responses={
        200: {"content": {"model/gltf-binary": {}}, "description": "GLB 二进制文件"},
        503: {"description": "模型权重文件未找到"},
        422: {"description": "文件格式错误或推理失败"},
    },
)
async def segment_teeth(
    file: UploadFile = File(..., description="STL 文件（二进制或 ASCII）"),
    jaw: str = "lower",
):
    """
    牙齿分割 API

    - `jaw=lower`：使用下颌模型（Mandible）
    - `jaw=upper`：使用上颌模型（Maxilla）
    - 返回带有 15 种颜色（牙龈 + 14 颗牙）的 GLB 文件
    """
    if jaw not in _WEIGHTS:
        raise HTTPException(status_code=422, detail=f"jaw 参数无效，应为 'upper' 或 'lower'，收到：{jaw!r}")

    weights_path = _WEIGHTS[jaw]

    # 检查权重文件
    if not os.path.exists(weights_path):
        raise HTTPException(
            status_code=503,
            detail=(
                f"MeshSegNet 权重文件未找到：{weights_path}。"
                "请从 https://github.com/Tai-Hsien/MeshSegNet/tree/master/models "
                "下载权重 zip 并重命名放置到 server/tooth_segmentation/weights/ 目录。"
            ),
        )

    # 读取上传文件
    stl_bytes = await file.read()
    if len(stl_bytes) == 0:
        raise HTTPException(status_code=422, detail="上传的文件为空")

    logger.info("收到 STL 文件：%s，颌骨：%s，大小：%d bytes", file.filename, jaw, len(stl_bytes))

    try:
        # 延迟导入（避免无 torch 环境时启动失败）
        from tooth_segmentation.inference import segment_stl
        from tooth_segmentation.export_glb import export_to_glb_from_stl

        # 推理（n_runs 次随机采样投票，越多越精细，每次约 3s）
        face_labels = segment_stl(stl_bytes, weights_path, n_runs=10)

        # 导出 GLB
        glb_bytes = export_to_glb_from_stl(stl_bytes, face_labels)

    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except Exception as e:
        logger.exception("牙齿分割失败")
        raise HTTPException(status_code=422, detail=f"分割失败：{e}")

    return Response(
        content=glb_bytes,
        media_type="model/gltf-binary",
        headers={"Content-Disposition": 'attachment; filename="segmented.glb"'},
    )


import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=server_port, reload=True)
