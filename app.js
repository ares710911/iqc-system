// 系統 URL 常數
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjoY2yX5BsyojlCUcv8VV8xRhA_ZQEIoMs7CySMDX14MDTpBGVOj9UurjzmbRZohHm/exec';

// 將 Google Drive 檢視網址轉換為直連圖片網址
function getDirectImageUrl(url) {
    if (!url) return '';
    if (url.includes('drive.google.com')) {
        let fileId = '';
        if (url.includes('/file/d/')) {
            fileId = url.split('/file/d/')[1].split('/')[0];
        } else if (url.includes('?id=')) {
            fileId = url.split('?id=')[1].split('&')[0];
        }
        if (fileId) {
            return `https://lh3.googleusercontent.com/d/${fileId}`;
        }
    }
    return url;
}

// 全域資料儲存
let globalPartsData = [];
let globalModelsData = [];
let activeFormType = null; // 用於標記當前送出的表單類型 ('iqc' 或 'defective')
let activeQuerySectionId = 'iqcQueryDateSection'; // 預設的查詢區塊 ID
let lastEditedRowIndex = null; // 儲存最後編輯/送出的 rowIndex

// 輔助導航函數
function navigateToSection(targetId) {
    const link = document.querySelector(`[data-target="${targetId}"]`);
    if (link) {
        link.click();
    } else {
        const contentSections = document.querySelectorAll('.content-section');
        contentSections.forEach(sec => {
            sec.classList.add('hidden');
            sec.classList.remove('active');
        });
        const activeSection = document.getElementById(targetId);
        if (activeSection) {
            activeSection.classList.remove('hidden');
            activeSection.classList.add('active');
        }
        if (targetId === 'dashboardSection') {
            const navSubItems = document.querySelectorAll('.nav-sub-item');
            const navSubSubItems = document.querySelectorAll('.nav-sub-sub-item');
            navSubItems.forEach(x => x.classList.remove('active'));
            navSubSubItems.forEach(x => x.classList.remove('active'));
            const mobileTitle = document.getElementById('mobileTitle');
            if (mobileTitle) mobileTitle.textContent = "品質檢驗系統 - 首頁儀表板";
            document.title = "品質檢驗系統";
        }
    }
}

