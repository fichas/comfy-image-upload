// ASoul上传工具 - 主扩展脚本 (包含侧边栏和上传按钮功能)
import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

console.log("ASoul上传工具: 扩展脚本加载中...");

// Toast组件实现
const ASoulToast = {
  // 存储当前的toast实例
  toasts: [],
  // Toast容器
  container: null,
  
  // 初始化Toast容器
  init() {
    if (this.container) return;
    
    // 创建容器
    this.container = document.createElement('div');
    this.container.className = 'asoul-toast-container';
    this.container.style.position = 'fixed';
    this.container.style.bottom = '20px';
    this.container.style.right = '20px';
    this.container.style.zIndex = '9999';
    this.container.style.display = 'flex';
    this.container.style.flexDirection = 'column';
    this.container.style.gap = '10px';
    document.body.appendChild(this.container);
    
    // 添加样式
    if (!document.getElementById('asoul-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'asoul-toast-styles';
      style.textContent = `
        .asoul-toast {
          display: flex;
          padding: 1rem;
          min-width: 280px;
          max-width: 350px;
          border-radius: 4px;
          box-shadow: 0 5px 15px rgba(0,0,0,0.15);
          margin-bottom: 0.5rem;
          align-items: center;
          justify-content: space-between;
          animation: asoul-toast-in 0.3s ease forwards;
          transform: translateY(50px);
          opacity: 0;
        }
        
        .asoul-toast-content {
          display: flex;
          flex-direction: column;
          flex: 1;
        }
        
        .asoul-toast-icon {
          margin-right: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 24px;
          height: 24px;
        }
        
        .asoul-toast-summary {
          font-weight: 700;
          font-size: 1rem;
          margin-bottom: 5px;
        }
        
        .asoul-toast-detail {
          font-size: 0.9rem;
        }
        
        .asoul-toast-success {
          background-color: #EFF8F1;
          border-left: 6px solid #4caf50;
          color: #2E7D32;
        }
        
        .asoul-toast-error {
          background-color: #FCEEE9;
          border-left: 6px solid #f44336;
          color: #C62828;
        }
        
        .asoul-toast-warning {
          background-color: #FEF6EB;
          border-left: 6px solid #ff9800;
          color: #E65100;
        }
        
        .asoul-toast-info {
          background-color: #E3F2FD;
          border-left: 6px solid #2196f3;
          color: #0D47A1;
        }
        
        @keyframes asoul-toast-in {
          from {
            transform: translateY(50px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        
        @keyframes asoul-toast-out {
          from {
            transform: translateY(0);
            opacity: 1;
          }
          to {
            transform: translateY(-20px);
            opacity: 0;
          }
        }
      `;
      document.head.appendChild(style);
    }
  },
  
  // 显示Toast
  show(options) {
    // 确保容器已初始化
    this.init();
    
    const { message, summary, type = 'info', timeout = 3000 } = options;
    
    // 创建Toast元素
    const toast = document.createElement('div');
    toast.className = `asoul-toast asoul-toast-${type}`;
    
    // 左侧图标
    const iconContainer = document.createElement('div');
    iconContainer.className = 'asoul-toast-icon';
    
    // 根据类型设置图标
    let iconSvg = '';
    switch(type) {
      case 'success':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-.997-6l7.07-7.071-1.414-1.414-5.656 5.657-2.829-2.829-1.414 1.414L11.003 16z" fill="currentColor"/></svg>';
        break;
      case 'error':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="currentColor"/></svg>';
        break;
      case 'warning':
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z" fill="currentColor"/></svg>';
        break;
      default: // info
        iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24"><path fill="none" d="M0 0h24v24H0z"/><path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-11v6h2v-6h-2zm0-4v2h2V7h-2z" fill="currentColor"/></svg>';
    }
    
    iconContainer.innerHTML = iconSvg;
    toast.appendChild(iconContainer);
    
    // 内容容器
    const content = document.createElement('div');
    content.className = 'asoul-toast-content';
    
    // 如果有标题
    if (summary) {
      const summaryElem = document.createElement('div');
      summaryElem.className = 'asoul-toast-summary';
      summaryElem.textContent = summary;
      content.appendChild(summaryElem);
    }
    
    // 消息内容
    const detail = document.createElement('div');
    detail.className = 'asoul-toast-detail';
    detail.textContent = message;
    content.appendChild(detail);
    
    toast.appendChild(content);
    
    // 添加到容器
    this.container.appendChild(toast);
    
    // 添加到队列
    this.toasts.push(toast);
    
    // 设置自动消失
    if (timeout > 0) {
      setTimeout(() => this.hide(toast), timeout);
    }
    
    return toast;
  },
  
  // 隐藏指定的Toast
  hide(toast) {
    if (!toast) return;
    
    // 添加退出动画
    toast.style.animation = 'asoul-toast-out 0.3s forwards';
    
    // 移除元素
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
      // 从队列中移除
      const index = this.toasts.indexOf(toast);
      if (index > -1) {
        this.toasts.splice(index, 1);
      }
    }, 300);
  },
  
  // 隐藏所有Toast
  hideAll() {
    [...this.toasts].forEach(toast => this.hide(toast));
  },
  
  // 便捷方法
  success(message, timeout) {
    return this.show({
      type: 'success',
      summary: '成功',
      message,
      timeout
    });
  },
  
  error(message, timeout) {
    return this.show({
      type: 'error',
      summary: '错误',
      message,
      timeout
    });
  },
  
  warning(message, timeout) {
    return this.show({
      type: 'warning',
      summary: '警告',
      message,
      timeout
    });
  },
  
  info(message, timeout) {
    return this.show({
      type: 'info',
      summary: '信息',
      message,
      timeout
    });
  }
};

