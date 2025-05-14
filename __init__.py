#!/usr/bin/env python3
###
# File: __init__.py
# Project: comfy-image-upload
# Author: fichas
###

__version__ = "0.1.0"

import os
import shutil
import json
import tempfile
import zipfile
import logging
import time
from pathlib import Path
import imghdr  # 用于检测文件是否为图片

from aiohttp import web
import folder_paths
import torch
from PIL import ImageOps
try:
    import pillow_jxl      # noqa: F401
    jxl = True
except ImportError:
    jxl = False
import comfy
import folder_paths
import base64
from io import BytesIO

from PIL import Image
import numpy as np
import logging
# 设置日志
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
log = logging.getLogger("comfy-image-upload")

# 是否在ComfyUI环境中运行
IN_COMFY = False
try:
    # 直接从server导入PromptServer
    from server import PromptServer

    IN_COMFY = True
except (ModuleNotFoundError, ImportError):
    try:
        import sys
        import os

        # 手动添加ComfyUI路径到sys.path
        comfy_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        if comfy_dir not in sys.path:
            sys.path.append(comfy_dir)
        from server import PromptServer

        IN_COMFY = True
    except (ModuleNotFoundError, ImportError):
        IN_COMFY = False
        log.warning("未在ComfyUI环境中运行，某些功能可能无法正常使用")
except Exception as e:
    IN_COMFY = False
    log.warning(f"初始化ComfyUI环境时出错: {str(e)}")
    log.warning("未在ComfyUI环境中运行，某些功能可能无法正常使用")

# 获取当前目录
here = Path(__file__).parent.absolute()

# 获取ComfyUI的输入目录
input_dir = folder_paths.get_input_directory()
log.info(f"输入目录: {input_dir}")

# 支持的图片格式
IMAGE_EXTENSIONS = {
    ".jpg",
    ".jpeg",
    ".png",
    ".webp",
    ".gif",
    ".bmp",
    ".tiff",
    ".tif",
    ".heic",
}

# refactor by fichas, original code from https://raw.githubusercontent.com/ltdrdata/ComfyUI-Inspire-Pack/0f38db4180ce7836a80765111b87d5b4376a7a45/inspire/image_util.py
class LoadImagesFromBatch:
    @classmethod
    
    def INPUT_TYPES(s):
        dirs = get_input_subdirectories()
        return {
            "required": {
                "directory": (dirs, {"default": dirs[0]}),
            },
            "optional": {
                "image_load_cap": ("INT", {"default": 0, "min": 0, "step": 1}),
                "start_index": ("INT", {"default": 0, "min": -1, "max": 0xffffffffffffffff, "step": 1}),
                "load_always": ("BOOLEAN", {"default": False, "label_on": "enabled", "label_off": "disabled"}),
            }
        }

    RETURN_TYPES = ("IMAGE", "MASK", "INT")
    FUNCTION = "load_images"

    CATEGORY = "image"

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        if 'load_always' in kwargs and kwargs['load_always']:
            return float("NaN")
        else:
            return hash(frozenset(kwargs))

    def load_images(self, directory: str, image_load_cap: int = 0, start_index: int = 0, load_always=False):
        directory = os.path.join(input_dir, directory)
        if not os.path.isdir(directory):
            raise FileNotFoundError(f"Directory '{directory} cannot be found.'")
        dir_files = os.listdir(directory)
        if len(dir_files) == 0:
            raise FileNotFoundError(f"No files in directory '{directory}'.")

        # Filter files by extension
        valid_extensions = ['.jpg', '.jpeg', '.png', '.webp']
        if jxl:
            valid_extensions.extend('.jxl')
        dir_files = [f for f in dir_files if any(f.lower().endswith(ext) for ext in valid_extensions)]

        dir_files = sorted(dir_files)
        dir_files = [os.path.join(directory, x) for x in dir_files]

        # start at start_index
        dir_files = dir_files[start_index:]

        images = []
        masks = []

        limit_images = False
        if image_load_cap > 0:
            limit_images = True
        image_count = 0

        has_non_empty_mask = False

        for image_path in dir_files:
            if os.path.isdir(image_path) and os.path.ex:
                continue
            if limit_images and image_count >= image_load_cap:
                break
            i = Image.open(image_path)
            i = ImageOps.exif_transpose(i)
            image = i.convert("RGB")
            image = np.array(image).astype(np.float32) / 255.0
            image = torch.from_numpy(image)[None,]
            if 'A' in i.getbands():
                mask = np.array(i.getchannel('A')).astype(np.float32) / 255.0
                mask = 1. - torch.from_numpy(mask)
                has_non_empty_mask = True
            else:
                mask = torch.zeros((64, 64), dtype=torch.float32, device="cpu")
            images.append(image)
            masks.append(mask)
            image_count += 1

        if len(images) == 1:
            return (images[0], masks[0], 1)

        elif len(images) > 1:
            image1 = images[0]
            mask1 = None

            for image2 in images[1:]:
                if image1.shape[1:] != image2.shape[1:]:
                    image2 = comfy.utils.common_upscale(image2.movedim(-1, 1), image1.shape[2], image1.shape[1], "bilinear", "center").movedim(1, -1)
                image1 = torch.cat((image1, image2), dim=0)

            for mask2 in masks:
                if has_non_empty_mask:
                    if image1.shape[1:3] != mask2.shape:
                        mask2 = torch.nn.functional.interpolate(mask2.unsqueeze(0).unsqueeze(0), size=(image1.shape[1], image1.shape[2]), mode='bilinear', align_corners=False)
                        mask2 = mask2.squeeze(0)
                    else:
                        mask2 = mask2.unsqueeze(0)
                else:
                    mask2 = mask2.unsqueeze(0)

                if mask1 is None:
                    mask1 = mask2
                else:
                    mask1 = torch.cat((mask1, mask2), dim=0)

            return (image1, mask1, len(images))