// 為已恢復的訂購單照片預覽綁定刪除事件
function bindPoPhotoDeleteListener() {
    const preview = document.getElementById('poPhotoPreview');
    const input = document.getElementById('poPhoto');
    const hiddenInput = document.getElementById('hiddenPoPhotoBase64');
    const existingInput = document.getElementById('existingPoPhotoUrl');
    
    if (preview && input) {
        const previewItem = preview.querySelector('.preview-item');
        if (previewItem) {
            // 重新加上 pointer cursor 供點擊放大
            const img = previewItem.querySelector('img');
            if (img) {
                img.style.cursor = 'pointer';
                img.addEventListener('click', () => {
                    openLightbox(img.src, '訂購單照片');
                });
            }
            const deleteBtn = previewItem.querySelector('.preview-delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (event) => {
                    event.preventDefault();
                    previewItem.remove(); // 移除預覽
                    input.value = ''; // 清空 file input
                    if (hiddenInput) hiddenInput.value = '';
                    if (existingInput) existingInput.value = '';
                });
            }
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    alert("【系統通知】成功載入最新版 V10 子母選單系統！");
    
    // 初始化日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('iqcUploadDate').value = today;
    document.getElementById('defectiveUploadDate').value = today;

    // 載入基礎資料 (人員、品項、不良原因、生產製令機型)
    loadBaseData(true);

    // ==================== 首頁儀表板與 Logo 點擊事件 ====================
    const sidebarHeader = document.getElementById('sidebarHeader');
    if (sidebarHeader) {
        sidebarHeader.addEventListener('click', () => {
            navigateToSection('dashboardSection');
        });
    }

    const tileCards = document.querySelectorAll('.tile-card');
    tileCards.forEach(card => {
        card.addEventListener('click', () => {
            const targetId = card.getAttribute('data-target');
            if (targetId) {
                navigateToSection(targetId);
            }
        });
    });

    // ==================== 不良原因複選下拉視窗事件 ====================
    setupMultiSelectDefectReason();

    // ==================== 左側子母選單與 RWD 邏輯 ====================
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const menuToggleBtn = document.getElementById('menuToggleBtn');
    const mobileTitle = document.getElementById('mobileTitle');

    // 大目錄點擊展開/收合
    const navGroupHeaders = document.querySelectorAll('.nav-group-header');
    navGroupHeaders.forEach(header => {
        header.addEventListener('click', () => {
            const group = header.parentElement;
            group.classList.toggle('open');
        });
    });

    // 子目錄點擊切換頁面
    const navSubItems = document.querySelectorAll('.nav-sub-item');
    const navSubSubItems = document.querySelectorAll('.nav-sub-sub-item');
    const contentSections = document.querySelectorAll('.content-section');

    // 處理三級子群組的展開/收合 (資訊查詢)
    const navSubGroupHeaders = document.querySelectorAll('.nav-sub-group-header');
    navSubGroupHeaders.forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            const group = header.parentElement;
            group.classList.toggle('open');
        });
    });

    // 二級選單項目點擊
    navSubItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. 切換 active 樣式 (並清除三級選單的 active)
            navSubItems.forEach(x => x.classList.remove('active'));
            navSubSubItems.forEach(x => x.classList.remove('active'));
            item.classList.add('active');

            // 2. 切換右側顯示的區塊 (若無 data-target 代表只用於展開，不做網頁切換)
            const targetId = item.getAttribute('data-target');
            if (!targetId) return;

            if (targetId.includes('Query')) {
                activeQuerySectionId = targetId;
            }

            contentSections.forEach(sec => {
                sec.classList.add('hidden');
                sec.classList.remove('active');
            });
            const activeSection = document.getElementById(targetId);
            activeSection.classList.remove('hidden');
            activeSection.classList.add('active');

            // 3. 更新標題文字
            const groupText = item.closest('.nav-item-group').querySelector('.nav-group-header .text').textContent;
            const subText = item.textContent;
            const newTitle = `${groupText} - ${subText}`;
            mobileTitle.textContent = newTitle;
            document.title = `${newTitle} | 品質檢驗系統`;

            // 4. 行動版下，切換完自動關閉側邊欄
            sidebar.classList.remove('open');
            menuToggleBtn.classList.remove('open');
            sidebarOverlay.classList.remove('show');
        });
    });

    // 三級選單項目點擊
    navSubSubItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();

            // 1. 切換 active 樣式 (並清除二級選單的 active)
            navSubItems.forEach(x => x.classList.remove('active'));
            navSubSubItems.forEach(x => x.classList.remove('active'));
            item.classList.add('active');

            // 2. 切換右側顯示的區塊
            const targetId = item.getAttribute('data-target');
            if (targetId && targetId.includes('Query')) {
                activeQuerySectionId = targetId;
            }
            contentSections.forEach(sec => {
                sec.classList.add('hidden');
                sec.classList.remove('active');
            });
            const activeSection = document.getElementById(targetId);
            activeSection.classList.remove('hidden');
            activeSection.classList.add('active');

            // 3. 更新標題文字 (格式: 大目錄 - 中目錄(小項目))
            const groupText = item.closest('.nav-item-group').querySelector('.nav-group-header .text').textContent;
            const parentGroupText = item.closest('.nav-sub-group').querySelector('.nav-sub-group-header .text').textContent;
            const subText = item.textContent;
            const newTitle = `${groupText} - ${parentGroupText}(${subText})`;
            mobileTitle.textContent = newTitle;
            document.title = `${newTitle} | 品質檢驗系統`;

            // 4. 行動版下，切換完自動關閉側邊欄
            sidebar.classList.remove('open');
            menuToggleBtn.classList.remove('open');
            sidebarOverlay.classList.remove('show');

            // 5. 預設填入今日日期
            if (targetId === 'iqcQueryDateSection') {
                document.getElementById('iqcQueryDate').value = new Date().toISOString().split('T')[0];
            }
        });
    });

    // 手機版漢堡按鈕點擊開關
    menuToggleBtn.addEventListener('click', () => {
        menuToggleBtn.classList.toggle('open');
        sidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('show');
    });

    // 點擊遮罩關閉選單
    sidebarOverlay.addEventListener('click', () => {
        menuToggleBtn.classList.remove('open');
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('show');
    });

    // ==================== 欄位連動與自動填值 ====================

    // A. 進料檢驗 - 品號連動 (帶出品名、檢驗過程與廠商)
    const iqcPartNumberInput = document.getElementById('iqcPartNumber');
    const iqcPartNameInput = document.getElementById('iqcPartName');
    const iqcPartSpecInput = document.getElementById('iqcPartSpec');
    const vendorSelect = document.getElementById('vendor');

    iqcPartNumberInput.addEventListener('input', function() {
        const inputPn = this.value.trim().toUpperCase();
        const matchedParts = globalPartsData.filter(p => p.partNumber.toUpperCase() === inputPn);
        
        vendorSelect.innerHTML = '';
        
        if (matchedParts.length > 0) {
            iqcPartNameInput.value = matchedParts[0].partName;
            iqcPartSpecInput.value = matchedParts[0].partSpec || '';
            vendorSelect.innerHTML = '<option value="" disabled selected>請選擇廠商</option>';
            matchedParts.forEach(p => {
                const option = document.createElement('option');
                option.value = p.vendor;
                option.textContent = p.vendor;
                vendorSelect.appendChild(option);
            });
            if (matchedParts.length === 1) {
                vendorSelect.value = matchedParts[0].vendor;
            }
        } else {
            iqcPartNameInput.value = '';
            iqcPartSpecInput.value = '';
            vendorSelect.innerHTML = '<option value="" disabled selected>請先輸入品號</option>';
        }
    });

    // B. 來料不良 - 品號連動 (帶出品名)
    const defPartNumberInput = document.getElementById('defectivePartNumber');
    const defPartNameInput = document.getElementById('defectivePartName');

    defPartNumberInput.addEventListener('input', function() {
        const inputPn = this.value.trim().toUpperCase();
        const matchedParts = globalPartsData.filter(p => p.partNumber.toUpperCase() === inputPn);
        
        if (matchedParts.length > 0) {
            defPartNameInput.value = matchedParts[0].partName;
        } else {
            defPartNameInput.value = '';
        }
    });

    // C. 來料不良 - 生產製令連動 (帶出機型與生產數量)
    const poInput = document.getElementById('productionOrder');
    const modelInput = document.getElementById('model');
    const productionQtyInput = document.getElementById('productionQty');

    if (poInput && modelInput && productionQtyInput) {
        poInput.addEventListener('input', function() {
            const inputPo = this.value.trim().toUpperCase();
            const matchedModel = globalModelsData.find(m => m.productionOrder.toUpperCase() === inputPo);
            
            if (matchedModel) {
                modelInput.value = matchedModel.model;
                productionQtyInput.value = matchedModel.productionQty || 0;
            } else {
                modelInput.value = '';
                productionQtyInput.value = '';
            }
        });
    }

    // D. 抽驗數據輸入框點擊清除預設的 "OK"
    const sampleIds = ['sampleA', 'sampleB', 'sampleC', 'sampleD', 'sampleE', 'sampleF'];
    sampleIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('focus', function() {
                if (this.value === 'OK') this.value = '';
            });
            input.addEventListener('blur', function() {
                if (this.value.trim() === '') this.value = 'OK';
            });
        }
    });

    // E. 退庫數量輸入框點擊清除預設的 "0"
    const returnIds = ['return019', 'return020'];
    returnIds.forEach(id => {
        const input = document.getElementById(id);
        if (input) {
            input.addEventListener('focus', function() {
                if (this.value === '0') this.value = '';
            });
            input.addEventListener('blur', function() {
                if (this.value.trim() === '') this.value = '0';
            });
        }
    });

    // ==================== 照片預覽設定 ====================
    setupImagePreview('poPhoto', 'poPhotoPreview', 'hiddenPoPhotoBase64');
    setupImagePreview('physicalPhoto', 'physicalPhotoPreview', 'hiddenPhysicalPhotoBase64');
    setupImagePreview('defectPhoto', 'defectPhotoPreview', 'hiddenDefectPhotoBase64');

    // ==================== 返回查詢按鈕監聽 ====================
    const iqcCancelBtn = document.getElementById('iqcCancelBtn');
    if (iqcCancelBtn) {
        iqcCancelBtn.addEventListener('click', () => {
            iqcForm.reset();
            document.getElementById('iqcRowIndex').value = '';
            document.getElementById('existingPoPhotoUrl').value = '';
            document.getElementById('existingPhysicalPhotoUrl').value = '';
            document.getElementById('hiddenPoPhotoBase64').value = '';
            document.getElementById('hiddenPhysicalPhotoBase64').value = '';
            document.getElementById('poPhotoPreview').innerHTML = '';
            document.getElementById('physicalPhotoPreview').innerHTML = '';
            
            const btn = document.getElementById('iqcSubmitBtn');
            btn.querySelector('.btn-text').textContent = '送出檢驗紀錄';
            iqcCancelBtn.classList.add('hidden');
            
            navigateToSection(activeQuerySectionId);
        });
    }

    const defectiveCancelBtn = document.getElementById('defectiveCancelBtn');
    if (defectiveCancelBtn) {
        defectiveCancelBtn.addEventListener('click', () => {
            defectiveForm.reset();
            resetDefectReasonSelection();
            document.getElementById('defectiveRowIndex').value = '';
            document.getElementById('existingDefectPhotoUrl').value = '';
            document.getElementById('hiddenDefectPhotoBase64').value = '';
            document.getElementById('defectPhotoPreview').innerHTML = '';
            
            const btn = document.getElementById('defectiveSubmitBtn');
            btn.querySelector('.btn-text').textContent = '送出不良紀錄';
            defectiveCancelBtn.classList.add('hidden');
            
            navigateToSection(activeQuerySectionId);
        });
    }

    // ==================== 表單非同步上傳與 Iframe 監聽 ====================
    const iqcForm = document.getElementById('iqcForm');
    const defectiveForm = document.getElementById('defectiveForm');
    const hiddenIframe = document.getElementById('hidden_iframe');

    // 監聽 iframe 載入事件 (後端回傳成功時會重新整理此 iframe)
    hiddenIframe.onload = function () {
        if (activeFormType === 'iqc') {
            showToast('進料檢驗紀錄上傳成功！');
            const currentPo = document.getElementById('poNumber').value;
            const currentPersonnel = document.getElementById('iqcPersonnel').value;
            
            // 暫存訂購單照片相關欄位，以在上傳後能保留
            const savedPoPhotoPreview = document.getElementById('poPhotoPreview').innerHTML;
            const savedPoPhotoBase64 = document.getElementById('hiddenPoPhotoBase64').value;
            const savedExistingPoPhotoUrl = document.getElementById('existingPoPhotoUrl').value;
            
            iqcForm.reset();
            
            // 恢復訂購單號、人員、日期、照片預覽與暫存欄位
            if (currentPersonnel) document.getElementById('iqcPersonnel').value = currentPersonnel;
            document.getElementById('poNumber').value = currentPo;
            document.getElementById('iqcUploadDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('poPhotoPreview').innerHTML = savedPoPhotoPreview;
            document.getElementById('hiddenPoPhotoBase64').value = savedPoPhotoBase64;
            document.getElementById('existingPoPhotoUrl').value = savedExistingPoPhotoUrl;
            
            document.getElementById('physicalPhotoPreview').innerHTML = '';
            document.getElementById('existingPhysicalPhotoUrl').value = '';
            document.getElementById('iqcRowIndex').value = ''; // 編輯完成或重置後清空編輯行

            bindPoPhotoDeleteListener(); // 重新綁定刪除與縮圖點擊放大事件

            const btn = document.getElementById('iqcSubmitBtn');
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = '送出檢驗紀錄';
            btn.querySelector('.spinner').classList.add('hidden');
            
            const cancelBtn = document.getElementById('iqcCancelBtn');
            if (cancelBtn) cancelBtn.classList.add('hidden');
            
            activeFormType = null;

            // 如果是編輯模式提交，則跳回原查詢頁面並自動重新查詢
            if (lastEditedRowIndex !== null) {
                navigateToSection(activeQuerySectionId);
                setTimeout(() => {
                    const activeSection = document.getElementById(activeQuerySectionId);
                    if (activeSection) {
                        const queryBtn = activeSection.querySelector('.btn-primary');
                        if (queryBtn) queryBtn.click();
                    }
                }, 100);
            }
            
        } else if (activeFormType === 'defective') {
            showToast('不良品檢驗紀錄上傳成功！');
            const currentPersonnel = document.getElementById('defectivePersonnel').value;
            defectiveForm.reset();
            resetDefectReasonSelection();
            
            // 恢復人員、日期與照片預覽
            if (currentPersonnel) document.getElementById('defectivePersonnel').value = currentPersonnel;
            document.getElementById('defectiveUploadDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('defectPhotoPreview').innerHTML = '';
            document.getElementById('existingDefectPhotoUrl').value = '';
            document.getElementById('defectiveRowIndex').value = ''; // 編輯完成或重置後清空編輯行

            const btn = document.getElementById('defectiveSubmitBtn');
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = '送出不良紀錄';
            btn.querySelector('.spinner').classList.add('hidden');
            
            const cancelBtn = document.getElementById('defectiveCancelBtn');
            if (cancelBtn) cancelBtn.classList.add('hidden');
            
            activeFormType = null;

            // 如果是編輯模式提交，則跳回原查詢頁面並自動重新查詢
            if (lastEditedRowIndex !== null) {
                navigateToSection(activeQuerySectionId);
                setTimeout(() => {
                    const activeSection = document.getElementById(activeQuerySectionId);
                    if (activeSection) {
                        const queryBtn = activeSection.querySelector('.btn-primary');
                        if (queryBtn) queryBtn.click();
                    }
                }, 100);
            }
        }
    };

    // 提交進料檢驗表單
    iqcForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('iqcSubmitBtn');
        const btnText = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');
        const isEdit = !!document.getElementById('iqcRowIndex').value;

        if (isEdit) {
            lastEditedRowIndex = document.getElementById('iqcRowIndex').value;
        } else {
            lastEditedRowIndex = null;
        }

        btn.disabled = true;
        btnText.textContent = '圖片壓縮中...';
        spinner.classList.remove('hidden');

        try {
            const poPhotoFile = document.getElementById('poPhoto').files[0];
            const physicalPhotoFile = document.getElementById('physicalPhoto').files[0];

            if (poPhotoFile) {
                const compressed = await compressImage(poPhotoFile);
                document.getElementById('hiddenPoPhotoBase64').value = compressed.data;
                document.getElementById('existingPoPhotoUrl').value = ''; // 新上傳則清空舊 URL
            } else {
                // 如果預覽區被清空了，則代表使用者刪除了舊照片
                if (!document.getElementById('poPhotoPreview').innerHTML.trim()) {
                    document.getElementById('hiddenPoPhotoBase64').value = '';
                    document.getElementById('existingPoPhotoUrl').value = '';
                }
            }

            if (physicalPhotoFile) {
                const compressed = await compressImage(physicalPhotoFile);
                document.getElementById('hiddenPhysicalPhotoBase64').value = compressed.data;
                document.getElementById('existingPhysicalPhotoUrl').value = ''; // 新上傳則清空舊 URL
            } else {
                // 如果預覽區被清空了，則代表使用者刪除了舊照片
                if (!document.getElementById('physicalPhotoPreview').innerHTML.trim()) {
                    document.getElementById('hiddenPhysicalPhotoBase64').value = '';
                    document.getElementById('existingPhysicalPhotoUrl').value = '';
                }
            }

            // 禁用實體檔案 input 防止傳送過大資料
            document.getElementById('poPhoto').disabled = true;
            document.getElementById('physicalPhoto').disabled = true;

            activeFormType = 'iqc';
            btnText.textContent = '上傳至 Google 試算表...';
            iqcForm.submit();

            // 恢復 file inputs
            document.getElementById('poPhoto').disabled = false;
            document.getElementById('physicalPhoto').disabled = false;

        } catch (error) {
            showToast('圖片處理錯誤: ' + error.message, 'error');
            btn.disabled = false;
            btnText.textContent = isEdit ? '更新檢驗紀錄' : '送出檢驗紀錄';
            spinner.classList.add('hidden');
            activeFormType = null;
        }
    });

    // 提交來料不良表單
    defectiveForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('defectiveSubmitBtn');
        const btnText = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');
        const isEdit = !!document.getElementById('defectiveRowIndex').value;

        if (isEdit) {
            lastEditedRowIndex = document.getElementById('defectiveRowIndex').value;
        } else {
            lastEditedRowIndex = null;
        }

        btn.disabled = true;
        btnText.textContent = '圖片壓縮中...';
        spinner.classList.remove('hidden');

        try {
            const defectPhotoFile = document.getElementById('defectPhoto').files[0];

            if (defectPhotoFile) {
                const compressed = await compressImage(defectPhotoFile);
                document.getElementById('hiddenDefectPhotoBase64').value = compressed.data;
                document.getElementById('existingDefectPhotoUrl').value = ''; // 新上傳則清空舊 URL
            } else {
                // 如果預覽區被清空了，則代表使用者刪除了舊照片
                if (!document.getElementById('defectPhotoPreview').innerHTML.trim()) {
                    document.getElementById('hiddenDefectPhotoBase64').value = '';
                    document.getElementById('existingDefectPhotoUrl').value = '';
                }
            }

            // 禁用實體檔案 input 防止傳送過大資料
            document.getElementById('defectPhoto').disabled = true;

            activeFormType = 'defective';
            btnText.textContent = '上傳至 Google 試算表...';
            defectiveForm.submit();

            // 恢復 file inputs
            document.getElementById('defectPhoto').disabled = false;

        } catch (error) {
            showToast('圖片處理錯誤: ' + error.message, 'error');
            btn.disabled = false;
            btnText.textContent = isEdit ? '更新不良紀錄' : '送出不良紀錄';
            spinner.classList.add('hidden');
            activeFormType = null;
        }
    });

    // ==================== 查詢邏輯 ====================

    // ==================== 進料查詢共用渲染與多維度查詢事件 ====================

    // 共用渲染進料查詢卡片函數
    function renderIqcQueryResult(records, container) {
        if (!records || records.length === 0) {
            container.innerHTML = '<div class="empty-state">無符合條件的登錄資料</div>';
            return;
        }

        container.innerHTML = '';
        let highlightedCard = null;
        records.forEach(record => {
            const card = document.createElement('div');
            card.className = 'query-card';
            
            if (lastEditedRowIndex !== null && record.rowIndex == lastEditedRowIndex) {
                card.classList.add('highlight-card');
                highlightedCard = card;
            }

            // 判定結果對應的 CSS 樣式
            let resultClass = '';
            if (record.result === 'OK') resultClass = 'result-ok';
            else if (record.result === 'NG') resultClass = 'result-ng';
            else if (record.result === '特採') resultClass = 'result-special';

            // 處理照片縮圖 HTML
            let photosHtml = '';
            if (record.poPhotoUrl || record.physicalPhotoUrl) {
                let poThumb = '';
                let physicalThumb = '';
                if (record.poPhotoUrl && record.poPhotoUrl !== 'Upload Failed' && record.poPhotoUrl.trim() !== '') {
                    poThumb = `
                        <div class="query-photo-thumbnail" data-src="${record.poPhotoUrl}" data-caption="單號: ${record.poNumber || '-'} - 訂購單照片">
                            <img src="${getDirectImageUrl(record.poPhotoUrl)}" alt="訂購單照片">
                            <span>訂購單照片</span>
                        </div>`;
                }
                if (record.physicalPhotoUrl && record.physicalPhotoUrl !== 'Upload Failed' && record.physicalPhotoUrl.trim() !== '') {
                    physicalThumb = `
                        <div class="query-photo-thumbnail" data-src="${record.physicalPhotoUrl}" data-caption="品號: ${record.partNumber || '-'} - 實體照片">
                            <img src="${getDirectImageUrl(record.physicalPhotoUrl)}" alt="實體照片">
                            <span>實體照片</span>
                        </div>`;
                }
                if (poThumb || physicalThumb) {
                    photosHtml = `<div class="query-photos">${poThumb}${physicalThumb}</div>`;
                }
            }

            card.innerHTML = `
                <div class="query-card-header">
                    <span class="query-po">單號: ${record.poNumber || '-'}</span>
                    <span class="query-vendor">${record.vendor || '-'}</span>
                </div>
                <div class="query-detail">
                    <span class="label">日期</span>
                    <span class="value">${record.uploadDate || '-'}</span>
                </div>
                <div class="query-detail">
                    <span class="label">品號</span>
                    <span class="value">${record.partNumber || '-'}</span>
                </div>
                <div class="query-detail">
                    <span class="label">品名</span>
                    <span class="value">${record.partName || '-'}</span>
                </div>
                <div class="query-detail">
                    <span class="label">進貨量</span>
                    <span class="value">${record.receiptQty || '-'}</span>
                </div>
                <div class="query-detail">
                    <span class="label">檢驗狀況</span>
                    <span class="value">
                        外觀: <span class="${record.appearance === 'NG' ? 'text-danger' : 'text-success'}" style="font-weight:600;">${record.appearance || '-'}</span> | 
                        尺寸: <span class="${record.dimensions === 'NG' ? 'text-danger' : 'text-success'}" style="font-weight:600;">${record.dimensions || '-'}</span> | 
                        特性: <span class="${record.characteristics === 'NG' ? 'text-danger' : 'text-success'}" style="font-weight:600;">${record.characteristics || '-'}</span>
                    </span>
                </div>
                ${photosHtml}
                <div class="query-detail" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <span class="label">最終判定</span>
                        <span class="value badge ${resultClass}">${record.result || '-'}</span>
                    </div>
                    <button type="button" class="btn-edit">
                        ✏️ 編輯
                    </button>
                </div>
            `;

            // 綁定編輯按鈕點擊事件
            const editBtn = card.querySelector('.btn-edit');
            if (editBtn) {
                editBtn.addEventListener('click', () => {
                    editIqcRecord(record);
                });
            }

            // 綁定縮圖點擊燈箱事件
            const thumbnails = card.querySelectorAll('.query-photo-thumbnail');
            thumbnails.forEach(thumb => {
                thumb.addEventListener('click', (e) => {
                    e.stopPropagation();
                    openLightbox(thumb.dataset.src, thumb.dataset.caption);
                });
            });

            container.appendChild(card);
        });

        if (highlightedCard) {
            setTimeout(() => {
                highlightedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                lastEditedRowIndex = null; // 清除暫存
            }, 150);
        }
    }

    // 1. 依日期查詢
    const iqcQueryDateBtn = document.getElementById('iqcQueryDateBtn');
    if (iqcQueryDateBtn) {
        iqcQueryDateBtn.addEventListener('click', () => {
            const dateVal = document.getElementById('iqcQueryDate').value;
            if (!dateVal) {
                showToast('請選擇查詢日期', 'error');
                return;
            }

            const btnText = iqcQueryDateBtn.querySelector('.btn-text');
            const spinner = iqcQueryDateBtn.querySelector('.spinner');
            const resultsContainer = document.getElementById('iqcQueryDateResults');

            iqcQueryDateBtn.disabled = true;
            btnText.textContent = '查詢中...';
            spinner.classList.remove('hidden');
            resultsContainer.innerHTML = '<div class="empty-state">資料載入中...</div>';

            fetch(`${SCRIPT_URL}?action=query&queryDate=${dateVal}`)
                .then(res => res.json())
                .then(data => {
                    iqcQueryDateBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');

                    renderIqcQueryResult(data.records, resultsContainer);
                    if (data.records && data.records.length > 0) {
                        showToast(`查詢完成，共 ${data.records.length} 筆資料`);
                    }
                })
                .catch(err => {
                    console.error('依日期查詢失敗:', err);
                    iqcQueryDateBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');
                    resultsContainer.innerHTML = '<div class="empty-state">查詢失敗，請檢查網路或稍後再試</div>';
                    showToast('查詢失敗', 'error');
                });
        });
    }

    // 2. 依訂購單編號查詢
    const iqcQueryPoBtn = document.getElementById('iqcQueryPoBtn');
    if (iqcQueryPoBtn) {
        iqcQueryPoBtn.addEventListener('click', () => {
            const poVal = document.getElementById('iqcQueryPoVal').value.trim();
            if (!poVal) {
                showToast('請輸入訂購單編號', 'error');
                return;
            }

            const btnText = iqcQueryPoBtn.querySelector('.btn-text');
            const spinner = iqcQueryPoBtn.querySelector('.spinner');
            const resultsContainer = document.getElementById('iqcQueryPoResults');

            iqcQueryPoBtn.disabled = true;
            btnText.textContent = '查詢中...';
            spinner.classList.remove('hidden');
            resultsContainer.innerHTML = '<div class="empty-state">資料載入中...</div>';

            fetch(`${SCRIPT_URL}?action=query&queryPo=${encodeURIComponent(poVal)}`)
                .then(res => res.json())
                .then(data => {
                    iqcQueryPoBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');

                    renderIqcQueryResult(data.records, resultsContainer);
                    if (data.records && data.records.length > 0) {
                        showToast(`查詢完成，共 ${data.records.length} 筆資料`);
                    }
                })
                .catch(err => {
                    console.error('依單號查詢失敗:', err);
                    iqcQueryPoBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');
                    resultsContainer.innerHTML = '<div class="empty-state">查詢失敗，請檢查網路或稍後再試</div>';
                    showToast('查詢失敗', 'error');
                });
        });
    }

    // 3. 依品號查詢
    const iqcQueryPartBtn = document.getElementById('iqcQueryPartBtn');
    if (iqcQueryPartBtn) {
        iqcQueryPartBtn.addEventListener('click', () => {
            const partVal = document.getElementById('iqcQueryPartVal').value.trim();
            if (!partVal) {
                showToast('請輸入品號', 'error');
                return;
            }

            const btnText = iqcQueryPartBtn.querySelector('.btn-text');
            const spinner = iqcQueryPartBtn.querySelector('.spinner');
            const resultsContainer = document.getElementById('iqcQueryPartResults');

            iqcQueryPartBtn.disabled = true;
            btnText.textContent = '查詢中...';
            spinner.classList.remove('hidden');
            resultsContainer.innerHTML = '<div class="empty-state">資料載入中...</div>';

            fetch(`${SCRIPT_URL}?action=query&queryPart=${encodeURIComponent(partVal)}`)
                .then(res => res.json())
                .then(data => {
                    iqcQueryPartBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');

                    renderIqcQueryResult(data.records, resultsContainer);
                    if (data.records && data.records.length > 0) {
                        showToast(`查詢完成，共 ${data.records.length} 筆資料`);
                    }
                })
                .catch(err => {
                    console.error('依品號查詢失敗:', err);
                    iqcQueryPartBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');
                    resultsContainer.innerHTML = '<div class="empty-state">查詢失敗，請檢查網路或稍後再試</div>';
                    showToast('查詢失敗', 'error');
                });
        });
    }

    // ==================== 系統 - 生產製令 Model 同步 ====================
    const syncModelBtn = document.getElementById('syncModelBtn');
    if (syncModelBtn) {
        syncModelBtn.addEventListener('click', () => {
            const btnText = syncModelBtn.querySelector('.btn-text');
            const spinner = document.getElementById('syncModelSpinner');
            
            syncModelBtn.disabled = true;
            btnText.textContent = '同步中，請稍候...';
            spinner.classList.remove('hidden');
            
            fetch(`${SCRIPT_URL}?action=syncModel`)
                .then(res => res.json())
                .then(data => {
                    syncModelBtn.disabled = false;
                    btnText.textContent = '開始同步 Model 資料';
                    spinner.classList.add('hidden');
                    
                    if (data.success) {
                        showToast(`Model 資料同步成功！共更新 ${data.count} 筆資料`, 'success');
                        // 同步成功後在背景重新整理基礎資料
                        loadBaseData(true);
                    } else {
                        showToast(`同步失敗: ${data.error}`, 'error');
                    }
                })
                .catch(err => {
                    console.error('同步 Model 失敗:', err);
                    syncModelBtn.disabled = false;
                    btnText.textContent = '開始同步 Model 資料';
                    spinner.classList.add('hidden');
                    showToast('同步失敗，請檢查網路或稍後再試', 'error');
                });
        });
    }

    // 來料不良查詢
    const defQueryBtn = document.getElementById('defectiveQueryBtn');
    if (defQueryBtn) {
        defQueryBtn.addEventListener('click', () => {
            const dateVal = document.getElementById('defectiveQueryDate').value;
            if (!dateVal) {
                showToast('請選擇查詢日期', 'error');
                return;
            }

            const btnText = defQueryBtn.querySelector('.btn-text');
            const spinner = defQueryBtn.querySelector('.spinner');
            const resultsContainer = document.getElementById('defectiveQueryResults');

            defQueryBtn.disabled = true;
            btnText.textContent = '查詢中...';
            spinner.classList.remove('hidden');
            resultsContainer.innerHTML = '<div class="empty-state">資料載入中...</div>';

            fetch(`${SCRIPT_URL}?action=queryDefective&queryDate=${dateVal}`)
                .then(res => res.json())
                .then(data => {
                    defQueryBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');

                    if (data.records && data.records.length > 0) {
                        resultsContainer.innerHTML = '';
                        let highlightedCard = null;
                        data.records.forEach(record => {
                            const card = document.createElement('div');
                            card.className = 'query-card';
                            
                            if (lastEditedRowIndex !== null && record.rowIndex == lastEditedRowIndex) {
                                card.classList.add('highlight-card');
                                highlightedCard = card;
                            }
                            
                            let photosHtml = '';
                            if (record.defectPhotoUrl && record.defectPhotoUrl !== 'Upload Failed' && record.defectPhotoUrl.trim() !== '') {
                                photosHtml = `
                                    <div class="query-photos">
                                        <div class="query-photo-thumbnail" data-src="${record.defectPhotoUrl}" data-caption="製令: ${record.productionOrder || '-'} - 不良照片">
                                            <img src="${getDirectImageUrl(record.defectPhotoUrl)}" alt="不良照片">
                                            <span>不良照片</span>
                                        </div>
                                    </div>`;
                            }

                            card.innerHTML = `
                                <div class="query-card-header">
                                    <span class="query-po">製令: ${record.productionOrder || '-'}</span>
                                    <span class="query-vendor">機型: ${record.model || '-'}</span>
                                </div>
                                <div class="query-detail">
                                    <span class="label">品號</span>
                                    <span class="value">${record.partNumber || '-'}</span>
                                </div>
                                <div class="query-detail">
                                    <span class="label">品名</span>
                                    <span class="value">${record.partName || '-'}</span>
                                </div>
                                <div class="query-detail">
                                    <span class="label">不良數量</span>
                                    <span class="value">${record.defectQty || '-'}</span>
                                </div>
                                <div class="query-detail">
                                    <span class="label">不良原因</span>
                                    <span class="value" style="color: #ef4444; font-weight: 500;">${record.defectReason || '-'}</span>
                                </div>
                                ${photosHtml}
                                <div class="query-detail" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.08); display: flex; justify-content: space-between; align-items: center;">
                                    <div>
                                        <span class="label">退 019倉</span>
                                        <span class="value" style="font-weight: 500; color: var(--text-main);">${record.return019 || '0'}</span>
                                        <span class="label" style="margin-left: 8px;">020倉</span>
                                        <span class="value" style="font-weight: 500; color: var(--text-main);">${record.return020 || '0'}</span>
                                    </div>
                                    <button type="button" class="btn-edit">
                                        ✏️ 編輯
                                    </button>
                                </div>
                            `;

                            // 綁定編輯按鈕點擊事件
                            const editBtn = card.querySelector('.btn-edit');
                            if (editBtn) {
                                editBtn.addEventListener('click', () => {
                                    editDefectiveRecord(record);
                                });
                            }

                            // 綁定縮圖點擊燈箱事件
                            const thumbnails = card.querySelectorAll('.query-photo-thumbnail');
                            thumbnails.forEach(thumb => {
                                thumb.addEventListener('click', (e) => {
                                    e.stopPropagation();
                                    openLightbox(thumb.dataset.src, thumb.dataset.caption);
                                });
                            });

                            resultsContainer.appendChild(card);
                        });
                        if (highlightedCard) {
                            setTimeout(() => {
                                highlightedCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                lastEditedRowIndex = null; // 清除暫存
                            }, 150);
                        }
                        showToast(`查詢完成，共 ${data.records.length} 筆資料`);
                    } else {
                        resultsContainer.innerHTML = '<div class="empty-state">該日期無登錄資料</div>';
                    }
                })
                .catch(err => {
                    console.error('查詢失敗:', err);
                    defQueryBtn.disabled = false;
                    btnText.textContent = '開始查詢';
                    spinner.classList.add('hidden');
                    resultsContainer.innerHTML = '<div class="empty-state">查詢失敗，請檢查網路或稍後再試</div>';
                    showToast('查詢失敗', 'error');
                });
        });
    }

    // ==================== 圖片燈箱關閉邏輯 ====================
    const lightboxModal = document.getElementById('imagePreviewModal');
    const modalCloseBtn = document.getElementById('modalCloseBtn');
    if (lightboxModal && modalCloseBtn) {
        modalCloseBtn.addEventListener('click', () => {
            lightboxModal.classList.add('hidden');
            resetZoom();
        });
        lightboxModal.addEventListener('click', (e) => {
            if (e.target === lightboxModal) {
                lightboxModal.classList.add('hidden');
                resetZoom();
            }
        });
    }

    // ==================== 註冊 Service Worker ====================
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('sw.js')
            .then(reg => console.log('Service Worker 註冊成功', reg))
            .catch(err => console.log('Service Worker 註冊失敗', err));
    }
});