// 简单的通知显示函数
function showNotification(message, type = 'info', timeout = 3000) {
  // 尝试使用ComfyUI内置toast
  if (app.ui && app.ui.toast) {
    app.ui.toast(message, {type: type, timeout: timeout});
    return;
  }
  
  // 否则使用自定义toast
  switch(type) {
    case 'success':
      return ASoulToast.success(message, timeout);
    case 'error':
      return ASoulToast.error(message, timeout);
    case 'warning':
      return ASoulToast.warning(message, timeout);
    default:
      return ASoulToast.info(message, timeout);
  }
}

// 创建DOM元素辅助函数
function makeElement(type, className = '') {
  const el = document.createElement(type);
  if (className) {
    if (className.includes('.')) {
      // 支持 'div.class1.class2' 语法
      className.split('.').filter(c => c).forEach(c => {
        el.classList.add(c);
      });
    } else {
      el.className = className;
    }
  }
  return el;
}

// 创建下拉选择器
function makeSelect(options, defaultValue) {
  const select = document.createElement('select');
  options.forEach(opt => {
    const option = document.createElement('option');
    option.value = opt;
    option.textContent = opt || '根目录';
    select.appendChild(option);
  });
  select.value = defaultValue;
  return select;
}

// 创建滑块控件
function makeSlider(min, max, value, step) {
  const slider = document.createElement('input');
  slider.type = 'range';
  slider.min = min;
  slider.max = max;
  slider.value = value;
  slider.step = step;
  return slider;
}


// 获取目录列表
async function getUserFolders() {
  try {
    const response = await fetch('/asoul/input-dirs');
    if (!response.ok) {
      console.error('获取目录列表失败:', response.statusText);
      return [];
    }

    const data = await response.json();
    return data.directories || [];
  } catch (error) {
    console.error('获取目录列表时出错:', error);
    return [];
  }
}



// 上传文件函数
async function uploadFiles(files, targetFolder = '') {
  try {
    console.log("开始处理图片上传请求");
    const formData = new FormData();

    // 先添加目标文件夹字段（必须是第一个字段）
    formData.append('target_dir', targetFolder || '');
    console.log(`设置上传目标目录: "${targetFolder || '根目录'}"`);

    // 然后添加所有文件到formData
    for (let i = 0; i < files.length; i++) {
      formData.append('images[]', files[i]);
    }

    // 显示上传中提示
    const notification = showNotification(`正在上传 ${files.length} 个文件...`, 'info', 0);

    console.log(`准备上传 ${files.length} 个文件到文件夹: ${targetFolder || '根目录'}`);

    // 发送上传请求
    const response = await fetch('/asoul/images', {
      method: 'POST',
      body: formData
    });

    // 关闭上传中提示
    if (notification && notification.remove) {
      notification.remove();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`上传失败: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`上传失败 (${response.status}): ${errorText || response.statusText}`);
    }

    const result = await response.json();
    console.log('上传结果:', result);

    // 显示上传成功提示
    showNotification(`成功上传 ${result.uploaded_count || files.length} 个文件，请刷新页面后才能在LoadImage中查看`, 'success', 5000);

    return result;
  } catch (error) {
    console.error('上传文件时出错:', error);
    showNotification(`上传失败: ${error.message}`, 'error', 5000);
    return { success: false, error: error.message };
  }
}

// 上传文件夹为ZIP的函数
async function uploadFolderAsZip(folderName, zipBlob, parentDir = '') {
  try {
    console.log(`开始上传文件夹 ${folderName} 为ZIP文件，大小: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

    const formData = new FormData();
    formData.append('folder_zip', zipBlob, 'folder.zip');
    formData.append('folder_name', folderName);
    if (parentDir) {
      formData.append('parent_dir', parentDir);
      console.log(`上传文件夹: ${folderName} 到父目录: ${parentDir}`);
    } else {
      console.log(`上传文件夹: ${folderName} 到根目录`);
    }

    // 显示上传中提示
    const notification = showNotification(`正在上传文件夹: ${folderName}${parentDir ? ` 到 ${parentDir}` : ''}...`, 'info', 0);

    console.log(`发送上传请求到 /asoul/folder...`);
    const response = await fetch('/asoul/folder', {
      method: 'POST',
      body: formData
    });

    // 关闭上传中提示
    if (notification && notification.remove) {
      notification.remove();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`上传文件夹失败: ${response.status} ${response.statusText}`, errorText);
      throw new Error(`上传文件夹失败 (${response.status}): ${errorText || response.statusText}`);
    }

    const result = await response.json();
    console.log('上传文件夹结果:', result);

    // 显示上传成功提示
    let successMessage = '';
    if (result.message) {
      successMessage = result.message;
    } else if (result.extracted_count !== undefined) {
      successMessage = `成功上传文件夹 ${folderName}，共提取 ${result.extracted_count} 个图片文件`;
      if (result.skipped_count > 0) {
        successMessage += `，跳过 ${result.skipped_count} 个非图片文件`;
      }
    } else {
      successMessage = `成功上传文件夹 ${folderName}`;
    }
    successMessage += "，请刷新页面后才能在LoadImage中查看";
    
    showNotification(successMessage, 'success', 5000);

    return result;
  } catch (error) {
    console.error('上传文件夹时出错:', error);
    showNotification(`上传文件夹失败: ${error.message}`, 'error', 5000);
    return { success: false, error: error.message };
  }
}

