from fastapi import FastAPI
from pydantic import BaseModel, Field
import pyvista as pv
import random
import time
import sys
import os, shutil
import math
from fastapi.middleware.cors import CORSMiddleware
from typing import Optional
import util
# from oss_client import OssClient


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

import uvicorn

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=server_port, reload=True)