// 設置照片預覽與刪除邏輯
function setupImagePreview(inputId, previewId, hiddenInputId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const hiddenInput = document.getElementById(hiddenInputId);

    if (input && preview) {
        input.addEventListener('change', function () {
            preview.innerHTML = '';
            const files = this.files;

            if (files && files.length > 0) {
                Array.from(files).forEach(file => {
                    if (file.type.startsWith('image/')) {
                        const reader = new FileReader();
                        reader.onload = function (e) {
                            // 建立預覽容器
                            const previewItem = document.createElement('div');
                            previewItem.className = 'preview-item';

                            // 建立圖片
                            const img = document.createElement('img');
                            img.src = e.target.result;
                            img.style.cursor = 'pointer';
                            img.addEventListener('click', () => {
                                openLightbox(img.src, '上傳照片預覽');
                            });
                            previewItem.appendChild(img);

                            // 建立刪除按鈕
                            const deleteBtn = document.createElement('button');
                            deleteBtn.type = 'button';
                            deleteBtn.className = 'preview-delete-btn';
                            deleteBtn.innerHTML = '×';
                            deleteBtn.addEventListener('click', (event) => {
                                event.preventDefault();
                                previewItem.remove(); // 移除預覽
                                input.value = ''; // 清空 file input
                                if (hiddenInput) {
                                    hiddenInput.value = ''; // 清空隱藏的 base64 input
                                }
                            });
                            previewItem.appendChild(deleteBtn);

                            preview.appendChild(previewItem);
                        }
                        reader.readAsDataURL(file);
                    }
                });
            }
        });
    }
}

