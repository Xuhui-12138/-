// 全局变量
let uploadedImage = null;
let generatedImageDataUrl = null;

// DOM 元素
const imageInput = document.getElementById('imageInput');
const imageUploadArea = document.getElementById('imageUploadArea');
const imagePreview = document.getElementById('imagePreview');
const uploadPlaceholder = imageUploadArea.querySelector('.upload-placeholder');
const textInput = document.getElementById('textInput');
const lineCount = document.getElementById('lineCount');
const generateBtn = document.getElementById('generateBtn');
const resultSection = document.getElementById('resultSection');
const resultContainer = document.getElementById('resultContainer');
const downloadBtn = document.getElementById('downloadBtn');

// 初始化事件监听
initEventListeners();

function initEventListeners() {
    // 图片上传区域点击
    imageUploadArea.addEventListener('click', () => {
        imageInput.click();
    });

    // 文件选择
    imageInput.addEventListener('change', handleFileSelect);

    // 拖拽上传
    imageUploadArea.addEventListener('dragover', handleDragOver);
    imageUploadArea.addEventListener('dragleave', handleDragLeave);
    imageUploadArea.addEventListener('drop', handleDrop);

    // 文本输入监听
    textInput.addEventListener('input', updateLineCount);
    textInput.addEventListener('input', updateGenerateButton);

    // 生成按钮
    generateBtn.addEventListener('click', generateImage);

    // 下载按钮
    downloadBtn.addEventListener('click', downloadImage);
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        processImageFile(file);
    }
}

// 处理拖拽
function handleDragOver(e) {
    e.preventDefault();
    imageUploadArea.classList.add('dragover');
}

function handleDragLeave(e) {
    e.preventDefault();
    imageUploadArea.classList.remove('dragover');
}

function handleDrop(e) {
    e.preventDefault();
    imageUploadArea.classList.remove('dragover');
    
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith('image/')) {
        processImageFile(file);
    } else {
        showError('请上传图片文件');
    }
}

// 处理图片文件
function processImageFile(file) {
    // 检查文件大小（10MB）
    if (file.size > 10 * 1024 * 1024) {
        showError('图片大小不能超过 10MB');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        uploadedImage = new Image();
        uploadedImage.onload = () => {
            imagePreview.src = e.target.result;
            imagePreview.style.display = 'block';
            uploadPlaceholder.style.display = 'none';
            updateGenerateButton();
        };
        uploadedImage.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// 更新行数统计
function updateLineCount() {
    const lines = textInput.value.split('\n').filter(line => line.trim().length > 0);
    lineCount.textContent = `${lines.length} 行文本`;
}

// 更新生成按钮状态
function updateGenerateButton() {
    const hasImage = uploadedImage !== null;
    const hasText = textInput.value.trim().length > 0;
    generateBtn.disabled = !(hasImage && hasText);
}

// 生成图片
function generateImage() {
    if (!uploadedImage) {
        showError('请先上传图片');
        return;
    }

    const textLines = textInput.value.split('\n').filter(line => line.trim().length > 0);
    if (textLines.length === 0) {
        showError('请输入至少一行文本');
        return;
    }

    // 显示加载状态
    generateBtn.disabled = true;
    generateBtn.querySelector('.btn-text').style.display = 'none';
    generateBtn.querySelector('.btn-loading').style.display = 'flex';

    // 使用 setTimeout 让 UI 更新
    setTimeout(() => {
        try {
            const canvas = createCompositeImage(uploadedImage, textLines);
            generatedImageDataUrl = canvas.toDataURL('image/png');
            
            // 显示结果
            displayResult(generatedImageDataUrl);
            
            // 隐藏加载状态
            generateBtn.disabled = false;
            generateBtn.querySelector('.btn-text').style.display = 'block';
            generateBtn.querySelector('.btn-loading').style.display = 'none';
        } catch (error) {
            console.error('生成图片失败:', error);
            showError('生成图片失败，请重试');
            generateBtn.disabled = false;
            generateBtn.querySelector('.btn-text').style.display = 'block';
            generateBtn.querySelector('.btn-loading').style.display = 'none';
        }
    }, 100);
}

// 创建合成图片
function createCompositeImage(image, textLines) {
    const imageWidth = image.width;
    const imageHeight = image.height;
    
    // 字幕区域高度（每行字幕的高度，约为原图高度的1/8）
    const subtitleHeight = Math.max(60, Math.floor(imageHeight / 8));
    const padding = 20;
    const subtitleAreaHeight = textLines.length * subtitleHeight;
    
    // 计算画布尺寸
    const canvasWidth = imageWidth;
    const canvasHeight = imageHeight + subtitleAreaHeight;
    
    // 创建画布
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    // 绘制原图（上方）
    ctx.drawImage(image, 0, 0, imageWidth, imageHeight);
    
    // 在原图底部叠加字幕（第一行字幕叠加在原图上）
    if (textLines.length > 0) {
        const firstSubtitleY = imageHeight - subtitleHeight;
        
        // 使用原图底部的一部分作为字幕底图
        const sourceY = Math.max(0, imageHeight - subtitleHeight);
        const sourceHeight = Math.min(subtitleHeight, imageHeight);
        
        // 绘制原图的一部分作为底图
        ctx.drawImage(
            image,
            0, sourceY, imageWidth, sourceHeight,
            0, firstSubtitleY, imageWidth, subtitleHeight
        );
        
        // 添加半透明黑色背景层
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, firstSubtitleY, imageWidth, subtitleHeight);
        
        // 绘制第一行字幕文本
        drawSubtitleText(ctx, textLines[0], imageWidth, firstSubtitleY, subtitleHeight, padding);
    }
    
    // 绘制下方字幕区域（从第二行开始）
    for (let i = 1; i < textLines.length; i++) {
        const subtitleY = imageHeight + ((i - 1) * subtitleHeight);
        
        // 使用原图的一部分作为字幕底图
        // 从原图底部提取一部分作为底图
        const sourceY = Math.max(0, imageHeight - subtitleHeight);
        const sourceHeight = Math.min(subtitleHeight, imageHeight);
        
        // 绘制原图的一部分作为底图
        ctx.drawImage(
            image,
            0, sourceY, imageWidth, sourceHeight,
            0, subtitleY, imageWidth, subtitleHeight
        );
        
        // 添加半透明黑色背景层
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, subtitleY, imageWidth, subtitleHeight);
        
        // 绘制字幕文本
        drawSubtitleText(ctx, textLines[i], imageWidth, subtitleY, subtitleHeight, padding);
    }
    
    return canvas;
}

