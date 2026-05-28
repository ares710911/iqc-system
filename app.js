// 系統 URL 常數
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxjoY2yX5BsyojlCUcv8VV8xRhA_ZQEIoMs7CySMDX14MDTpBGVOj9UurjzmbRZohHm/exec';

// 全域資料儲存
let globalPartsData = [];
let globalModelsData = [];
let activeFormType = null; // 用於標記當前送出的表單類型 ('iqc' 或 'defective')

document.addEventListener('DOMContentLoaded', () => {
    alert("【系統通知】成功載入最新版 V9 子母選單系統！");
    
    // 初始化日期
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('iqcUploadDate').value = today;
    document.getElementById('defectiveUploadDate').value = today;

    // 載入基礎資料 (人員、品項、不良原因、生產製令機型)
    fetch(SCRIPT_URL)
        .then(response => response.json())
        .then(data => {
            console.log("基礎資料載入成功", data);
            
            // 填入進料與不良人員選單
            const iqcPersonnel = document.getElementById('iqcPersonnel');
            const defectivePersonnel = document.getElementById('defectivePersonnel');
            
            const defaultOptHtml = '<option value="" disabled selected>請選擇檢驗人員</option>';
            iqcPersonnel.innerHTML = defaultOptHtml;
            defectivePersonnel.innerHTML = defaultOptHtml;
            
            if (data.personnel) {
                data.personnel.forEach(person => {
                    const opt1 = document.createElement('option');
                    opt1.value = person; opt1.textContent = person;
                    iqcPersonnel.appendChild(opt1);

                    const opt2 = document.createElement('option');
                    opt2.value = person; opt2.textContent = person;
                    defectivePersonnel.appendChild(opt2);
                });
            }
            
            // 儲存 PART 與 Model 資料
            if (data.parts) globalPartsData = data.parts;
            if (data.models) globalModelsData = data.models;

            // 填入不良原因選單
            const defectReasonSelect = document.getElementById('defectReason');
            if (defectReasonSelect && data.defectReasons) {
                defectReasonSelect.innerHTML = '<option value="" disabled selected>請選擇不良原因</option>';
                data.defectReasons.forEach(reason => {
                    const option = document.createElement('option');
                    option.value = reason;
                    option.textContent = reason;
                    defectReasonSelect.appendChild(option);
                });
            }
        })
        .catch(error => {
            console.error('無法載入基礎資料:', error);
            showToast('無法載入人員與選項資料，請重新整理頁面。', 'error');
        });

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

    // ==================== 表單非同步上傳與 Iframe 監聽 ====================
    const iqcForm = document.getElementById('iqcForm');
    const defectiveForm = document.getElementById('defectiveForm');
    const hiddenIframe = document.getElementById('hidden_iframe');

    // 監聽 iframe 載入事件 (後端回傳成功時會重新整理此 iframe)
    hiddenIframe.onload = function () {
        if (activeFormType === 'iqc') {
            showToast('進料檢驗紀錄上傳成功！');
            const currentPo = document.getElementById('poNumber').value;
            iqcForm.reset();
            
            // 恢復訂購單號、日期與照片預覽
            document.getElementById('poNumber').value = currentPo;
            document.getElementById('iqcUploadDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('poPhotoPreview').innerHTML = '';
            document.getElementById('physicalPhotoPreview').innerHTML = '';

            const btn = document.getElementById('iqcSubmitBtn');
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = '送出檢驗紀錄';
            btn.querySelector('.spinner').classList.add('hidden');
            activeFormType = null;
            
        } else if (activeFormType === 'defective') {
            showToast('不良品檢驗紀錄上傳成功！');
            defectiveForm.reset();
            
            // 恢復日期與照片預覽
            document.getElementById('defectiveUploadDate').value = new Date().toISOString().split('T')[0];
            document.getElementById('defectPhotoPreview').innerHTML = '';

            const btn = document.getElementById('defectiveSubmitBtn');
            btn.disabled = false;
            btn.querySelector('.btn-text').textContent = '送出不良紀錄';
            btn.querySelector('.spinner').classList.add('hidden');
            activeFormType = null;
        }
    };

    // 提交進料檢驗表單
    iqcForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        const btn = document.getElementById('iqcSubmitBtn');
        const btnText = btn.querySelector('.btn-text');
        const spinner = btn.querySelector('.spinner');

        btn.disabled = true;
        btnText.textContent = '圖片壓縮中...';
        spinner.classList.remove('hidden');

        try {
            const poPhotoFile = document.getElementById('poPhoto').files[0];
            const physicalPhotoFile = document.getElementById('physicalPhoto').files[0];

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
            btnText.textContent = '送出檢驗紀錄';
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

        btn.disabled = true;
        btnText.textContent = '圖片壓縮中...';
        spinner.classList.remove('hidden');

        try {
            const defectPhotoFile = document.getElementById('defectPhoto').files[0];

            if (defectPhotoFile) {
                const compressed = await compressImage(defectPhotoFile);
                document.getElementById('hiddenDefectPhotoBase64').value = compressed.data;
            } else {
                document.getElementById('hiddenDefectPhotoBase64').value = '';
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
            btnText.textContent = '送出不良紀錄';
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
        records.forEach(record => {
            const card = document.createElement('div');
            card.className = 'query-card';

            // 判定結果對應的 CSS 樣式
            let resultClass = '';
            if (record.result === 'OK') resultClass = 'result-ok';
            else if (record.result === 'NG') resultClass = 'result-ng';
            else if (record.result === '特採') resultClass = 'result-special';

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
                <div class="query-detail" style="margin-top: 8px; padding-top: 8px; border-top: 1px dashed rgba(0,0,0,0.08);">
                    <span class="label">最終判定</span>
                    <span class="value badge ${resultClass}">${record.result || '-'}</span>
                </div>
            `;
            container.appendChild(card);
        });
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
                        data.records.forEach(record => {
                            const card = document.createElement('div');
                            card.className = 'query-card';
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
                                    <span class="label">不良數</span>
                                    <span class="value">${record.defectQty || '-'}</span>
                                </div>
                                <div class="query-detail">
                                    <span class="label">不良原因</span>
                                    <span class="value" style="color: #ef4444; font-weight: 500;">${record.defectReason || '-'}</span>
                                </div>
                            `;
                            resultsContainer.appendChild(card);
                        });
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