// 顯示訊息通知
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    if (toast) {
        toast.textContent = message;
        toast.className = `toast show ${type}`;

        setTimeout(() => {
            toast.className = 'toast hidden';
        }, 3000);
    }
}

// 載入與重新整理基礎資料 (從 Google 試算表動態同步 人員、品項、不良原因、生產製令機型)
function loadBaseData(isSilent = false) {
    if (!isSilent) {
        showToast('正在與 Google 試算表同步資料中...', 'info');
    }
    const fetchUrl = `${SCRIPT_URL}?t=${new Date().getTime()}`;
    return fetch(fetchUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP 狀態碼 ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            console.log("從 Google 試算表成功同步資料:", data);
            
            // 1. 動態同步「人員」選單 (從試算表「人員」分頁 A2:A 欄)
            if (data.personnel && Array.isArray(data.personnel) && data.personnel.length > 0) {
                renderPersonnelOptions(data.personnel);
            }
            
            // 2. 動態同步「PART」與「Model」試算表資料庫
            if (data.parts) globalPartsData = data.parts;
            if (data.models) globalModelsData = data.models;

            // 3. 動態同步「不良原因」選單 (從試算表「不良原因」分頁 A2:A 欄)
            if (data.defectReasons && Array.isArray(data.defectReasons) && data.defectReasons.length > 0) {
                renderDefectReasonOptions(data.defectReasons);
            } else {
                renderDefectReasonOptions(DEFAULT_DEFECT_REASONS);
            }

            if (!isSilent) {
                showToast('已成功從 Google 試算表同步最新資料！', 'success');
            }
        })
        .catch(error => {
            console.error('無法從 Google 試算表同步資料:', error);
            showToast('同步試算表失敗：' + error.message, 'error');
        });
}

