// 初始化日期
document.addEventListener('DOMContentLoaded', () => {
    alert("【系統通知】成功載入最新版 V6 系統！");
    const dateInput = document.getElementById('uploadDate');
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;

    // 註冊 Service Worker (PWA)
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker registered', reg))
            .catch(err => console.log('Service Worker not registered', err));
    }
});

// 照片預覽邏輯
function setupImagePreview(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);

    input.addEventListener('change', function () {
        preview.innerHTML = ''; // 清空預覽
        const files = this.files;

        if (files) {
            Array.from(files).forEach(file => {
                if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onload = function (e) {
                        const img = document.createElement('img');
                        img.src = e.target.result;
                        preview.appendChild(img);
                    }
                    reader.readAsDataURL(file);
                }
            });
        }
    });
}

setupImagePreview('poPhoto', 'poPhotoPreview');
setupImagePreview('physicalPhoto', 'physicalPhotoPreview');

// 顯示提示訊息
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast show ${type}`;

    setTimeout(() => {
        toast.className = 'toast hidden';
    }, 3000);
}

// 圖片壓縮轉換 Base64 (避免檔案過大導致 GAS 逾時)
function compressImage(file, maxWidth = 1024, maxHeight = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);

        const reader = new FileReader();
        reader.onload = function (event) {
            const img = new Image();
            img.onload = function () {
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > maxWidth) {
                        height = Math.round(height *= maxWidth / width);
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width = Math.round(width *= maxHeight / height);
                        height = maxHeight;
                    }
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 將圖片轉為 base64 字串，並去除 prefix
                const dataUrl = canvas.toDataURL('image/jpeg', quality);
                const base64Data = dataUrl.split(',')[1];
                resolve({
                    name: file.name,
                    mimeType: 'image/jpeg',
                    data: base64Data
                });
            };
            img.onerror = reject;
            img.src = event.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

let submitted = false;
const formElement = document.getElementById('iqcForm');
const hiddenIframe = document.getElementById('hidden_iframe');

// 監聽隱藏 iframe 的載入事件 (代表 Google 回傳成功畫面了)
hiddenIframe.onload = function() {
    if (submitted) {
        showToast('檢驗紀錄上傳成功！');
        formElement.reset();
        document.getElementById('uploadDate').value = new Date().toISOString().split('T')[0];
        document.getElementById('poPhotoPreview').innerHTML = '';
        document.getElementById('physicalPhotoPreview').innerHTML = '';
        
        document.getElementById('submitBtn').disabled = false;
        document.getElementById('submitBtn').querySelector('.btn-text').textContent = '送出檢驗紀錄';
        document.getElementById('submitBtn').querySelector('.spinner').classList.add('hidden');
        submitted = false;
    }
};

formElement.addEventListener('submit', async function (e) {
    // 阻止原生送出，讓我們可以先壓縮圖片
    e.preventDefault();

    const submitBtn = document.getElementById('submitBtn');
    const btnText = submitBtn.querySelector('.btn-text');
    const spinner = submitBtn.querySelector('.spinner');

    submitBtn.disabled = true;
    btnText.textContent = '資料處理中...';
    spinner.classList.remove('hidden');

    try {
        const poPhotoFile = document.getElementById('poPhoto').files[0];
        const physicalPhotoFile = document.getElementById('physicalPhoto').files[0];

        // 將圖片壓縮成 Base64 字串，並放入隱藏的 <input> 準備傳送
        if (poPhotoFile) {
            const compressed = await compressImage(poPhotoFile);
            document.getElementById('hiddenPoPhotoBase64').value = compressed.data;
        } else {
            document.getElementById('hiddenPoPhotoBase64').value = '';
        }

        if (physicalPhotoFile) {
            const compressed = await compressImage(physicalPhotoFile);
            document.getElementById('hiddenPhysicalPhotoBase64').value = compressed.data;
        } else {
            document.getElementById('hiddenPhysicalPhotoBase64').value = '';
        }
        
        // 為了避免將原始的「超大圖片檔案」也一併送給 Google 導致逾時，我們暫時禁用 file input
        document.getElementById('poPhoto').disabled = true;
        document.getElementById('physicalPhoto').disabled = true;

        // 標記為正在提交，並呼叫原生 Form API 送出到隱藏的 iframe
        submitted = true;
        btnText.textContent = '上傳至 Google...';
        formElement.submit();

        // 原生送出指令發出後，立刻恢復 file input，以免影響使用者下次選擇
        document.getElementById('poPhoto').disabled = false;
        document.getElementById('physicalPhoto').disabled = false;

    } catch (error) {
        showToast('圖片處理錯誤: ' + error.message, 'error');
        submitBtn.disabled = false;
        btnText.textContent = '送出檢驗紀錄';
        spinner.classList.add('hidden');
    }
});
