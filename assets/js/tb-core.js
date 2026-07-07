const TBCore = (function($) {
    
    const persianDigits = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishDigits = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

    function toPersianNum(str) {
        if (!str) return '';
        return str.toString().replace(/[0-9]/g, function(w) { return persianDigits[w]; });
    }

    function toEnglishNum(str) {
        if (!str) return '';
        return str.toString().replace(/[۰-۹]/g, function(w) { return englishDigits[persianDigits.indexOf(w)]; });
    }

    function formatMoney(val) {
        let num = toEnglishNum(val).replace(/[^0-9]/g, '');
        if (!num) return '';
        return toPersianNum(num.replace(/\B(?=(\d{3})+(?!\d))/g, ","));
    }

    function formatCardNumber(val) {
        let num = toEnglishNum(val).replace(/[^0-9]/g, '');
        if (!num) return '';
        num = num.substring(0, 16);
        let formatted = num.match(/.{1,4}/g);
        return formatted ? toPersianNum(formatted.join(' ')) : '';
    }

    $(document).on('input', '.th-input-fa-num', function() {
        let val = $(this).val().replace(/[^0-9۰-۹]/g, ''); 
        $(this).val(toPersianNum(val));
    });

    $(document).on('input', '.th-money-format', function() {
        $(this).val(formatMoney($(this).val()));
    });

    $(document).on('input', '.th-card-format', function() {
        $(this).val(formatCardNumber($(this).val()));
    });

    function initCustomSelect($select) {
        if ($select.next('.custom-select-wrapper').length) return;
        const $wrapper = $('<div class="custom-select-wrapper"></div>');
        const $display = $('<div class="custom-select-display"><span class="selected-text"></span><svg style="width:14px;height:14px;color:#7E8383;" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg></div>');
        const $options = $('<div class="custom-select-options shadow-sm"></div>');
        $wrapper.append($display).append($options);
        $select.hide().after($wrapper);
    }

    function renderCustomSelect($select) {
        const $wrapper = $select.next('.custom-select-wrapper');
        const $text = $wrapper.find('.selected-text');
        const $options = $wrapper.find('.custom-select-options');
        $options.empty();
        let selectedText = '';

        $select.find('option').each(function() {
            const val = $(this).val();
            const txt = $(this).text();
            const isSelected = $(this).is(':selected');
            if (isSelected) selectedText = txt;
            $options.append(`<div class="custom-option ${isSelected ? 'selected' : ''}" data-value="${val}">${toPersianNum(txt)}</div>`);
        });
        $text.text(toPersianNum(selectedText));
    }

    $(document).on('click', '.custom-select-display', function(e) {
        e.stopPropagation();
        const $display = $(this);
        $('.custom-select-display').not($display).removeClass('open').next('.custom-select-options').slideUp(150);
        $display.toggleClass('open');
        
        const $options = $display.next('.custom-select-options');
        $options.slideToggle(150);
        
        setTimeout(() => {
            $display[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 150);
    });

    $(document).on('click', '.custom-option', function(e) {
        e.stopPropagation();
        const $option = $(this);
        const val = $option.data('value');
        const $wrapper = $option.closest('.custom-select-wrapper');
        const $select = $wrapper.prev('select');
        
        $select.val(val).trigger('change'); 
        renderCustomSelect($select);
        $wrapper.find('.custom-select-display').removeClass('open');
        $wrapper.find('.custom-select-options').slideUp(150);
    });

    $(document).on('click', function() {
        $('.custom-select-display').removeClass('open');
        $('.custom-select-options').slideUp(150);
        $('.tb-autocomplete-results').slideUp(150);
        $('#tb-search-user-wrapper').css('padding-bottom', '0');
    });

    $('.tb-modal-close').on('click', function() {
        $(this).closest('.tb-modal-overlay').fadeOut(200);
    });

    let confirmCallback = null;
    function showConfirmModal(text, btnText, btnClass, callback) {
        $('#tb-confirm-text').html(text);
        $('#tb-btn-confirm-yes').text(btnText).removeClass('tb-btn-danger tb-btn-success').addClass(btnClass);
        $('#tb-confirm-modal').css('display', 'flex');
        confirmCallback = callback;
    }

    $('#tb-btn-confirm-no').on('click', function() {
        $('#tb-confirm-modal').fadeOut(200);
        confirmCallback = null;
    });

    $('#tb-btn-confirm-yes').on('click', function() {
        if (confirmCallback) confirmCallback();
        $('#tb-confirm-modal').fadeOut(200);
    });

    function showAlertModal(text) {
        $('#tb-alert-text').text(text);
        $('#tb-alert-modal').css('display', 'flex');
    }

    $('#tb-btn-alert-ok').on('click', function() {
        $('#tb-alert-modal').fadeOut(200);
    });

    function showInlineError($input, msg) {
        $input.closest('.position-relative').find('.tb-inline-error').remove();
        $input.closest('.position-relative').prepend(`<div class="tb-inline-error">${msg}</div>`);
        $input.closest('.position-relative').find('.tb-inline-error').slideDown(200);
        $input[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    $('.tb-tab-btn').on('click', function(e) {
        e.preventDefault();
        if ($(this).hasClass('active')) return;

        $('.tb-tab-btn').removeClass('active');
        $(this).addClass('active');

        const targetId = $(this).data('target');
        $('.tb-tab-pane').removeClass('active');
        $('#' + targetId).addClass('active');

        $(document).trigger('tb_tab_changed', [targetId]);
    });

    // ==========================================
    // تایم‌پیکر اختصاصی و پریمیوم (Premium Time Picker)
    // ==========================================
    class PremiumTimePicker {
        constructor(selector) {
            this.selector = selector;
            this.activeTarget = null;
            
            this.h = 12;
            this.m = 0;
            this.viewMode = 'hour';
            this.inputMode = 'clock';
            this.isDragging = false;
            this.lastRawAngle = 0;
            this.isInnerHour = false;

            this.faDigits = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];

            this.initDOM();
            this.bindEvents();
        }

        toFa(num) { return num.toString().replace(/\d/g, x => this.faDigits[x]); }
        toEn(str) { return str.replace(/[۰-۹]/g, x => this.faDigits.indexOf(x)); }
        pad(num) { return num < 10 ? '0' + num : num.toString(); }

        initDOM() {
            if (document.getElementById('ptpOverlay')) {
                // 👈 حل باگ: اگر قبلاً ساخته شده، فقط رفرنس‌ها را آپدیت کن
                this.dom = {
                    overlay: document.getElementById('ptpOverlay'),
                    modal: document.getElementById('ptpModal'),
                    disp: { h: document.getElementById('ptpDisplayH'), m: document.getElementById('ptpDisplayM') },
                    toggleBtn: document.getElementById('ptpKeyboardToggle'),
                    clock: document.getElementById('ptpClock'),
                    hand: document.getElementById('ptpHand'),
                    numbersWrap: document.getElementById('ptpNumbers'),
                    manual: document.getElementById('ptpManual'),
                    inputH: document.getElementById('ptpInputH'),
                    inputM: document.getElementById('ptpInputM'),
                    btnCancel: document.getElementById('ptpBtnCancel'),
                    btnOk: document.getElementById('ptpBtnOk')
                };
                return;
            }

            const html = `
                <div class="ptp-overlay" id="ptpOverlay">
                    <div class="ptp-modal" id="ptpModal">
                        <div class="ptp-header">
                            <div class="ptp-time-display">
                                <span id="ptpDisplayH">۱۲</span>:<!--
                                --><span id="ptpDisplayM">۰۰</span>
                            </div>
                            <button class="ptp-mode-btn" id="ptpKeyboardToggle" title="ورود دستی">
                                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 5h18c1.1 0 2 .9 2 2v10c0 1.1-.9 2-2 2H3c-1.1 0-2-.9-2-2V7c0-1.1.9-2 2-2z"></path><path d="M7 9h.01"></path><path d="M12 9h.01"></path><path d="M17 9h.01"></path><path d="M7 13h.01"></path><path d="M12 13h.01"></path><path d="M17 13h.01"></path><path d="M9 17h6"></path></svg>
                            </button>
                        </div>
                        
                        <div class="ptp-body">
                            <div class="ptp-clock-container" id="ptpClock">
                                <div class="ptp-clock-center"></div>
                                <div class="ptp-clock-hand" id="ptpHand"></div>
                                <div id="ptpNumbers"></div>
                            </div>

                            <div class="ptp-manual-container" id="ptpManual">
                                <div class="ptp-manual-box">
                                    <label>ساعت</label>
                                    <input type="tel" class="ptp-manual-input" id="ptpInputH" maxlength="2">
                                </div>
                                <div class="ptp-manual-colon">:</div>
                                <div class="ptp-manual-box">
                                    <label>دقیقه</label>
                                    <input type="tel" class="ptp-manual-input" id="ptpInputM" maxlength="2">
                                </div>
                            </div>
                        </div>

                        <div class="ptp-footer">
                            <button class="ptp-btn ptp-btn-cancel" id="ptpBtnCancel">انصراف</button>
                            <button class="ptp-btn ptp-btn-ok" id="ptpBtnOk">تایید زمان</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', html);

            this.dom = {
                overlay: document.getElementById('ptpOverlay'),
                modal: document.getElementById('ptpModal'),
                disp: { h: document.getElementById('ptpDisplayH'), m: document.getElementById('ptpDisplayM') },
                toggleBtn: document.getElementById('ptpKeyboardToggle'),
                clock: document.getElementById('ptpClock'),
                hand: document.getElementById('ptpHand'),
                numbersWrap: document.getElementById('ptpNumbers'),
                manual: document.getElementById('ptpManual'),
                inputH: document.getElementById('ptpInputH'),
                inputM: document.getElementById('ptpInputM'),
                btnCancel: document.getElementById('ptpBtnCancel'),
                btnOk: document.getElementById('ptpBtnOk')
            };
        }

        bindEvents() {
            // 👈 حل باگ: جلوگیری از بایند شدن چندباره رویدادها
            if (window.ptpEventsBound) return;
            window.ptpEventsBound = true;

            document.addEventListener('click', (e) => {
                if (e.target.matches(this.selector)) {
                    e.preventDefault();
                    this.open(e.target);
                }
            });

            // 👈 حل باگ: بررسی وجود دکمه قبل از بایند کردن رویداد
            if (this.dom && this.dom.btnCancel) {
                this.dom.btnCancel.addEventListener('click', () => this.close());
            }
            
            if (this.dom && this.dom.overlay) {
                this.dom.overlay.addEventListener('click', (e) => {
                    if (e.target === this.dom.overlay) e.stopPropagation();
                });
            }

            if (this.dom && this.dom.btnOk) {
                this.dom.btnOk.addEventListener('click', () => this.confirmTime());
            }

            if (this.dom && this.dom.disp.h) {
                this.dom.disp.h.addEventListener('click', () => { if(this.inputMode === 'clock') this.renderClockView('hour')});
                this.dom.disp.m.addEventListener('click', () => { if(this.inputMode === 'clock') this.renderClockView('minute')});
                this.dom.toggleBtn.addEventListener('click', () => this.toggleInputMode());
            }

            const startDrag = (e) => { 
                this.isDragging = true; 
                if(this.dom && this.dom.hand) this.dom.hand.classList.add('ptp-dragging'); 
                this.handleDrag(e); 
            };
            
            const stopDrag = (e) => {
                if(!this.isDragging) return;
                this.isDragging = false;
                if(this.dom && this.dom.hand) this.dom.hand.classList.remove('ptp-dragging');

                if (this.viewMode === 'hour') {
                    let h12 = this.h % 12 || 12;
                    let snapAngle = h12 * 30;
                    if (h12 === 12) snapAngle = this.lastRawAngle > 180 ? 360 : 0;
                    this.setHandAngle(snapAngle, this.isInnerHour ? 65 : 100);
                } else {
                    let snapAngle = this.m * 6;
                    if (this.m === 0) snapAngle = this.lastRawAngle > 180 ? 360 : 0;
                    this.setHandAngle(snapAngle, 100);
                }

                if (this.viewMode === 'hour') {
                    setTimeout(() => {
                        if(this.inputMode === 'clock') this.renderClockView('minute');
                    }, 350);
                }
            };

            const drag = (e) => { if(this.isDragging) this.handleDrag(e); };

            if (this.dom && this.dom.clock) {
                this.dom.clock.addEventListener('mousedown', startDrag);
                this.dom.clock.addEventListener('touchstart', startDrag, {passive: false});
            }
            
            document.addEventListener('mousemove', drag);
            document.addEventListener('touchmove', drag, {passive: false});
            document.addEventListener('mouseup', stopDrag);
            document.addEventListener('touchend', stopDrag);

            if (this.dom && this.dom.inputH) {
                this.setupManualInput(this.dom.inputH, 23);
                this.setupManualInput(this.dom.inputM, 59);
            }
        }

        setupManualInput(inputEl, maxVal) {
            inputEl.addEventListener('input', (e) => {
                let val = this.toEn(e.target.value).replace(/\D/g, '');
                if (val !== '') {
                    if (parseInt(val) > maxVal) val = maxVal.toString();
                }
                e.target.value = this.toFa(val);
            });
            inputEl.addEventListener('blur', (e) => {
                let val = this.toEn(e.target.value);
                if (val !== '') e.target.value = this.toFa(this.pad(parseInt(val)));
                else e.target.value = this.toFa('۰۰');
            });
        }

        open(target) {
            this.activeTarget = target;
            let val = this.toEn(target.value);
            
            if (val && val.includes(':')) {
                let parts = val.split(':');
                this.h = parseInt(parts[0]);
                this.m = parseInt(parts[1]);
            } else {
                let now = new Date();
                this.h = now.getHours();
                this.m = now.getMinutes();
            }

            this.inputMode = 'clock';
            if(this.dom && this.dom.manual) {
                this.dom.manual.style.display = 'none';
                this.dom.clock.style.display = 'block';
            }
            this.updateHeader();
            this.renderClockView('hour');
            
            if(this.dom && this.dom.overlay) {
                this.dom.overlay.classList.add('ptp-active');
                document.body.style.overflow = 'hidden';
            }
        }

        close() {
            if(this.dom && this.dom.overlay) {
                this.dom.overlay.classList.remove('ptp-active');
                document.body.style.overflow = '';
            }
        }

        confirmTime() {
            if (this.inputMode === 'manual') {
                this.h = parseInt(this.toEn(this.dom.inputH.value) || 0);
                this.m = parseInt(this.toEn(this.dom.inputM.value) || 0);
            }

            if (this.activeTarget) {
                let displayStr = `${this.toFa(this.pad(this.h))}:${this.toFa(this.pad(this.m))}`;
                this.activeTarget.value = displayStr;
                $(this.activeTarget).trigger('change');
            }
            this.close();
        }

        toggleInputMode() {
            if (this.inputMode === 'clock') {
                this.inputMode = 'manual';
                this.dom.clock.style.display = 'none';
                this.dom.manual.style.display = 'flex';
                this.dom.inputH.value = this.toFa(this.pad(this.h));
                this.dom.inputM.value = this.toFa(this.pad(this.m));
                this.dom.disp.h.classList.remove('ptp-active');
                this.dom.disp.m.classList.remove('ptp-active');
            } else {
                this.inputMode = 'clock';
                this.h = parseInt(this.toEn(this.dom.inputH.value) || 0);
                this.m = parseInt(this.toEn(this.dom.inputM.value) || 0);
                this.dom.manual.style.display = 'none';
                this.dom.clock.style.display = 'block';
                this.updateHeader();
                this.renderClockView('hour');
            }
        }

        updateHeader() {
            if(this.dom && this.dom.disp.h) {
                this.dom.disp.h.textContent = this.toFa(this.pad(this.h));
                this.dom.disp.m.textContent = this.toFa(this.pad(this.m));
            }
        }

        renderClockView(mode) {
            this.viewMode = mode;
            if(!this.dom || !this.dom.disp.h) return;

            this.dom.disp.h.classList.toggle('ptp-active', mode === 'hour');
            this.dom.disp.m.classList.toggle('ptp-active', mode === 'minute');

            this.dom.numbersWrap.classList.add('ptp-fade-out');
            
            setTimeout(() => {
                this.dom.numbersWrap.innerHTML = '';
                
                if (mode === 'hour') {
                    for(let i=1; i<=12; i++) {
                        this.dom.numbersWrap.appendChild(this.createNumber(i, i, 100));
                    }
                    for(let i=13; i<=24; i++) {
                        let val = i === 24 ? 0 : i;
                        let display = i === 24 ? '۰۰' : i;
                        let el = this.createNumber(display, val, 65);
                        el.classList.add('ptp-inner');
                        this.dom.numbersWrap.appendChild(el);
                    }
                    let h12 = this.h % 12 || 12;
                    this.setHandAngle(h12 * 30, this.h > 0 && this.h <= 12 ? 100 : 65);
                    
                } else {
                    for(let i=0; i<60; i++) {
                        if (i % 5 === 0) {
                            let display = i === 0 ? '۰۰' : i;
                            this.dom.numbersWrap.appendChild(this.createNumber(display, i, 100));
                        } else {
                            this.dom.numbersWrap.appendChild(this.createTick(i, 100));
                        }
                    }
                    this.setHandAngle(this.m * 6, 100);
                }
                
                this.dom.numbersWrap.classList.remove('ptp-fade-out');
                this.dom.numbersWrap.classList.add('ptp-fade-in');
                setTimeout(() => this.dom.numbersWrap.classList.remove('ptp-fade-in'), 200);
            }, 200);
        }

        createNumber(text, value, radius) {
            const el = document.createElement('div');
            el.className = 'ptp-number';
            el.textContent = typeof text === 'number' ? this.toFa(text) : this.toFa(text);
            
            let angle = (this.viewMode === 'hour' ? value * 30 : value * 6) - 90;
            const rad = angle * (Math.PI / 180);
            const x = 125 + radius * Math.cos(rad); 
            const y = 125 + radius * Math.sin(rad);

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            return el;
        }

        createTick(value, radius) {
            const el = document.createElement('div');
            el.className = 'ptp-tick';
            
            let angle = value * 6 - 90;
            const rad = angle * (Math.PI / 180);
            const x = 125 + radius * Math.cos(rad); 
            const y = 125 + radius * Math.sin(rad);

            el.style.left = `${x}px`;
            el.style.top = `${y}px`;
            el.style.transform = `translate(-50%, -50%) rotate(${value * 6}deg)`;
            
            return el;
        }

        setHandAngle(angle, radius) {
            if(this.dom && this.dom.hand) {
                this.dom.hand.style.transform = `rotate(${angle}deg)`;
                this.dom.hand.style.height = `${radius}px`;
            }
        }

        handleDrag(e) {
            if (e.type.includes('touch')) e.preventDefault();

            if(!this.dom || !this.dom.clock) return;

            const rect = this.dom.clock.getBoundingClientRect();
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            if(clientX === undefined) return;

            const cx = rect.left + rect.width / 2;
            const cy = rect.top + rect.height / 2;
            const x = clientX - cx;
            const y = clientY - cy;

            let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
            if (angle < 0) angle += 360;
            
            this.lastRawAngle = angle;
            const distance = Math.sqrt(x*x + y*y);

            if (this.viewMode === 'hour') {
                let hour = Math.round(angle / 30);
                if (hour === 0 || hour === 12) hour = 12;
                
                let isInner = distance < 82;
                this.isInnerHour = isInner;
                
                if (isInner) this.h = hour === 12 ? 0 : hour + 12;
                else this.h = hour;
                
                this.setHandAngle(angle, isInner ? 65 : 100);
            } else {
                let minute = Math.round(angle / 6);
                if (minute === 60) minute = 0;
                this.m = minute;
                
                this.setHandAngle(angle, 100);
            }
            
            this.updateHeader();
        }
    }

    return {
        toPersianNum: toPersianNum,
        toEnglishNum: toEnglishNum,
        formatMoney: formatMoney,
        formatCardNumber: formatCardNumber,
        initCustomSelect: initCustomSelect,
        renderCustomSelect: renderCustomSelect,
        showConfirmModal: showConfirmModal,
        showAlertModal: showAlertModal,
        showInlineError: showInlineError,
        PremiumTimePicker: PremiumTimePicker
    };

})(jQuery);