// 绘制字幕文本的辅助函数
function drawSubtitleText(ctx, text, imageWidth, subtitleY, subtitleHeight, padding) {
    // 绘制字幕文本
    ctx.fillStyle = 'white';
    // 根据字幕高度动态调整字体大小
    const fontSize = Math.max(20, Math.floor(subtitleHeight * 0.3));
    ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Hiragino Sans GB", Arial, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    // 处理文本换行（如果文本太长）
    const maxWidth = imageWidth - padding * 2;
    const chars = text.split('');
    let line = '';
    let y = subtitleY + subtitleHeight / 2;
    const lineHeight = Math.floor(subtitleHeight * 0.4);
    
    // 中文文本处理 - 逐字符检查
    for (let i = 0; i < chars.length; i++) {
        const testLine = line + chars[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line.length > 0) {
            ctx.fillText(line, imageWidth / 2, y);
            line = chars[i];
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    if (line.length > 0) {
        ctx.fillText(line, imageWidth / 2, y);
    }
}

// 显示结果
function displayResult(imageDataUrl) {
    // 清除之前的内容
    resultContainer.innerHTML = '';
    
    // 创建图片元素
    const img = document.createElement('img');
    img.src = imageDataUrl;
    img.className = 'result-image';
    img.alt = '生成的合成图片';
    
    resultContainer.appendChild(img);
    resultSection.style.display = 'block';
    
    // 滚动到结果区域
    resultSection.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// 下载图片
function downloadImage() {
    if (!generatedImageDataUrl) {
        showError('没有可下载的图片');
        return;
    }
    
    const link = document.createElement('a');
    link.download = `字幕图片_${new Date().getTime()}.png`;
    link.href = generatedImageDataUrl;
    link.click();
}

// 显示错误信息
function showError(message) {
    // 移除之前的错误信息
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.textContent = message;
    
    // 插入到上传区域下方
    imageUploadArea.parentElement.appendChild(errorDiv);
    
    // 3秒后自动移除
    setTimeout(() => {
        errorDiv.remove();
    }, 3000);
}