// 圖片壓縮轉換 Base64
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

// ==================== 圖片燈箱與編輯功能輔助函數 ====================

// ==================== 圖片燈箱與編輯功能輔助函數 ====================

let isZoomed = false;
let startX = 0, startY = 0;
let translateX = 0, translateY = 0;
let scale = 1;

const modalImage = document.getElementById('modalImage');

if (modalImage) {
    // 設定圖片初始轉場效果與 cursor 樣式
    modalImage.style.transition = 'transform 0.2s ease, cursor 0.2s ease';
    modalImage.style.cursor = 'zoom-in';

    modalImage.addEventListener('click', (e) => {
        e.stopPropagation(); // 避免觸發 modal 點擊背景關閉事件
        if (!isZoomed) {
            isZoomed = true;
            scale = 2.5;
            modalImage.style.cursor = 'zoom-out';
            modalImage.style.transform = `scale(${scale}) translate(0px, 0px)`;
            translateX = 0;
            translateY = 0;
        } else {
            resetZoom();
        }
    });

    // 拖曳移動大圖 (滑鼠)
    let isDragging = false;

    modalImage.addEventListener('mousedown', (e) => {
        if (!isZoomed) return;
        isDragging = true;
        startX = e.clientX - translateX;
        startY = e.clientY - translateY;
        modalImage.style.transition = 'none'; // 拖曳時停用轉場
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        e.preventDefault();
        translateX = e.clientX - startX;
        translateY = e.clientY - startY;
        modalImage.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            modalImage.style.transition = 'transform 0.2s ease, cursor 0.2s ease';
        }
    });

    // 觸控拖曳移動大圖 (行動裝置)
    modalImage.addEventListener('touchstart', (e) => {
        if (!isZoomed) return;
        isDragging = true;
        const touch = e.touches[0];
        startX = touch.clientX - translateX;
        startY = touch.clientY - translateY;
        modalImage.style.transition = 'none';
    });

    modalImage.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        e.preventDefault(); // 阻止螢幕背景捲動
        const touch = e.touches[0];
        translateX = touch.clientX - startX;
        translateY = touch.clientY - startY;
        modalImage.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
    }, { passive: false });

    modalImage.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            modalImage.style.transition = 'transform 0.2s ease, cursor 0.2s ease';
        }
    });
}