// 处理目录输入的文件
async function handleDirectoryFiles(items) {
  try {
    console.log("开始处理目录输入的文件");
    const files = [];
    const entries = [];
    const parentDir = document.querySelector('.asoul_upload_section.active select')?.value || '';
    console.log(`当前选择的父目录: "${parentDir}"`);

    // 获取所有顶级目录
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.isFile) {
        // 单个文件
        console.log(`处理文件: ${item.name}`);
        const file = await new Promise((resolve, reject) => {
          item.file(resolve, reject);
        });
        files.push(file);
      } else if (item.isDirectory) {
        // 目录
        console.log(`添加目录: ${item.name}`);
        entries.push(item);
      }
    }

    console.log(`找到 ${files.length} 个文件和 ${entries.length} 个目录`);

    // 对于每个目录，获取其所有文件
    for (const entry of entries) {
      console.log(`开始处理目录: ${entry.name}`);
      try {
        // 存储该目录下的所有文件
        const directoryFiles = await collectFilesFromDirectory(entry);
        console.log(`从目录 ${entry.name} 收集到 ${directoryFiles.length} 个文件`);

        // 如果有文件，使用JSZip将它们打包成ZIP
        if (directoryFiles.length > 0) {
          console.log(`开始为目录 ${entry.name} 创建ZIP文件`);
          try {
            const JSZip = await loadJSZip();

            const zip = new JSZip();

            // 添加文件到zip，保持相对路径
            for (const fileObj of directoryFiles) {
              console.log(`添加文件到ZIP: ${fileObj.path}`);
              zip.file(fileObj.path, fileObj.file);
            }

            // 生成ZIP文件
            console.log(`生成ZIP文件...`);
            const zipBlob = await zip.generateAsync({ type: 'blob' });
            console.log(`ZIP文件大小: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

            // 上传ZIP文件
            console.log(`上传ZIP文件 ${entry.name}...`);
            const uploadResult = await uploadFolderAsZip(entry.name, zipBlob, parentDir);
            console.log(`上传结果:`, uploadResult);
          } catch (zipError) {
            console.error(`创建或上传ZIP文件时出错:`, zipError);
            showNotification(`为目录 ${entry.name} 创建ZIP文件失败: ${zipError.message}`, 'error', 5000);
          }
        } else {
          console.log(`目录 ${entry.name} 中没有找到文件，跳过`);
        }
      } catch (dirError) {
        console.error(`处理目录 ${entry.name} 时出错:`, dirError);
        showNotification(`处理目录 ${entry.name} 失败: ${dirError.message}`, 'error', 5000);
      }
    }

    // 如果有单独的文件，正常上传
    if (files.length > 0) {
      console.log(`开始上传 ${files.length} 个单独的文件...`);
      await uploadFiles(files, parentDir);
    }

    console.log(`目录处理完成`);
    return {
      success: true,
      fileCount: files.length,
      directoryCount: entries.length
    };
  } catch (error) {
    console.error('处理目录文件时出错:', error);
    showNotification(`处理目录文件失败: ${error.message}`, 'error', 5000);
    return { success: false, error: error.message };
  }
}

// 从目录收集所有文件
async function collectFilesFromDirectory(directoryEntry, path = '') {
  console.log(`开始收集目录 ${directoryEntry.name} 的文件，当前路径: ${path}`);
  const files = [];
  const reader = directoryEntry.createReader();

  // 递归读取目录中的所有条目
  const readEntries = async () => {
    try {
      const entries = await new Promise((resolve, reject) => {
        reader.readEntries(resolve, reject);
      });

      console.log(`在目录 ${directoryEntry.name}${path ? '/' + path : ''} 中找到 ${entries.length} 个条目`);

      if (entries.length > 0) {
        for (const entry of entries) {
          const entryPath = path ? `${path}/${entry.name}` : entry.name;

          if (entry.isFile) {
            try {
              const file = await new Promise((resolve, reject) => {
                entry.file(resolve, reject);
              });
              files.push({
                file: file,
                path: entryPath
              });
            } catch (fileError) {
              console.error(`读取文件 ${entryPath} 失败:`, fileError);
            }
          } else if (entry.isDirectory) {
            // 递归处理子目录
            try {
              const subFiles = await collectFilesFromDirectory(entry, entryPath);
              files.push(...subFiles);
            } catch (dirError) {
              console.error(`处理子目录 ${entryPath} 失败:`, dirError);
            }
          }
        }

        // 继续读取（处理大目录）
        try {
          const moreFiles = await readEntries();
          files.push(...moreFiles);
        } catch (moreError) {
          console.error(`读取更多条目失败:`, moreError);
        }
      }
    } catch (readError) {
      console.error(`读取目录 ${directoryEntry.name}${path ? '/' + path : ''} 条目失败:`, readError);
    }

    return files;
  };

  const result = await readEntries();
  console.log(`从目录 ${directoryEntry.name}${path ? '/' + path : ''} 共收集到 ${result.length} 个文件`);
  return result;
}

// 添加CSS样式
function ensureStyles() {
  // 检查样式是否已存在
  if (document.getElementById('asoul-upload-styles')) {
    return;
  }

  // 创建样式标签
  const styleEl = document.createElement('style');
  styleEl.id = 'asoul-upload-styles';
  styleEl.innerHTML = `
    /* ASoul上传工具样式 */
    .asoul_upload_container {
      padding: 15px;
      overflow-y: auto;
      max-height: 100%;
      border-radius: 5px;
    }
    .asoul_tab_container {
      display: flex;
      border-bottom: 1px solid #1976D2;
      margin-bottom: 15px;
    }
    .asoul_tab {
      padding: 8px 15px;
      cursor: pointer;
      user-select: none;
      border: 1px solid transparent;
      border-bottom: none;
      border-radius: 4px 4px 0 0;
      transition: background-color 0.2s;
    }
    .asoul_tab:hover {
      background-color: rgba(33, 150, 243, 0.1);
    }
    .asoul_tab.active {
      font-weight: bold;
      border-color: #1976D2;
      background-color: #2196F3;
      color: white;
      position: relative;
    }
    .asoul_tab.active:after {
      content: '';
      position: absolute;
      height: 2px;
      background: #2196F3;
      bottom: -1px;
      left: 0;
      right: 0;
    }
    .asoul_upload_section {
      display: none;
      flex-direction: column;
      gap: 10px;
      padding: 15px;
      border-radius: 4px;
    }
    .asoul_upload_section.active {
      display: flex;
    }
    .asoul_file_drop {
      border: 2px dashed #90CAF9;
      border-radius: 5px;
      padding: 20px;
      text-align: center;
      cursor: pointer;
      transition: all 0.2s;
      margin-bottom: 10px;
      font-weight: 500;
    }
    .asoul_file_drop:hover, .asoul_file_drop.dragging {
      border-color: #2196F3;
      background-color: rgba(33, 150, 243, 0.1);
    }
    .asoul_file_list {
      max-height: 200px;
      overflow-y: auto;
      border: 1px solid;
      border-radius: 4px;
      padding: 5px;
      margin-bottom: 10px;
    }
    .asoul_file_item {
      padding: 8px;
      border-bottom: 1px solid;
      word-break: break-word;
    }
    .asoul_file_item:last-child {
      border-bottom: none;
    }
    .asoul_upload_section button {
      background-color: #2196F3;
      color: white;
      border: none;
      padding: 10px 15px;
      border-radius: 4px;
      cursor: pointer;
      transition: all 0.2s;
      font-weight: 500;
    }
    .asoul_upload_section button:hover:not(:disabled) {
      background-color: #1976D2;
    }
    .asoul_upload_section button:disabled {
      background-color: #BDBDBD;
      opacity: 0.7;
      cursor: not-allowed;
    }
    .asoul_upload_section label {
      font-weight: 500;
      margin-bottom: 5px;
      display: block;
    }
    .asoul_upload_section input[type="text"], 
    .asoul_upload_section select {
      padding: 10px;
      border: 1px solid;
      border-radius: 4px;
      width: 100%;
    }
    .asoul_upload_section select:focus,
    .asoul_upload_section input[type="text"]:focus {
      outline: none;
      border-color: #2196F3;
    }
    .asoul_error {
      color: #D32F2F;
      margin-bottom: 10px;
      padding: 8px;
      border-radius: 4px;
      border-left: 3px solid #F44336;
    }
    
    /* 通知容器样式 */
    #asoul-notification-container {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
    }
    
    /* 适配暗色模式 */
    @media (prefers-color-scheme: dark) {
      .asoul_tab:not(.active) {
        color: #e0e0e0;
      }
      .asoul_file_drop {
        color: #90CAF9;
      }
    }
  `;

  document.head.appendChild(styleEl);
}

// 加载JSZip库
async function loadJSZip() {
  try {
    if (window.JSZip) {
      console.log('JSZip已加载 (全局):', window.JSZip.version);
      return window.JSZip;
    }

    console.log('正在动态加载JSZip库...');
    const JSZip = (await import('https://cdn.jsdelivr.net/npm/jszip@3.10.1/+esm')).default;

    if (JSZip) {
      window.JSZip = JSZip;
      console.log('JSZip加载成功:', JSZip.version);
      return JSZip;
    } else {
      throw new Error('JSZip加载失败');
    }
  } catch (error) {
    console.error('加载JSZip库时出错:', error);
    throw error;
  }
}

// ASoul上传工具主扩展对象
const ASoulUploadExtension = {
  name: "ASoul.ImageUpload.Main",

  init: () => {
    console.log("ASoul上传工具: 开始初始化扩展...");

    try {
      ensureStyles();

      // 注册图片浏览侧边栏
      if (app.extensionManager && app.extensionManager.registerSidebarTab) {

        // 添加上传入口选项卡
        app.extensionManager.registerSidebarTab({
          id: 'asoul-upload-entry',
          icon: 'pi pi-upload',
          title: '上传',
          tooltip: '上传图片和文件夹到ComfyUI',
          type: 'custom',

          render: async (el) => {
            console.log("ASoul上传工具: 渲染上传界面");

            try {
              // 确保JSZip可用
              await loadJSZip();
            } catch (error) {
              console.error("无法加载JSZip库，文件夹上传功能可能不可用:", error);
            }

            // 获取文件夹列表
            const directories = await getUserFolders();

            const container = makeElement('div', 'asoul_upload_container');
            const heading = document.createElement('h3');
            heading.textContent = '文件上传工具';

            // 创建选项卡
            const tabContainer = makeElement('div', 'asoul_tab_container');

            const fileTab = makeElement('div', 'asoul_tab active');
            fileTab.textContent = '上传文件';

            const folderTab = makeElement('div', 'asoul_tab');
            folderTab.textContent = '上传文件夹';

            tabContainer.appendChild(fileTab);
            tabContainer.appendChild(folderTab);

            // 创建文件上传部分
            const fileSection = makeElement('div', 'asoul_upload_section active');

            // 创建文件拖放区域
            const fileDropArea = makeElement('div', 'asoul_file_drop');
            fileDropArea.textContent = '拖放图片文件到这里或点击选择';

            // 创建隐藏的文件输入框
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.multiple = true;
            fileInput.accept = 'image/*';
            fileInput.style.display = 'none';

            // 创建文件列表显示区
            const fileList = makeElement('div', 'asoul_file_list');
            fileList.style.display = 'none';

            // 创建目标文件夹选择器
            const fileDestSelector = makeSelect(directories, '');
            const fileDestLabel = document.createElement('label');
            fileDestLabel.textContent = '选择目标文件夹:';

            // 创建上传按钮
            const uploadFileButton = document.createElement('button');
            uploadFileButton.textContent = '上传文件';
            uploadFileButton.disabled = true;

            // 当前选择的文件
            let selectedFiles = [];

            // 点击拖放区域触发文件选择
            fileDropArea.onclick = () => fileInput.click();

            // 处理拖放效果
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
              fileDropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
              }, false);
            });

            // 拖放区域高亮
            ['dragenter', 'dragover'].forEach(eventName => {
              fileDropArea.addEventListener(eventName, () => {
                fileDropArea.classList.add('dragging');
              }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
              fileDropArea.addEventListener(eventName, () => {
                fileDropArea.classList.remove('dragging');
              }, false);
            });

            // 处理文件选择
            const handleFiles = (files) => {
              selectedFiles = Array.from(files);

              if (selectedFiles.length > 0) {
                // 显示已选文件
                fileList.innerHTML = '';
                fileList.style.display = 'block';

                selectedFiles.forEach(file => {
                  const fileItem = makeElement('div', 'asoul_file_item');
                  fileItem.textContent = file.name;
                  fileList.appendChild(fileItem);
                });

                uploadFileButton.disabled = false;
              } else {
                fileList.style.display = 'none';
                uploadFileButton.disabled = true;
              }
            };

            // 监听文件选择
            fileInput.addEventListener('change', (e) => {
              handleFiles(e.target.files);
            });

            // 处理文件拖放
            fileDropArea.addEventListener('drop', (e) => {
              handleFiles(e.dataTransfer.files);
            }, false);

            // 处理上传按钮点击
            uploadFileButton.addEventListener('click', async () => {
              if (selectedFiles.length > 0) {
                const targetFolder = fileDestSelector.value;
                const result = await uploadFiles(selectedFiles, targetFolder);

                if (result.success !== false) {
                  // 清空文件列表和选择
                  fileList.innerHTML = '';
                  fileList.style.display = 'none';
                  fileInput.value = '';
                  selectedFiles = [];
                  uploadFileButton.disabled = true;
                }
              }
            });

            // 组装文件上传部分
            fileSection.appendChild(fileDropArea);
            fileSection.appendChild(fileList);
            fileSection.appendChild(fileDestLabel);
            fileSection.appendChild(fileDestSelector);
            fileSection.appendChild(uploadFileButton);
            fileSection.appendChild(fileInput);

            // 创建文件夹上传部分
            const folderSection = makeElement('div', 'asoul_upload_section');

            // 创建文件夹拖放区域
            const folderDropArea = makeElement('div', 'asoul_file_drop');
            folderDropArea.textContent = '拖放文件夹到这里或点击选择';

            // 创建文件夹输入
            const folderInput = document.createElement('input');
            folderInput.type = 'file';
            folderInput.multiple = true;

            // 设置webkitdirectory属性以允许选择文件夹
            try {
              folderInput.webkitdirectory = true;
              // 尝试额外设置directory属性（某些浏览器需要）
              folderInput.setAttribute('directory', '');
              folderInput.setAttribute('mozdirectory', '');
              console.log('文件夹选择属性已设置');
            } catch (error) {
              console.error('设置文件夹选择属性时出错:', error);
              showNotification(`您的浏览器可能不支持文件夹选择功能`, 'warning', 5000);
            }

            folderInput.style.display = 'none';

            // 创建文件夹列表显示区
            const folderList = makeElement('div', 'asoul_file_list');
            folderList.style.display = 'none';

            // 创建目标父文件夹选择器
            const folderDestSelector = makeSelect(directories, '');


            // 创建文件夹名称输入
            const folderNameInput = document.createElement('input');
            folderNameInput.type = 'text';
            folderNameInput.placeholder = '文件夹名称 (可选)';
            const folderNameLabel = document.createElement('label');
            folderNameLabel.textContent = '文件夹名称 (留空则使用原名):';

            // 创建上传按钮
            const uploadFolderButton = document.createElement('button');
            uploadFolderButton.textContent = '上传文件夹';
            uploadFolderButton.disabled = true;

            // 当前选择的文件夹
            let selectedFolder = null;
            let selectedFolderFiles = [];

            // 点击拖放区域触发文件夹选择
            folderDropArea.onclick = () => {
              try {
                console.log('点击选择文件夹...');
                folderInput.click();
              } catch (error) {
                console.error('触发文件夹选择器失败:', error);
                const errorItem = makeElement('div', 'asoul_error');
                errorItem.textContent = `无法打开文件夹选择器: ${error.message}`;
                folderList.innerHTML = '';
                folderList.style.display = 'block';
                folderList.appendChild(errorItem);
              }
            };

            // 处理拖放效果
            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
              folderDropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
              }, false);
            });

            // 拖放区域高亮
            ['dragenter', 'dragover'].forEach(eventName => {
              folderDropArea.addEventListener(eventName, () => {
                folderDropArea.classList.add('dragging');
              }, false);
            });

            ['dragleave', 'drop'].forEach(eventName => {
              folderDropArea.addEventListener(eventName, () => {
                folderDropArea.classList.remove('dragging');
              }, false);
            });

            // 处理文件夹选择
            folderInput.addEventListener('change', async (e) => {
              const files = Array.from(e.target.files);
              if (files.length > 0) {
                // 尝试提取公共文件夹名
                const paths = files.map(f => f.webkitRelativePath);
                const folderName = paths[0].split('/')[0];

                console.log(`已选择文件夹: ${folderName}，包含 ${files.length} 个文件`);
                selectedFolder = folderName;
                selectedFolderFiles = files;

                // 更新UI
                folderList.innerHTML = '';
                folderList.style.display = 'block';

                // 显示文件夹名称
                const folderItem = makeElement('div', 'asoul_file_item');
                folderItem.innerHTML = `<strong>${folderName}</strong> (${files.length} 个文件)`;
                folderList.appendChild(folderItem);

                // 显示部分文件
                const maxFilesToShow = Math.min(5, files.length);
                for (let i = 0; i < maxFilesToShow; i++) {
                  const fileItem = makeElement('div', 'asoul_file_item');
                  fileItem.textContent = `- ${files[i].name}`;
                  folderList.appendChild(fileItem);
                }

                if (files.length > maxFilesToShow) {
                  const moreItem = makeElement('div', 'asoul_file_item');
                  moreItem.textContent = `... 还有 ${files.length - maxFilesToShow} 个文件`;
                  folderList.appendChild(moreItem);
                }

                uploadFolderButton.disabled = false;
                folderNameInput.value = folderName;
              }
            });

            // 处理文件夹拖放
            folderDropArea.addEventListener('drop', async (e) => {
              console.log("文件夹拖放事件触发");
              const items = e.dataTransfer.items;
              if (items && items.length > 0) {
                console.log(`拖放项目数量: ${items.length}`);

                // 处理拖放的文件和文件夹
                const entries = [];
                let hasWebkitGetAsEntry = false;

                // 检查webkitGetAsEntry方法是否可用
                if (items[0].webkitGetAsEntry) {
                  hasWebkitGetAsEntry = true;
                  console.log("webkitGetAsEntry方法可用");

                  for (let i = 0; i < items.length; i++) {
                    // webkitGetAsEntry 需要在拖放事件中调用
                    const entry = items[i].webkitGetAsEntry();
                    if (entry) {
                      console.log(`项目 ${i}: 类型=${entry.isDirectory ? '文件夹' : '文件'}, 名称=${entry.name}`);
                      entries.push(entry);
                    } else {
                      console.warn(`项目 ${i}: 无法获取entry对象`);
                    }
                  }
                } else {
                  console.warn("浏览器不支持webkitGetAsEntry，尝试使用传统方法处理文件");
                  // 尝试使用传统方法获取文件
                  const files = e.dataTransfer.files;
                  if (files && files.length > 0) {
                    console.log(`获取到 ${files.length} 个文件`);
                    for (let i = 0; i < files.length; i++) {
                      console.log(`文件 ${i}: ${files[i].name}`);
                    }
                    // 直接上传这些文件
                    await uploadFiles(Array.from(files), document.querySelector('.asoul_upload_section.active select')?.value || '');
                    return;
                  }
                }

                // 如果有文件夹，处理它
                const hasDirectory = entries.some(entry => entry && entry.isDirectory);
                console.log(`是否包含文件夹: ${hasDirectory}`);

                if (hasDirectory && hasWebkitGetAsEntry) {
                  folderList.innerHTML = '';
                  folderList.style.display = 'block';

                  const loadingItem = makeElement('div', 'asoul_file_item');
                  loadingItem.textContent = '正在加载文件夹内容...';
                  folderList.appendChild(loadingItem);

                  try {
                    console.log("开始处理文件夹内容");
                    // 开始处理文件夹
                    const result = await handleDirectoryFiles(entries);
                    console.log("文件夹处理结果:", result);

                    // 清空列表
                    folderList.innerHTML = '';

                    if (result.success) {
                      const resultItem = makeElement('div', 'asoul_file_item');
                      resultItem.textContent = `成功处理 ${result.directoryCount} 个文件夹和 ${result.fileCount} 个文件。`;
                      folderList.appendChild(resultItem);

                      // 3秒后隐藏结果
                      setTimeout(() => {
                        folderList.innerHTML = '';
                        folderList.style.display = 'none';
                      }, 3000);
                    } else {
                      const errorItem = makeElement('div', 'asoul_file_item');
                      errorItem.textContent = `处理失败: ${result.error}`;
                      errorItem.style.color = '#ff5555';
                      folderList.appendChild(errorItem);
                    }
                  } catch (error) {
                    console.error("处理文件夹时出错:", error);
                    folderList.innerHTML = '';
                    const errorItem = makeElement('div', 'asoul_file_item');
                    errorItem.textContent = `处理失败: ${error.message}`;
                    errorItem.style.color = '#ff5555';
                    folderList.appendChild(errorItem);
                  }
                } else if (!hasWebkitGetAsEntry) {
                  folderList.innerHTML = '';
                  folderList.style.display = 'block';
                  const errorItem = makeElement('div', 'asoul_file_item');
                  errorItem.textContent = `您的浏览器不支持文件夹上传功能。请尝试使用Chrome或Edge浏览器。`;
                  errorItem.style.color = '#ff5555';
                  folderList.appendChild(errorItem);
                }
              }
            }, false);

            // 处理上传按钮点击
            uploadFolderButton.addEventListener('click', async () => {
              if (selectedFolder && selectedFolderFiles.length > 0) {
                try {
                  // 显示加载中
                  uploadFolderButton.disabled = true;
                  uploadFolderButton.textContent = '正在处理...';

                  console.log(`开始处理选择的文件夹: ${selectedFolder} (${selectedFolderFiles.length} 个文件)`);

                  // 创建JSZip实例
                  const JSZip = await loadJSZip();
                  const zip = new JSZip();

                  // 添加所有文件到zip
                  for (const file of selectedFolderFiles) {
                    // 移除顶级目录，保持内部结构
                    const path = file.webkitRelativePath.split('/').slice(1).join('/');
                    console.log(`添加文件到ZIP: ${path}`);
                    if (path) {
                      zip.file(path, file);
                    }
                  }

                  // 生成zip文件
                  console.log(`生成ZIP文件...`);
                  const zipBlob = await zip.generateAsync({ type: 'blob' });
                  console.log(`ZIP文件生成完成，大小: ${(zipBlob.size / 1024 / 1024).toFixed(2)} MB`);

                  // 使用自定义名称或原始文件夹名
                  const folderName = folderNameInput.value.trim() || selectedFolder;
                  const parentDir = folderDestSelector.value;

                  // 上传ZIP文件
                  console.log(`上传ZIP文件 ${folderName}...`);
                  const result = await uploadFolderAsZip(folderName, zipBlob, parentDir);
                  console.log(`上传结果:`, result);

                  if (result.success !== false) {
                    // 重置UI
                    folderList.innerHTML = '';
                    folderList.style.display = 'none';
                    folderInput.value = '';
                    folderNameInput.value = '';
                    selectedFolder = null;
                    selectedFolderFiles = [];
                  }
                } catch (error) {
                  console.error(`处理文件夹上传时出错:`, error);
                  showNotification(`上传文件夹失败: ${error.message}`, 'error', 5000);

                  // 显示错误信息
                  const errorItem = makeElement('div', 'asoul_file_item');
                  errorItem.textContent = `上传失败: ${error.message}`;
                  errorItem.style.color = '#ff5555';
                  folderList.innerHTML = '';
                  folderList.appendChild(errorItem);
                } finally {
                  uploadFolderButton.disabled = false;
                  uploadFolderButton.textContent = '上传文件夹';
                }
              }
            });

            // 标签切换逻辑
            fileTab.addEventListener('click', () => {
              fileTab.classList.add('active');
              folderTab.classList.remove('active');
              fileSection.classList.add('active');
              folderSection.classList.remove('active');
            });

            folderTab.addEventListener('click', async () => {
              folderTab.classList.add('active');
              fileTab.classList.remove('active');
              folderSection.classList.add('active');
              fileSection.classList.remove('active');

              // 检查JSZip是否可用
              try {
                const JSZip = await loadJSZip();
                console.log('JSZip已加载:', JSZip.version);
              } catch (error) {
                console.error('加载JSZip时出错:', error);
                const warningItem = makeElement('div', 'asoul_file_item');
                warningItem.textContent = `无法加载JSZip库，文件夹上传功能可能不可用: ${error.message}`;
                warningItem.style.color = '#ff9900';
                folderList.innerHTML = '';
                folderList.style.display = 'block';
                folderList.appendChild(warningItem);
              }

              // 检查浏览器是否支持webkitGetAsEntry
              const dataTransferItemPrototype = DataTransferItem.prototype;
              if (!dataTransferItemPrototype.webkitGetAsEntry) {
                console.warn('浏览器不支持webkitGetAsEntry方法');
                const warningItem = makeElement('div', 'asoul_file_item');
                warningItem.textContent = `您的浏览器可能不支持文件夹拖放功能。请尝试使用Chrome或Edge浏览器，或使用文件夹选择按钮。`;
                warningItem.style.color = '#ff9900';
                folderList.innerHTML = '';
                folderList.style.display = 'block';
                folderList.appendChild(warningItem);
              }
            });

            // 组装文件夹上传部分
            folderSection.appendChild(folderDropArea);
            folderSection.appendChild(folderList);
            folderSection.appendChild(folderNameLabel);
            folderSection.appendChild(folderNameInput);
            folderSection.appendChild(uploadFolderButton);
            folderSection.appendChild(folderInput);

            // 组装主界面
            container.appendChild(heading);
            container.appendChild(tabContainer);
            container.appendChild(fileSection);
            container.appendChild(folderSection);

            el.appendChild(container);

            console.log("ASoul上传工具: 上传界面渲染完成");
          },
          destroy: () => {
            app.api.removeEventListener('status')
          },
        });

        console.log("ASoul上传工具: 侧边栏选项卡注册成功");
      } else {
        console.warn("ASoul上传工具: registerSidebarTab 不可用，无法添加侧边栏功能");
      }
    } catch (error) {
      console.error("ASoul上传工具: 添加UI元素时出错", error);
    }
  },
};

// 注册扩展
try {
  if (app) {

    app.registerExtension(ASoulUploadExtension);
    console.log("ASoul上传工具: 扩展成功注册");
  } else {
    console.error("ASoul上传工具: 注册时 ComfyUI app 对象不可用");
  }
} catch (error) {
  console.error("ASoul上传工具: 调用 app.registerExtension 时出错", error);
} 