# 公开的节点和显示名称映射
NODE_CLASS_MAPPINGS = {
    "LoadImagesFromBatch": LoadImagesFromBatch,
}
NODE_DISPLAY_NAME_MAPPINGS = {
    "LoadImagesFromBatch": "从Input目录加载图片",
}
# 确认WEB_DIRECTORY指向custom_node下的web目录，添加扩展JS
WEB_DIRECTORY = "./web"


# 安全性验证函数
def is_safe_path(path):
    """验证路径是否安全，防止路径遍历攻击"""
    # 确保路径不包含 .. 或绝对路径
    normalized = os.path.normpath(path)
    return not normalized.startswith("..") and not os.path.isabs(normalized)


def is_image_file(file_path):
    """验证文件是否为有效的图片"""
    # 首先检查扩展名
    ext = os.path.splitext(file_path.lower())[1]
    if ext not in IMAGE_EXTENSIONS:
        return False

    # 然后使用imghdr验证文件内容
    img_type = imghdr.what(file_path)
    return img_type is not None


# 获取输入目录下的所有子目录
def get_input_subdirectories():
    subdirs = [""]  # 空字符串表示根目录
    try:
        for item in os.listdir(input_dir):
            full_path = os.path.join(input_dir, item)
            if os.path.isdir(full_path):
                subdirs.append(item)
    except Exception as e:
        log.error(f"获取子目录列表时出错: {str(e)}")
    return subdirs


# 创建一个辅助函数来处理JSON响应
def create_json_response(data, status=200):
    """创建确保中文不被转义的JSON响应"""
    return web.Response(
        text=json.dumps(data, ensure_ascii=False),
        content_type="application/json",
        status=status,
    )


# 创建通用的上传处理函数
async def handle_upload(request, process_func):
    """通用上传处理函数
    
    Args:
        request: HTTP请求对象
        process_func: 处理具体上传逻辑的回调函数
        
    Returns:
        JSON响应
    """
    start_time = time.time()
    temp_files = []
    
    try:
        reader = await request.multipart()
        result = await process_func(reader, temp_files)
        
        elapsed_time = time.time() - start_time
        result["elapsed_time"] = round(elapsed_time, 2)
        
        return create_json_response(result)
        
    except Exception as e:
        log.error(f"上传处理时出错: {str(e)}", exc_info=True)
        return create_json_response({"error": str(e)}, status=500)
    finally:
        # 清理所有临时文件
        for temp_file in temp_files:
            try:
                if os.path.exists(temp_file):
                    os.unlink(temp_file)
                    log.info(f"删除临时文件: {temp_file}")
            except Exception as e:
                log.warning(f"清理临时文件失败: {temp_file}, 错误: {str(e)}")


# 验证并创建目标目录
def validate_and_create_target_dir(dir_name, parent_dir=""):
    """验证并创建目标目录
    
    Args:
        dir_name: 目录名
        parent_dir: 父目录名(可选)
        
    Returns:
        (目标目录路径, 错误信息)，如无错误则错误信息为None
    """
    # 验证目录名是否合法
    if dir_name and not is_safe_path(dir_name):
        return None, "非法的目录名称"
        
    if parent_dir and not is_safe_path(parent_dir):
        return None, "非法的父目录名称"
    
    # 构建目标路径
    if parent_dir:
        target_parent = os.path.join(input_dir, parent_dir)
        # 确保父目录存在
        if not os.path.exists(target_parent):
            log.info(f"创建父目录: {target_parent}")
            os.makedirs(target_parent, exist_ok=True)
        target_dir = os.path.join(target_parent, dir_name)
    else:
        target_dir = os.path.join(input_dir, dir_name)
    
    # 确保目标目录存在
    if not os.path.exists(target_dir):
        log.info(f"创建目标目录: {target_dir}")
        os.makedirs(target_dir, exist_ok=True)
        
    return target_dir, None