function resetZoom() {
    isZoomed = false;
    scale = 1;
    translateX = 0;
    translateY = 0;
    if (modalImage) {
        modalImage.style.transition = 'transform 0.2s ease, cursor 0.2s ease';
        modalImage.style.transform = 'none';
        modalImage.style.cursor = 'zoom-in';
    }
}

// 開啟圖片燈箱
function openLightbox(src, caption) {
    const lightboxModal = document.getElementById('imagePreviewModal');
    const modalImage = document.getElementById('modalImage');
    const modalCaption = document.getElementById('modalCaption');
    if (lightboxModal && modalImage && modalCaption) {
        resetZoom(); // 開啟時重設
        modalImage.src = getDirectImageUrl(src);
        modalCaption.textContent = (caption || '') + ' (點擊圖片可放大/縮小，放大後可拖曳移動)';
        lightboxModal.classList.remove('hidden');
    }
}

// 渲染編輯模式下的已有照片預覽
function renderExistingPhotoPreview(containerId, photoUrl, hiddenInputId, labelText) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    
    if (photoUrl && photoUrl !== 'Upload Failed' && photoUrl.trim() !== '') {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';

        const img = document.createElement('img');
        img.src = getDirectImageUrl(photoUrl);
        img.style.cursor = 'pointer';
        img.addEventListener('click', () => {
            openLightbox(img.src, labelText || '預覽照片');
        });
        previewItem.appendChild(img);

        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'preview-delete-btn';
        deleteBtn.innerHTML = '×';
        deleteBtn.addEventListener('click', (event) => {
            event.preventDefault();
            previewItem.remove(); // 移除預覽
            document.getElementById(hiddenInputId).value = ''; // 清空 hidden 欄位
        });
        previewItem.appendChild(deleteBtn);
        container.appendChild(previewItem);
    }
}

// 編輯進料檢驗紀錄
function editIqcRecord(record) {
    // 1. 切換至登錄頁面
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('active');
    });
    const activeSection = document.getElementById('iqcFormSection');
    if (activeSection) {
        activeSection.classList.remove('hidden');
        activeSection.classList.add('active');
    }

    // 更改選單 active 狀態
    const navSubItems = document.querySelectorAll('.nav-sub-item');
    const navSubSubItems = document.querySelectorAll('.nav-sub-sub-item');
    navSubItems.forEach(x => x.classList.remove('active'));
    navSubSubItems.forEach(x => x.classList.remove('active'));
    const iqcFormLink = document.querySelector('.nav-sub-item[data-target="iqcFormSection"]');
    if (iqcFormLink) iqcFormLink.classList.add('active');

    // 更新頂部標題
    const mobileTitle = document.getElementById('mobileTitle');
    if (mobileTitle) mobileTitle.textContent = "進料檢驗 - 資料編輯";
    document.title = "進料檢驗 - 資料編輯 | 品質檢驗系統";

    // 2. 填入資料
    document.getElementById('iqcRowIndex').value = record.rowIndex || '';
    document.getElementById('iqcUploadDate').value = record.uploadDate || '';
    document.getElementById('poNumber').value = record.poNumber || '';
    
    // 設定人員
    const personnelSelect = document.getElementById('iqcPersonnel');
    if (personnelSelect) personnelSelect.value = record.personnel || '';

    // 設定品號並手動觸發連動
    const partNumberInput = document.getElementById('iqcPartNumber');
    if (partNumberInput) {
        partNumberInput.value = record.partNumber || '';
        const event = new Event('input', { bubbles: true });
        partNumberInput.dispatchEvent(event);
    }

    // 進貨數量
    document.getElementById('receiptQty').value = record.receiptQty || '';

    // 廠商 (延遲一下以等待連動載入品名與規格)
    setTimeout(() => {
        const vendorSelect = document.getElementById('vendor');
        if (vendorSelect) vendorSelect.value = record.vendor || '';
    }, 100);

    // 檢驗紀錄
    document.getElementById('inspectionMethod').value = record.inspectionMethod || '';
    document.getElementById('appearance').value = record.appearance || 'OK';
    document.getElementById('dimensions').value = record.dimensions || 'OK';
    document.getElementById('characteristics').value = record.characteristics || 'OK';
    document.getElementById('iqcPartSpec').value = record.partSpec || '';

    // 抽驗詳細數據
    document.getElementById('sampleA').value = record.sampleA || 'OK';
    document.getElementById('sampleB').value = record.sampleB || 'OK';
    document.getElementById('sampleC').value = record.sampleC || 'OK';
    document.getElementById('sampleD').value = record.sampleD || 'OK';
    document.getElementById('sampleE').value = record.sampleE || 'OK';
    document.getElementById('sampleF').value = record.sampleF || 'OK';

    // 判定
    document.getElementById('result').value = record.result || '';

    // 照片 URL 暫存與預覽
    document.getElementById('existingPoPhotoUrl').value = record.poPhotoUrl || '';
    document.getElementById('existingPhysicalPhotoUrl').value = record.physicalPhotoUrl || '';
    document.getElementById('hiddenPoPhotoBase64').value = '';
    document.getElementById('hiddenPhysicalPhotoBase64').value = '';

    // 渲染已有照片的預覽
    renderExistingPhotoPreview('poPhotoPreview', record.poPhotoUrl, 'existingPoPhotoUrl', '訂購單照片');
    renderExistingPhotoPreview('physicalPhotoPreview', record.physicalPhotoUrl, 'existingPhysicalPhotoUrl', '實體照片');

    // 3. 修改按鈕為更新狀態
    const btn = document.getElementById('iqcSubmitBtn');
    if (btn) {
        btn.querySelector('.btn-text').textContent = '更新檢驗紀錄';
    }
    const cancelBtn = document.getElementById('iqcCancelBtn');
    if (cancelBtn) {
        cancelBtn.classList.remove('hidden');
    }

    showToast('已載入該筆資料至編輯表單');
}

// 編輯來料不良紀錄
function editDefectiveRecord(record) {
    // 1. 切換至登錄頁面
    const contentSections = document.querySelectorAll('.content-section');
    contentSections.forEach(sec => {
        sec.classList.add('hidden');
        sec.classList.remove('active');
    });
    const activeSection = document.getElementById('defectiveFormSection');
    if (activeSection) {
        activeSection.classList.remove('hidden');
        activeSection.classList.add('active');
    }

    // 更改選單 active 狀態
    const navSubItems = document.querySelectorAll('.nav-sub-item');
    const navSubSubItems = document.querySelectorAll('.nav-sub-sub-item');
    navSubItems.forEach(x => x.classList.remove('active'));
    navSubSubItems.forEach(x => x.classList.remove('active'));
    const defectiveFormLink = document.querySelector('.nav-sub-item[data-target="defectiveFormSection"]');
    if (defectiveFormLink) defectiveFormLink.classList.add('active');

    // 更新頂部標題
    const mobileTitle = document.getElementById('mobileTitle');
    if (mobileTitle) mobileTitle.textContent = "來料不良 - 不良編輯";
    document.title = "來料不良 - 不良編輯 | 品質檢驗系統";

    // 2. 填入資料
    document.getElementById('defectiveRowIndex').value = record.rowIndex || '';
    document.getElementById('defectiveUploadDate').value = record.uploadDate || '';
    
    // 設定人員
    const personnelSelect = document.getElementById('defectivePersonnel');
    if (personnelSelect) personnelSelect.value = record.personnel || '';

    // 設定品號並手動觸發連動
    const partNumberInput = document.getElementById('defectivePartNumber');
    if (partNumberInput) {
        partNumberInput.value = record.partNumber || '';
        const event = new Event('input', { bubbles: true });
        partNumberInput.dispatchEvent(event);
    }

    // 生產製令並連動機型與生產數量
    const poInput = document.getElementById('productionOrder');
    if (poInput) {
        poInput.value = record.productionOrder || '';
        // 延遲一點點發送連動，以確保 model 讀取完畢
        setTimeout(() => {
            const event = new Event('input', { bubbles: true });
            poInput.dispatchEvent(event);
        }, 100);
    }

    // 不良數量
    document.getElementById('defectQty').value = record.defectQty || '';

    // 不良原因 (複選還原)
    if (record.defectReason) {
        setDefectReasonValues(record.defectReason);
    } else {
        resetDefectReasonSelection();
    }

    // 退庫數量
    document.getElementById('return019').value = record.return019 || '0';
    document.getElementById('return020').value = record.return020 || '0';

    // 照片 URL 暫存與預覽
    document.getElementById('existingDefectPhotoUrl').value = record.defectPhotoUrl || '';
    document.getElementById('hiddenDefectPhotoBase64').value = '';
    document.getElementById('defectPhoto').value = '';

    // 渲染已有照片的預覽
    renderExistingPhotoPreview('defectPhotoPreview', record.defectPhotoUrl, 'existingDefectPhotoUrl', '不良照片');

    // 3. 修改按鈕為更新狀態
    const btn = document.getElementById('defectiveSubmitBtn');
    if (btn) {
        btn.querySelector('.btn-text').textContent = '更新不良紀錄';
    }
    const cancelBtn = document.getElementById('defectiveCancelBtn');
    if (cancelBtn) {
        cancelBtn.classList.remove('hidden');
    }

    showToast('已載入該筆資料至編輯表單');
}