# 创建临时文件并写入内容
async def save_to_temp_file(field, temp_files, suffix=""):
    """保存上传内容到临时文件
    
    Args:
        field: 上传字段
        temp_files: 临时文件列表(用于跟踪清理)
        suffix: 文件后缀
        
    Returns:
        (临时文件路径, 文件大小), 如果大小为0表示为空文件
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as temp_file:
        log.info(f"创建临时文件: {temp_file.name}")
        content_length = 0
        while True:
            chunk = await field.read_chunk()
            if not chunk:
                break
            temp_file.write(chunk)
            content_length += len(chunk)
        temp_file_path = temp_file.name
        
    temp_files.append(temp_file_path)
    return temp_file_path, content_length


# 重构上传文件夹函数
async def upload_folder_process(reader, temp_files):
    log.info("开始处理文件夹上传请求")
    
    # 获取文件字段
    field = await reader.next()
    if field is None or field.name != "folder_zip":
        return {"error": "未找到上传的文件"}, 400
    
    # 保存到临时文件
    temp_file_path, content_length = await save_to_temp_file(field, temp_files, suffix=".zip")
    
    if content_length == 0:
        return {"error": "上传的ZIP文件为空"}, 400
    
    # 获取目标文件夹名称
    field = await reader.next()
    if field is None or field.name != "folder_name":
        return {"error": "未提供文件夹名称"}, 400
    
    folder_name = await field.text()
    if not folder_name:
        return {"error": "非法的文件夹名称"}, 400
    
    # 获取父目录名称（如果有）
    field = await reader.next()
    parent_dir = ""
    if field is not None and field.name == "parent_dir":
        parent_dir = await field.text()
    
    # 验证并创建目标目录
    target_dir, error = validate_and_create_target_dir(folder_name, parent_dir)
    if error:
        return {"error": error}, 400
    
    log.info(f"目标文件夹: {target_dir}")
    
    # 检查ZIP文件是否有效
    try:
        with zipfile.ZipFile(temp_file_path, "r") as zip_ref:
            # 检查ZIP文件内容是否安全
            for file_info in zip_ref.infolist():
                if file_info.file_size > 100 * 1024 * 1024:  # 100MB限制
                    return {"error": f"ZIP中包含过大的文件，限制为100MB"}, 400
                
                # 防止路径遍历
                if not is_safe_path(file_info.filename):
                    return {"error": "ZIP文件包含不安全的路径"}, 400
    except zipfile.BadZipFile:
        return {"error": "无效的ZIP文件"}, 400
    
    # 如果目标文件夹已存在，先删除它
    if os.path.exists(target_dir):
        log.info(f"删除已存在的目标文件夹: {target_dir}")
        shutil.rmtree(target_dir)
    
    # 创建目标文件夹
    os.makedirs(target_dir, exist_ok=True)
    
    # 解压ZIP文件到目标文件夹，但只提取图片文件
    extracted_count = 0
    skipped_count = 0
    with zipfile.ZipFile(temp_file_path, "r") as zip_ref:
        log.info(f"解压ZIP文件到: {target_dir}，仅提取图片文件")
        
        for file_info in zip_ref.infolist():
            # 跳过目录项
            if file_info.is_dir():
                continue
            
            # 检查是否为图片文件
            file_ext = os.path.splitext(file_info.filename.lower())[1]
            if file_ext in IMAGE_EXTENSIONS:
                # 确保文件所在的子目录存在
                file_path = os.path.join(target_dir, file_info.filename)
                os.makedirs(os.path.dirname(file_path), exist_ok=True)
                
                # 提取文件
                source = zip_ref.open(file_info)
                with open(file_path, "wb") as target:
                    shutil.copyfileobj(source, target)
                
                # 进一步验证是否为有效图片
                if is_image_file(file_path):
                    extracted_count += 1
                    log.info(f"已提取图片: {file_info.filename}")
                else:
                    # 如果不是有效图片，删除它
                    os.remove(file_path)
                    skipped_count += 1
                    log.info(f"已删除无效图片: {file_info.filename}")
            else:
                skipped_count += 1
                log.info(f"已跳过非图片文件: {file_info.filename}")
    
    if extracted_count == 0:
        return {
            "success": False,
            "message": f"文件夹中没有有效的图片文件，已跳过 {skipped_count} 个非图片文件",
            "folder_path": target_dir,
            "extracted_count": 0,
            "skipped_count": skipped_count
        }
    
    return {
        "success": True,
        "message": f"文件夹已成功上传到 {target_dir}，共提取 {extracted_count} 个图片文件" +
                   (f"，跳过 {skipped_count} 个非图片文件" if skipped_count > 0 else ""),
        "folder_path": target_dir,
        "extracted_count": extracted_count,
        "skipped_count": skipped_count
    }


# 重构上传图片函数
async def upload_images_process(reader, temp_files):
    log.info("开始处理图片上传请求")
    
    # 获取上传的目标目录
    field = await reader.next()
    if field is None or field.name != "target_dir":
        return {"error": "未提供目标目录"}, 400
    
    target_dir_name = await field.text()
    
    # 验证并创建目标目录
    target_dir = input_dir
    if target_dir_name:
        target_dir, error = validate_and_create_target_dir(target_dir_name)
        if error:
            return {"error": error}, 400
    
    log.info(f"图片上传目标目录: {target_dir}")
    
    # 处理上传的所有图片
    count = 0
    skipped = 0
    total_size = 0
    uploaded_files = []
    
    field = await reader.next()
    while field is not None:
        if field.name != "images[]":
            field = await reader.next()
            continue
        
        # 获取文件名
        filename = field.filename
        
        if not any(filename.lower().endswith(ext) for ext in IMAGE_EXTENSIONS):
            log.warning(f"跳过非图片文件: {filename}")
            skipped += 1
            field = await reader.next()
            continue
        
        # 保存到临时文件
        temp_file_path, file_size = await save_to_temp_file(field, temp_files)
        
        # 验证是否为有效图片
        if not imghdr.what(temp_file_path):
            log.warning(f"跳过无效的图片文件: {filename}")
            skipped += 1
            field = await reader.next()
            continue
        
        # 检查文件大小限制 (50MB)
        if file_size > 50 * 1024 * 1024:
            log.warning(f"跳过过大的图片文件: {filename} ({file_size / 1024 / 1024:.2f} MB)")
            skipped += 1
            field = await reader.next()
            continue
        
        # 移动文件到目标目录
        target_file = os.path.join(target_dir, filename)
        
        # 如果文件已存在，直接覆盖
        if os.path.exists(target_file):
            log.info(f"文件已存在，将覆盖: {filename}")
        
        log.info(f"移动文件到: {target_file}")
        shutil.move(temp_file_path, target_file)
        temp_files.remove(temp_file_path)  # 从临时文件列表中移除已移动的文件
        
        count += 1
        total_size += file_size
        uploaded_files.append(os.path.basename(target_file))
        
        field = await reader.next()
    
    if count == 0:
        log.warning("未上传任何有效图片")
        return {"error": "未上传任何有效图片", "skipped": skipped}, 400
    
    return {
        "success": True,
        "message": f"已成功上传 {count} 张图片" + (f"，跳过 {skipped} 个无效文件" if skipped > 0 else ""),
        "target_dir": target_dir,
        "uploaded_files": uploaded_files,
        "total_size": total_size,
        "skipped": skipped
    }


# 更新路由处理函数
async def upload_folder(request):
    return await handle_upload(request, upload_folder_process)

async def upload_images(request):
    return await handle_upload(request, upload_images_process)


# 获取input目录下所有子目录
async def get_input_dirs(request):
    try:
        log.info("获取输入目录列表")
        subdirs = get_input_subdirectories()
        return create_json_response(
            {"directories": subdirs, "count": len(subdirs), "input_dir": input_dir}
        )
    except Exception as e:
        log.error(f"获取输入目录列表时出错: {str(e)}", exc_info=True)
        return create_json_response({"error": str(e)}, status=500)


# 添加路由和静态文件服务
if IN_COMFY and hasattr(PromptServer, "instance"):
    # 注册API路由
    PromptServer.instance.app.router.add_post("/asoul/folder", upload_folder)
    PromptServer.instance.app.router.add_post("/asoul/images", upload_images)
    PromptServer.instance.app.router.add_get("/asoul/input-dirs", get_input_dirs)

    log.info("文件上传功能已初始化 (移除了中间件注入)")

# 扩展信息
MANIFEST = {
    "name": "图片上传工具",
    "version": (0, 1, 0),
    "author": "ComfyUI Community",
    "project": "https://github.com/your-username/comfy-image-upload",
    "description": "允许用户通过简单的界面将整个文件夹或批量图片上传到ComfyUI的input目录中",
}