// ==================== 複選不良原因元件邏輯函數 ====================

function setupMultiSelectDefectReason() {
    const trigger = document.getElementById('defectReasonTrigger');
    const dropdown = document.getElementById('defectReasonDropdown');
    const backdrop = document.getElementById('defectReasonBackdrop');
    const closeBtn = document.getElementById('closeDefectDropdownBtn');
    const selectAllBtn = document.getElementById('selectAllDefectBtn');
    const clearAllBtn = document.getElementById('clearAllDefectBtn');

    if (!trigger || !dropdown) return;

    const parentSection = trigger.closest('.form-section');

    function openDropdown() {
        dropdown.classList.remove('hidden');
        if (backdrop) backdrop.classList.remove('hidden');
        trigger.classList.add('active');
        if (parentSection) parentSection.classList.add('dropdown-open');
    }

    function closeDropdown() {
        dropdown.classList.add('hidden');
        if (backdrop) backdrop.classList.add('hidden');
        trigger.classList.remove('active');
        if (parentSection) parentSection.classList.remove('dropdown-open');
    }

    // 點擊觸發框開關下拉清單
    trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        const isHidden = dropdown.classList.contains('hidden');
        if (isHidden) {
            openDropdown();
        } else {
            closeDropdown();
        }
    });

    // 全選按鈕
    if (selectAllBtn) {
        selectAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const optionsContainer = document.getElementById('defectReasonOptions');
            if (optionsContainer) {
                const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
                checkboxes.forEach(cb => { cb.checked = true; });
                updateDefectReasonSelectedState();
            }
        });
    }

    // 清空按鈕
    if (clearAllBtn) {
        clearAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            resetDefectReasonSelection();
        });
    }

    // 確定按鈕點擊關閉
    if (closeBtn) {
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDropdown();
        });
    }

    // 點擊暗色背景遮罩關閉
    if (backdrop) {
        backdrop.addEventListener('click', (e) => {
            e.stopPropagation();
            closeDropdown();
        });
    }

    // 點擊外部自動收合
    document.addEventListener('click', (e) => {
        if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
            closeDropdown();
        }
    });
}

function updateDefectReasonSelectedState() {
    const optionsContainer = document.getElementById('defectReasonOptions');
    const hiddenInput = document.getElementById('defectReason');
    const displayText = document.getElementById('defectReasonText');

    if (!optionsContainer || !hiddenInput || !displayText) return;

    const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
    const selectedValues = Array.from(checkedBoxes).map(cb => cb.value);

    if (selectedValues.length === 0) {
        hiddenInput.value = '';
        displayText.innerHTML = '<span class="placeholder-text">請點擊選擇不良原因</span>';
    } else {
        hiddenInput.value = selectedValues.join(', ');
        displayText.innerHTML = `
            <div class="selected-tags-container">
                ${selectedValues.map(v => `<span class="selected-tag">${v}</span>`).join('')}
            </div>
        `;
    }
}

function setDefectReasonValues(valueString) {
    const optionsContainer = document.getElementById('defectReasonOptions');
    if (!optionsContainer) return;

    // 清空現有勾選
    const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => { cb.checked = false; });

    if (valueString) {
        // 支援逗號或頓號分隔
        const targetValues = valueString.split(/,\s*|、\s*/).map(s => s.trim());
        checkboxes.forEach(cb => {
            if (targetValues.includes(cb.value)) {
                cb.checked = true;
            }
        });
    }
    updateDefectReasonSelectedState();
}

function resetDefectReasonSelection() {
    setDefectReasonValues('');
}

// 預設不良原因常規清單 (做為後端傳回前的預先載入/備用備援選項)
const defaultDefectReasons = [
    "外觀不良", "尺寸偏差", "標示/標籤錯誤", "包裝破損",
    "零件缺件", "氧化/生銹", "刮傷/碰傷", "變形/歪斜",
    "功能不良", "材質不符", "污損/雜質", "其它"
];

function renderDefectReasonOptions(reasonsList = defaultDefectReasons) {
    const optionsContainer = document.getElementById('defectReasonOptions');
    if (!optionsContainer) return;

    // 暫存目前已勾選內容
    const checkedBoxes = optionsContainer.querySelectorAll('input[type="checkbox"]:checked');
    const currentlyChecked = Array.from(checkedBoxes).map(cb => cb.value);

    optionsContainer.innerHTML = '';
    reasonsList.forEach((reason) => {
        const label = document.createElement('label');
        label.className = 'checkbox-option';
        const isChecked = currentlyChecked.includes(reason);
        label.innerHTML = `
            <input type="checkbox" value="${reason}" data-reason="${reason}" ${isChecked ? 'checked' : ''}>
            <span>${reason}</span>
        `;
        optionsContainer.appendChild(label);
    });

    const checkboxes = optionsContainer.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
        cb.addEventListener('change', updateDefectReasonSelectedState);
    });

    updateDefectReasonSelectedState();
}

// 預設人員常規清單 (做為零時差預載/離線備援選項)
const DEFAULT_PERSONNEL = ["高素娟", "李雅萍", "蔣邦昱", "黃漢彬"];

function renderPersonnelOptions(personnelList = DEFAULT_PERSONNEL) {
    const iqcPersonnel = document.getElementById('iqcPersonnel');
    const defectivePersonnel = document.getElementById('defectivePersonnel');

    const currentIqcVal = iqcPersonnel ? iqcPersonnel.value : '';
    const currentDefVal = defectivePersonnel ? defectivePersonnel.value : '';

    const defaultOptHtml = '<option value="" disabled selected>請選擇檢驗人員</option>';
    if (iqcPersonnel) iqcPersonnel.innerHTML = defaultOptHtml;
    if (defectivePersonnel) defectivePersonnel.innerHTML = defaultOptHtml;

    if (Array.isArray(personnelList)) {
        personnelList.forEach(person => {
            if (iqcPersonnel) {
                const opt1 = document.createElement('option');
                opt1.value = person; opt1.textContent = person;
                iqcPersonnel.appendChild(opt1);
            }
            if (defectivePersonnel) {
                const opt2 = document.createElement('option');
                opt2.value = person; opt2.textContent = person;
                defectivePersonnel.appendChild(opt2);
            }
        });
        if (currentIqcVal) iqcPersonnel.value = currentIqcVal;
        if (currentDefVal) defectivePersonnel.value = currentDefVal;
    }
}
