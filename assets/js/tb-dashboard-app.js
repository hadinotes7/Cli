jQuery(document).ready(function($) {

    // ==========================================
    // بررسی بازگشت از گوگل و تنظیم فلگ موفقیت
    // ==========================================
    const urlParams = new URLSearchParams(window.location.search);
    let showGoogleSuccess = false;

    if (urlParams.get('google_sync') === 'success') {
        showGoogleSuccess = true;
        window.location.hash = '#/consultant';
        const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + window.location.hash;
        window.history.replaceState({path: newUrl}, '', newUrl);
    }

    // ==========================================
    // ۰. دیباگر روی صفحه
    // ==========================================
    const TBDebug = {
        show: function(message, type = 'error') {
            const color = type === 'error' ? '#CC4748' : '#229AF0';
            const bg = type === 'error' ? '#fee2e2' : '#e0f2fe';
            const html = `<div style="position:fixed; top:10px; left:10px; right:10px; background:${bg}; color:${color}; border:2px solid ${color}; padding:15px; border-radius:10px; z-index:999999; font-family:tahoma; font-size:12px; direction:ltr; text-align:left; box-shadow:0 5px 15px rgba(0,0,0,0.2);">
                <strong>TB Debugger:</strong><br>${message}
                <button onclick="this.parentElement.remove()" style="position:absolute; top:5px; right:5px; background:none; border:none; color:${color}; font-weight:bold; cursor:pointer;">X</button>
            </div>`;
            $('body').append(html);
        }
    };

    window.onerror = function(msg, url, lineNo, columnNo, error) {
        TBDebug.show(`${msg}<br>Line: ${lineNo}`);
        return false;
    };

    // ==========================================
    // ۱. تقویم شمسی اختصاصی (TBCalendar)
    // ==========================================
    function gregorianToJalali(gy, gm, gd) {
        let g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
        let jy = (gy <= 1600) ? 0 : 979;
        gy -= (gy <= 1600) ? 621 : 1600;
        let gy2 = (gm > 2) ? (gy + 1) : gy;
        let days = (365 * gy) + parseInt((gy2 + 3) / 4) - parseInt((gy2 + 99) / 100) + parseInt((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
        jy += 33 * parseInt(days / 12053);
        days %= 12053;
        jy += 4 * parseInt(days / 1461);
        days %= 1461;
        if (days > 365) { jy += parseInt((days - 1) / 365); days = (days - 1) % 365; }
        let jm = (days < 186) ? 1 + parseInt(days / 31) : 7 + parseInt((days - 186) / 30);
        let jd = 1 + ((days < 186) ? (days % 31) : ((days - 186) % 30));
        return [jy, jm, jd];
    }

    window.TBCalendar = (function() {
        const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
        let currentJYear, currentJMonth, todayJYear, todayJMonth, todayJDay;
        let targetInput = null;
        let targetHidden = null;
        let allowPastDates = false; 

        function jalaliToGregorian(jy, jm, jd) {
            let gy = (jy <= 979) ? 621 : 1600;
            jy -= (jy <= 979) ? 0 : 979;
            let days = (365 * jy) + ((parseInt(jy / 33)) * 8) + parseInt(((jy % 33) + 3) / 4) + 78 + jd + ((jm < 7) ? (jm - 1) * 31 : ((jm - 7) * 30) + 186);
            gy += 400 * parseInt(days / 146097);
            days %= 146097;
            if (days > 36524) { gy += 100 * parseInt(--days / 36524); days %= 36524; if (days >= 365) days++; }
            gy += 4 * parseInt(days / 1461);
            days %= 1461;
            if (days > 365) { gy += parseInt((days - 1) / 365); days = (days - 1) % 365; }
            let gd = days + 1;
            let sal_a = [0, 31, ((gy % 4 == 0 && gy % 100 != 0) || (gy % 400 == 0)) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
            let gm;
            for (gm = 0; gm < 13; gm++) {
                let v = sal_a[gm];
                if (gd <= v) break;
                gd -= v;
            }
            return [gy, gm, gd];
        }

        function getDaysInMonth(year, month) {
            if (month <= 6) return 31;
            if (month <= 11) return 30;
            let isLeap = ((((((year - ((year > 0) ? 474 : 473)) % 2820) + 474) + 38) * 682) % 2816) < 682;
            return isLeap ? 30 : 29;
        }

        function getFirstDayOfWeek(year, month) {
            let gDate = jalaliToGregorian(year, month, 1);
            let d = new Date(gDate[0], gDate[1] - 1, gDate[2]);
            let day = d.getDay(); 
            return (day === 6) ? 0 : day + 1;
        }

        function initUI() {
            if ($('#tb-custom-datepicker').length === 0) {
                $('body').append(`
                    <div id="tb-custom-datepicker" class="tb-dp-overlay">
                        <div class="tb-dp-box">
                            <div class="tb-dp-header">
                                <button class="tb-dp-btn" id="tb-dp-prev"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>
                                <h4 class="tb-dp-title" id="tb-dp-title" style="font-family: 'IRANYekanX', tahoma, sans-serif !important;"></h4>
                                <button class="tb-dp-btn" id="tb-dp-next"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>
                            </div>
                            <div class="tb-dp-body">
                                <table class="tb-dp-grid">
                                    <thead><tr><th>ش</th><th>ی</th><th>د</th><th>س</th><th>چ</th><th>پ</th><th>ج</th></tr></thead>
                                    <tbody id="tb-dp-days"></tbody>
                                </table>
                            </div>
                            <div class="tb-dp-footer">
                                <button class="tb-btn-cancel w-100" id="tb-dp-close">انصراف</button>
                            </div>
                        </div>
                    </div>
                `);

                $('#tb-dp-prev').on('click', function() {
                    currentJMonth--;
                    if (currentJMonth < 1) { currentJMonth = 12; currentJYear--; }
                    renderCalendar();
                });

                $('#tb-dp-next').on('click', function() {
                    currentJMonth++;
                    if (currentJMonth > 12) { currentJMonth = 1; currentJYear++; }
                    renderCalendar();
                });

                $('#tb-dp-close').on('click', function() {
                    $('#tb-custom-datepicker').fadeOut(200);
                });

                $(document).on('click', '.tb-dp-day:not(.empty):not(.disabled)', function() {
                    let d = $(this).data('day');
                    let m = currentJMonth;
                    let y = currentJYear;
                    
                    let jDateStr = y + '/' + (m < 10 ? '0'+m : m) + '/' + (d < 10 ? '0'+d : d);
                    let gDateArr = jalaliToGregorian(y, m, d);
                    let gDateStr = gDateArr[0] + '-' + (gDateArr[1] < 10 ? '0'+gDateArr[1] : gDateArr[1]) + '-' + (gDateArr[2] < 10 ? '0'+gDateArr[2] : gDateArr[2]);

                    targetInput.val(TBCore.toPersianNum(jDateStr));
                    if (targetHidden) targetHidden.val(gDateStr);
                    
                    targetInput.closest('.position-relative').find('.tb-inline-error').remove();
                    $('.tb-inline-error').remove();

                    $('#tb-custom-datepicker').fadeOut(200);
                });
            }
        }

        function renderCalendar() {
            $('#tb-dp-title').text(months[currentJMonth - 1] + ' ' + TBCore.toPersianNum(currentJYear));
            let daysInMonth = getDaysInMonth(currentJYear, currentJMonth);
            let firstDay = getFirstDayOfWeek(currentJYear, currentJMonth);
            
            let html = '<tr>';
            let dayCount = 1;

            for (let i = 0; i < 42; i++) {
                if (i % 7 === 0 && i !== 0) html += '</tr><tr>';
                
                if (i < firstDay || dayCount > daysInMonth) {
                    html += '<td><span class="tb-dp-day empty"></span></td>';
                } else {
                    let classes = 'tb-dp-day';
                    
                    if (!allowPastDates) {
                        if (currentJYear < todayJYear || (currentJYear === todayJYear && currentJMonth < todayJMonth) || (currentJYear === todayJYear && currentJMonth === todayJMonth && dayCount < todayJDay)) {
                            classes += ' disabled';
                        }
                    }
                    
                    if (currentJYear === todayJYear && currentJMonth === todayJMonth && dayCount === todayJDay) {
                        classes += ' today';
                    }
                    
                    html += `<td><span class="${classes}" data-day="${dayCount}">${TBCore.toPersianNum(dayCount)}</span></td>`;
                    dayCount++;
                }
            }
            html += '</tr>';
            $('#tb-dp-days').html(html);
        }

        return {
            open: function(inputEl, hiddenId) {
                initUI();
                targetInput = $(inputEl);
                targetHidden = $('#' + hiddenId);

                allowPastDates = inputEl.getAttribute('data-allow-past') === 'true';

                let now = new Date();
                let jNow = gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
                todayJYear = jNow[0]; todayJMonth = jNow[1]; todayJDay = jNow[2];

                currentJYear = todayJYear;
                currentJMonth = todayJMonth;

                renderCalendar();
                $('#tb-custom-datepicker').css('display', 'flex');
            }
        };
    })();

    $(document).off('click', '.tb-date-picker').on('click', '.tb-date-picker', function(e) {
        e.preventDefault();
        window.TBCalendar.open(this, $(this).data('gregorian'));
    });

    // ==========================================
    // ۱. راه‌اندازی تایم‌پیکر پریمیوم
    // ==========================================
    if (typeof TBCore !== 'undefined' && TBCore.PremiumTimePicker) {
        new TBCore.PremiumTimePicker('.tb-clock-picker');
    }

    // ==========================================
    // ۲. توابع عمومی و فیلترها
    // ==========================================
    $(document).on('input change', 'select, .tb-clock-picker', function() {
        $(this).closest('.position-relative').find('.tb-inline-error').remove();
    });

    $(document).on('input', '.th-input-fa-num:not(.tb-clock-picker)', function() {
        let val = $(this).val().replace(/[^0-9۰-۹]/g, ''); 
        $(this).val(TBCore.toPersianNum(val));
        $(this).closest('.position-relative').find('.tb-inline-error').remove();
    });

    function reloadTableAfterAdd() {
        window.frontCalendarPage = 1;
        $('#front_filter_status').val('all');
        $('#front_filter_area').val('all');
        $('#front_filter_day').val('all');
        $('#front_filter_start_date, #front_filter_start_date_gregorian, #front_filter_end_date, #front_filter_end_date_gregorian').val('');
        
        if(typeof TBCore !== 'undefined' && TBCore.renderCustomSelect) {
            TBCore.renderCustomSelect($('#front_filter_status'));
            TBCore.renderCustomSelect($('#front_filter_area'));
            TBCore.renderCustomSelect($('#front_filter_day'));
        }
        
        window.loadFrontCalendarTable();
        checkPendingResolutions();
    }

    // ==========================================
    // ۳. محاسبه هوشمند ارتفاع
    // ==========================================
    function calculateAppHeight() {
        const $container = $('#tb-app-root');
        if (!$container.length) return;
        const offsetTop = $container.offset().top;
        const windowHeight = window.innerHeight;
        const appHeight = windowHeight - offsetTop - 20; 
        if (appHeight > 500) { 
            $container.css('--tb-app-height', appHeight + 'px');
        }
    }
    $(window).on('resize', calculateAppHeight);
    calculateAppHeight();

    // ==========================================
    // ۴. موتور روتینگ SPA
    // ==========================================
    function loadView() {
        let hash = window.location.hash.replace('#/', '');
        if (!hash) hash = 'overview';

        $('.tb-nav-item').removeClass('active');
        $(`.tb-nav-item[data-view="${hash}"]`).addClass('active');

        const $content = $('#tb-app-content');
        $content.html('<div class="tb-loader-center"><span class="spinner-border text-primary"></span></div>');

        $.post(TB_Front.ajaxurl, {
            action: 'tb_load_dashboard_view',
            security: TB_Front.nonce,
            view: hash
        }).done(function(res) {
            if (res.success) {
                $content.html(res.data.html);
                initViewScripts(hash);
            } else {
                $content.html(`<div style="padding:20px; background:#fee2e2; color:#991b1b; border:1px solid #f87171; border-radius:10px; direction:rtl; text-align:right; font-family:tahoma; line-height:1.8;"><strong>خطای سیستم:</strong><br>${res.data}</div>`);
            }
        }).fail(function(xhr) {
            let errorText = xhr.responseText ? xhr.responseText : 'خطای نامشخص سرور';
            $content.html(`<div style="padding:20px; background:#fee2e2; color:#991b1b; border:1px solid #f87171; border-radius:10px; direction:ltr; text-align:left; font-family:monospace; font-size:12px; overflow-x:auto;"><strong>Server Error (500):</strong><br>${errorText}</div>`);
        });
    }

    $(window).on('hashchange', loadView);
    loadView();

    // ==========================================
    // ۵. توابع اختصاصی هر ویو
    // ==========================================
    function initViewScripts(view) {
        if (view === 'profile') {
            $('.tb-profile-avatar').on('click', function() {
                const url = $(this).attr('src');
                if (url) {
                    $('#tb-lightbox-img').attr('src', url);
                    $('#tb-lightbox-modal').css('display', 'flex');
                }
            });
            $('.tb-lightbox-close').on('click', function() {
                $('#tb-lightbox-modal').fadeOut(200);
            });
        }
        
        if (view === 'overview') {
            initOverviewTimers();
        }

        if (view === 'consultant') {
            window.initConsultantCalendar();

            if (showGoogleSuccess) {
                const $successBox = $('#tb-google-success-inline');
                if ($successBox.length) {
                    $successBox.css({
                        'display': 'flex',
                        'opacity': '0',
                        'transform': 'translateY(-10px)'
                    }).animate({
                        'opacity': '1',
                        'transform': 'translateY(0)'
                    }, 400);
                    
                    setTimeout(() => {
                        $successBox.animate({
                            'opacity': '0',
                            'transform': 'translateY(-10px)'
                        }, 400, function() {
                            $(this).hide();
                        });
                        showGoogleSuccess = false;
                    }, 10000);
                }
            }
        }
    }

    // 👈 تابع گمشده بازگردانده شد
    function changeSessionStatus(id, status) {
        $.post(TB_Front.ajaxurl, {
            action: 'tb_front_mark_session_status',
            security: TB_Front.nonce,
            session_id: id,
            status: status
        }).done(function(res) {
            TBCore.showAlertModal(res.data || res.data.message);
            if (res.success) loadView(); 
        });
    }

    function initOverviewTimers() {
    // 👈 تابع جامع بررسی زمان (پشتیبانی از جلسات حضوری و تلفنی)
        function checkSessionTimers() {
            const now = new Date();
            const reminderMin = parseInt(TB_Front.reminder_min) || 20; 
            
            $('.tc-action-wrapper').each(function() {
                const $wrapper = $(this);
                const startStr = $wrapper.data('start');
                const duration = parseInt($wrapper.data('duration')) || 60; 
                const nature = $wrapper.data('nature'); // 👈 خواندن ماهیت کانال
                
                if (!startStr) return;
                
                const startTime = new Date(startStr.replace(/-/g, '/'));
                const diffMinutes = (startTime - now) / 60000;
                
                const $meetBtn = $wrapper.find('.tc-btn-meet');
                const $resBtns = $wrapper.find('.tc-resolution-btns');
                const $waitText = $wrapper.find('.tc-waiting-text');
                const $inProgressText = $wrapper.find('.tc-inprogress-text'); // 👈 المان جدید
                
                if (diffMinutes < -duration) {
                    // 🔴 جلسه تمام شده است
                    $meetBtn.hide(); 
                    $waitText.hide(); 
                    $inProgressText.hide();
                    $resBtns.css('display', 'flex'); 
                } else if (diffMinutes <= 0) {
                    // 🟢 جلسه دقیقاً در حال برگزاری است (از دقیقه ۰ تا پایان)
                    $resBtns.hide(); 
                    $waitText.hide(); 
                    
                    if (nature === 'online') {
                        $meetBtn.removeClass('disabled').addClass('active').show();
                        $inProgressText.hide();
                    } else {
                        // برای حضوری و تلفنی، متن در حال برگزاری با انیمیشن نشان داده شود
                        $meetBtn.hide();
                        $inProgressText.show();
                    }
                } else if (diffMinutes <= reminderMin) {
                    // 🟡 کمتر از زمان تنظیم شده (مثلاً ۳۳ دقیقه) به شروع مانده
                    $resBtns.hide(); 
                    $waitText.hide(); 
                    $inProgressText.hide();
                    
                    if (nature === 'online') {
                        $meetBtn.removeClass('disabled').addClass('active').show();
                    } else {
                        // برای حضوری و تلفنی، در این بازه هنوز در انتظار است
                        $waitText.show();
                    }
                } else {
                    // ⚪ بیشتر از زمان تنظیم شده مانده است
                    $resBtns.hide(); 
                    $waitText.show(); 
                    $inProgressText.hide();
                    
                    if (nature === 'online') {
                        $meetBtn.removeClass('active').addClass('disabled').show();
                    }
                }
            });
        }
        
        checkSessionTimers();
        setInterval(checkSessionTimers, 60000);

// 👈 اصلاح قطعی: خواندن نام و تاریخ از دکمه‌های جدول امروز
        $('.tb-btn-complete-session').off('click').on('click', function() {
            const id = $(this).data('id');
            const name = $(this).attr('data-name') || 'این مراجع'; // استفاده از attr برای اطمینان
            const time = $(this).attr('data-datetime') || '';
            
            TBCore.showConfirmModal(`آیا از پایان یافتن جلسه <strong>${name}</strong> در ساعت ${time} اطمینان دارید؟ مبلغ در سیستم حسابداری تثبیت می‌شود.`, 'بله، پایان جلسه', 'tb-btn-success', function() {
                changeSessionStatus(id, 'completed');
            });
        });

        $('.tb-btn-noshow-session').off('click').on('click', function() {
            const id = $(this).data('id');
            const name = $(this).attr('data-name') || 'این مراجع';
            const time = $(this).attr('data-datetime') || '';
            
            TBCore.showConfirmModal(`آیا مطمئن هستید <strong>${name}</strong> در ساعت ${time} حاضر نشده است؟ مبلغ به عنوان جریمه ضبط می‌شود.`, 'بله، ثبت غیبت', 'tb-btn-danger', function() {
                changeSessionStatus(id, 'no_show');
            });
        });
        
// فراخوانی کارتابل در زمان لود داشبورد
        if (typeof checkPendingResolutions === 'function') checkPendingResolutions();
        
        // لود کردن جدول آینده در زمان باز شدن داشبورد
        if (typeof window.loadFrontFutureTable === 'function') window.loadFrontFutureTable();

        // 👈 حل مشکل استایل کمبوباکس جلسات آینده
        if ($('#front_future_per_page').length) {
            TBCore.initCustomSelect($('#front_future_per_page'));
            TBCore.renderCustomSelect($('#front_future_per_page'));
        }
    }
    // ==========================================
    // ۶. منطق کامل تقویم مشاور (Global Scope)
    // ==========================================
    window.frontCalendarPage = 1;

    window.initConsultantCalendar = function() {
        window.frontCalendarPage = 1;

        if (typeof TBCore !== 'undefined' && TBCore.PremiumTimePicker) {
            new TBCore.PremiumTimePicker('.tb-clock-picker');
        }

        $.post(TB_Front.ajaxurl, {
            action: 'tb_front_get_areas',
            security: TB_Front.nonce
        }).done(function(res) {
            if (res.success) {
                const allAreas = res.data.all_areas;
                const allowedAreas = res.data.allowed_areas;

                const $selFilter = $('#front_filter_area');
                $selFilter.empty().append('<option value="all">همه حوزه‌ها</option>');
                allAreas.forEach(area => {
                    const text = `${area.area_name} | ${area.channel_name} (${TBCore.toPersianNum(area.duration)} دقیقه)`;
                    const comboValue = `${area.area_id}_${area.channel_id}`;
                    $selFilter.append(`<option value="${comboValue}">${text}</option>`);
                });
                TBCore.initCustomSelect($selFilter); 
                TBCore.renderCustomSelect($selFilter);

                $('.tb-online-restriction-msg').remove(); 
                
                if (allowedAreas.length === 0) {
                    $('#front_add_form_section').hide();
                    $('<div class="tb-shape-box mb-4 text-center py-4 tb-online-restriction-msg"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 40px; height: 40px; color: var(--tb-error); margin-bottom: 10px;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg><p class="text-muted m-0" style="font-size: 13px; color: var(--tb-error) !important; font-weight: bold;">شما دسترسی به ثبت جلسات آنلاین ندارید. لطفاً با مدیریت هماهنگ کنید.</p></div>').insertBefore('#front_add_form_section');
                } else {
                    $('#front_add_form_section').show();
                    const $selSingle = $('#front_sel_area');
                    const $selBatch = $('#front_batch_area');
                    
                    $selSingle.empty().append('<option value="">انتخاب کنید...</option>');
                    $selBatch.empty().append('<option value="">انتخاب کنید...</option>');
                    
                    allowedAreas.forEach(area => {
                        const text = `${area.area_name} | ${area.channel_name} (${TBCore.toPersianNum(area.duration)} دقیقه)`;
                        const comboValue = `${area.area_id}_${area.channel_id}`;
                        $selSingle.append(`<option value="${comboValue}">${text}</option>`);
                        $selBatch.append(`<option value="${comboValue}">${text}</option>`);
                    });
                    
                    TBCore.initCustomSelect($selSingle); TBCore.renderCustomSelect($selSingle);
                    TBCore.initCustomSelect($selBatch); TBCore.renderCustomSelect($selBatch);
                }

                TBCore.initCustomSelect($('#front_filter_status')); TBCore.renderCustomSelect($('#front_filter_status'));
                TBCore.initCustomSelect($('#front_filter_day')); TBCore.renderCustomSelect($('#front_filter_day'));
                TBCore.initCustomSelect($('#front_per_page')); TBCore.renderCustomSelect($('#front_per_page'));

                window.loadFrontCalendarTable();
            }
        });
    };

    function renderSmartPagination(totalPages, currentPage, $container) {
        $container.empty();
        if (totalPages <= 1) return;

        if (currentPage > 1) {
            $container.append(`<button class="tb-page-btn" data-page="${currentPage - 1}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>`);
        } else {
            $container.append(`<button class="tb-page-btn disabled"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>`);
        }

        let startPage = 1;
        let endPage = totalPages;

        if (totalPages > 10) {
            if (currentPage <= 6) {
                startPage = 1;
                endPage = 8;
            } else if (currentPage + 4 >= totalPages) {
                startPage = totalPages - 7;
                endPage = totalPages;
            } else {
                startPage = currentPage - 3;
                endPage = currentPage + 3;
            }
        }

        if (startPage > 1) {
            $container.append(`<button class="tb-page-btn" data-page="1">${TBCore.toPersianNum(1)}</button>`);
            if (startPage > 2) {
                $container.append(`<span class="tb-page-dots">...</span>`);
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            $container.append(`<button class="tb-page-btn ${activeClass}" data-page="${i}">${TBCore.toPersianNum(i)}</button>`);
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                $container.append(`<span class="tb-page-dots">...</span>`);
            }
            $container.append(`<button class="tb-page-btn" data-page="${totalPages}">${TBCore.toPersianNum(totalPages)}</button>`);
        }

        if (currentPage < totalPages) {
            $container.append(`<button class="tb-page-btn" data-page="${currentPage + 1}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>`);
        } else {
            $container.append(`<button class="tb-page-btn disabled"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg></button>`);
        }
    }

 window.loadFrontCalendarTable = function() {
        const perPage = $('#front_per_page').val() || 10;
        const status = $('#front_filter_status').val() || 'all';
        const area = $('#front_filter_area').val() || 'all';
        const day = $('#front_filter_day').val() || 'all';
        const startDate = $('#front_filter_start_date_gregorian').val() || '';
        const endDate = $('#front_filter_end_date_gregorian').val() || '';
        
        // 👈 تعریف صحیح متغیرها
        const clientName = $('#front_filter_client_name').val() || ''; 
        const clientId = $('#front_filter_client_id').val() || 0; 

        const $tbody = $('#front_calendar_body');
        const $pagination = $('#front_calendar_pagination');
        
        $tbody.html('<tr><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> در حال بارگذاری...</td></tr>');

        $.post(TB_Front.ajaxurl, {
            action: 'tb_front_get_calendar_table',
            security: TB_Front.nonce,
            therapist_id: TB_Front.t_id,
            per_page: perPage,
            paged: window.frontCalendarPage,
            status: status,
            area: area,
            day: day,
            start_date: startDate,
            end_date: endDate,
            client_name: clientName, // 👈 ارسال به سرور
            client_id: clientId      // 👈 ارسال به سرور
        }).done(function(res) {
            if (res.success) {
                $tbody.empty();
                $pagination.empty();

                if (res.data.items.length === 0) {
                    $tbody.html('<tr><td colspan="7" class="text-center text-muted py-4">هیچ جلسه‌ای یافت نشد.</td></tr>');
                    return;
                }

                let counter = (window.frontCalendarPage - 1) * perPage + 1;

                res.data.items.forEach(item => {
                    const dtParts = item.start_datetime.split(' ');
                    const dParts = dtParts[0].split('-');
                    const tParts = dtParts[1].split(':');

                    const gy = parseInt(dParts[0], 10);
                    const gm = parseInt(dParts[1], 10);
                    const gd = parseInt(dParts[2], 10);
                    const jDate = gregorianToJalali(gy, gm, gd);
                    const dateStr = jDate[0] + '/' + (jDate[1] < 10 ? '0' + jDate[1] : jDate[1]) + '/' + (jDate[2] < 10 ? '0' + jDate[2] : jDate[2]);
                    
                    const dateObj = new Date(gy, gm - 1, gd);
                    const daysName = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
                    const dayName = daysName[dateObj.getDay()];
                    
                    const timeStr = tParts[0] + ':' + tParts[1];

                    let statusHtml = '';
                    let actionBtns = '';
                    let rowClass = '';

                    if (item.status === 'available') {
                        statusHtml = `<span class="tc-status-badge tc-status-available"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> آزاد</span>`;
                        actionBtns = `<button class="tb-action-btn tb-btn-delete tb-btn-delete-front" data-id="${item.id}" title="حذف تایم آزاد"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>`;
                    } else if (item.status === 'frozen') {
                        statusHtml = `<span class="tc-status-badge tc-status-frozen"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> در حال پرداخت</span>`;
                        actionBtns = `<button class="tb-action-btn tb-btn-lock" title="قفل شده"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg></button>`;
                    } else if (item.status === 'booked') {
                        statusHtml = `
                            <span class="tc-status-badge tc-status-booked"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> رزرو قطعی</span>
                            <div class="tc-client-info">
                                <span>${item.client_first_name} ${item.client_last_name}</span>
                            </div>
                        `;
                        actionBtns = `<button class="tb-action-btn tb-btn-lock" title="قفل شده"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" /></svg></button>`;
                        
                        if (item.channel_nature === 'online') {
                            actionBtns = `
                                <a href="${item.meet_link || '#'}" class="tc-btn-meet ${item.meet_link ? '' : 'disabled'}" target="_blank" data-start="${item.start_datetime}" data-duration="${item.duration}" style="width: auto; padding: 6px 10px;">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9a2.25 2.25 0 00-2.25-2.25h-9A2.25 2.25 0 002.25 7.5v9a2.25 2.25 0 002.25 2.25z" /></svg>
                                </a>
                            ` + actionBtns;
                        }
                    } else if (item.status === 'completed') {
                        statusHtml = `<span class="tc-status-badge tc-status-available" style="background:#f0fdf4; color:#166534; border-color:#bbf7d0;"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.5 12.75l6 6 9-13.5" /></svg> پایان یافته</span>`;
                        actionBtns = `<span class="text-muted tb-nowrap" style="font-size:11px;">بسته شده</span>`;
                    } else if (item.status === 'no_show') {
                        statusHtml = `<span class="tc-status-badge tc-status-noshow"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg> غیبت مراجع</span>`;
                        actionBtns = `<span class="text-muted tb-nowrap" style="font-size:11px;">بسته شده</span>`;
                    } else if (item.status === 'deleted') {
                        rowClass = 'tc-row-deleted';
                        statusHtml = `<span class="tc-status-badge tc-status-deleted"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> حذف شده</span>`;
                        actionBtns = `-`;
                    } else if (item.status === 'cancelled') {
                        rowClass = 'tc-row-deleted';
                        statusHtml = `<span class="tc-status-badge tc-status-cancelled"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> لغو شده</span>`;
                        actionBtns = `-`;
                    }

                    $tbody.append(`
                        <tr class="${rowClass}">
                            <td style="text-align: center;" class="tb-col-code" dir="ltr">${TBCore.toPersianNum(counter++)}</td>
                            <td style="text-align: center;" class="tb-nowrap" dir="ltr">${TBCore.toPersianNum(dateStr)}</td>
                            <td style="text-align: center;">${dayName}</td>
                            <td style="text-align: center;" class="tb-nowrap fw-bold" dir="ltr">${TBCore.toPersianNum(timeStr)}</td>
                            <td style="text-align: center;" class="tb-nowrap">${item.area_name} | ${item.channel_name} (${TBCore.toPersianNum(item.duration)} دقیقه)</td>
                            <td style="text-align: center;">${statusHtml}</td>
                            <td><div class="tb-action-btns">${actionBtns}</div></td>
                        </tr>
                    `);
                });

                renderSmartPagination(res.data.total_pages, window.frontCalendarPage, $pagination);
                
                if (typeof window.checkSessionTimers === 'function') window.checkSessionTimers();
            }
        }).fail(function(xhr) {
            $tbody.html('<tr><td colspan="7" class="text-center text-danger py-4">خطای سرور در دریافت جدول.</td></tr>');
        });
    };
    // ==========================================
    // ۷. رویدادهای کلیک (Global Event Delegation)
    // ==========================================
    
    $(document).off('click', '.tb-date-picker').on('click', '.tb-date-picker', function(e) {
        e.preventDefault();
        const allowPast = $(this).attr('data-allow-past') === 'true';
        window.TBCalendar.open(this, $(this).data('gregorian'), allowPast);
    });

    $(document).off('click', '#front_btn_search').on('click', '#front_btn_search', function() { 
        window.frontCalendarPage = 1; 
        window.loadFrontCalendarTable(); 
        
        const $container = $('.tb-app-content-area');
        const $target = $('#front_calendar_body').closest('.tb-shape-box');
        
        if ($container.length && $target.length) {
            $container.animate({
                scrollTop: $container.scrollTop() + $target.position().top - 20
            }, 500);
        }
    });
    $(document).off('change', '#front_per_page').on('change', '#front_per_page', function() { window.frontCalendarPage = 1; window.loadFrontCalendarTable(); });
    $(document).off('click', '#front_calendar_pagination .tb-page-btn').on('click', '#front_calendar_pagination .tb-page-btn', function() {
        if ($(this).hasClass('disabled')) return;
        window.frontCalendarPage = $(this).data('page');
        window.loadFrontCalendarTable();
    });
$(document).off('click', '#front_btn_clear_filters').on('click', '#front_btn_clear_filters', function() {
        $('#front_filter_status, #front_filter_area, #front_filter_day').val('all').trigger('change');
       $('#front_filter_start_date, #front_filter_start_date_gregorian, #front_filter_end_date, #front_filter_end_date_gregorian').val('');
        $('#front_filter_client_name').val('').prop('disabled', false);
        $('#front_filter_client_id').val(''); // 👈 خالی کردن ID
        $('#front_filter_client_clear').hide();
        
        TBCore.renderCustomSelect($('#front_filter_status'));
        TBCore.renderCustomSelect($('#front_filter_area'));
        TBCore.renderCustomSelect($('#front_filter_day'));
        window.frontCalendarPage = 1;
        window.loadFrontCalendarTable();
    });

    $(document).off('click', '#btn_front_add_single').on('click', '#btn_front_add_single', function() {
        $('.tb-inline-error').remove();
        $('#front_single_errors_box').hide();
        let generalErrors = [];

        const areaId = $('#front_sel_area').val();
        const date = $('#front_single_date_gregorian').val();
        const time = TBCore.toEnglishNum($('#front_single_time').val());
        const buffer = TBCore.toEnglishNum($('#front_single_buffer').val());

        const isMobile = $(window).width() <= 768;

        if (!areaId) { generalErrors.push('حوزه درمانی را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#front_sel_area'), 'حوزه درمانی را انتخاب کنید.'); }
        if (!date) { generalErrors.push('تاریخ جلسه را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#front_single_date'), 'تاریخ جلسه را انتخاب کنید.'); }
        if (!time) { generalErrors.push('ساعت جلسه را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#front_single_time'), 'ساعت جلسه را انتخاب کنید.'); }
        if (buffer === '') { generalErrors.push('زمان استراحت را وارد کنید.'); if(isMobile) TBCore.showInlineError($('#front_single_buffer'), 'زمان استراحت را وارد کنید.'); }

        if (date && time) {
            const selectedDateTime = new Date(date + 'T' + time);
            const now = new Date();
            if (selectedDateTime < now) {
                generalErrors.push('زمان انتخابی گذشته است.');
                if(isMobile) TBCore.showInlineError($('#front_single_time'), 'زمان گذشته است');
            }
        }

        if (generalErrors.length > 0) {
            if (!isMobile) {
                let errHtml = '<ul>';
                generalErrors.forEach(e => errHtml += `<li>${e}</li>`);
                errHtml += '</ul>';
                $('#front_single_errors_box').html(errHtml).slideDown();
            }
            return; 
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال ثبت...');

        $.post(TB_Front.ajaxurl, {
            action: 'tb_add_single_session',
            security: TB_Front.admin_nonce,
            therapist_id: TB_Front.t_id,
            area_id: areaId,
            date: date,
            time: time,
            buffer: buffer
        }).done(function(res) {
            $btn.prop('disabled', false).text('ثبت تکی');
            if (res.success) {
                $('#front_single_date, #front_single_date_gregorian, #front_single_time').val('');
                window.frontCalendarPage = 1;
                window.loadFrontCalendarTable();
                
                if ($(window).width() <= 768) {
                    const $container = $('.tb-app-content-area');
                    const $target = $('#front_calendar_body').closest('.tb-shape-box');
                    
                    if ($container.length && $target.length) {
                        $container.animate({
                            scrollTop: $container.scrollTop() + $target.position().top - 20
                        }, 500);
                    }
                }
            } else {
                if (res.data && res.data.type === 'conflict_with_suggestion') {
                    $('#tc_suggested_time_display').text(TBCore.toPersianNum(res.data.suggested_time));
                    $('#tc_suggested_time_val').val(res.data.suggested_time);
                    $('#tc_suggestion_target_input').val('front_single_time');
                    $('#tc-suggestion-modal').css('display', 'flex');
                } else {
                    let errorMsg = typeof res.data === 'object' ? (res.data.message || 'خطای نامشخص') : res.data;
                    TBCore.showAlertModal(errorMsg);
                }
            }
        }).fail(function(xhr) {
            $btn.prop('disabled', false).text('ثبت تکی');
            alert("خطای سرور در ثبت تایم:\n\n" + xhr.responseText);
        });
    });

    $('#btn_apply_suggestion').on('click', function() {
        const suggestedTime = $('#tc_suggested_time_val').val();
        const targetInputId = $('#tc_suggestion_target_input').val();
        
        $('#' + targetInputId).val(TBCore.toPersianNum(suggestedTime));
        $('#tc-suggestion-modal').fadeOut(200);
        $('#' + targetInputId).closest('.position-relative').find('.tb-inline-error').remove();
    });

    const weekDays = [
        { id: 6, name: 'شنبه' }, { id: 0, name: 'یکشنبه' }, { id: 1, name: 'دوشنبه' },
        { id: 2, name: 'سه‌شنبه' }, { id: 3, name: 'چهارشنبه' }, { id: 4, name: 'پنج‌شنبه' }, { id: 5, name: 'جمعه' }
    ];

    $(document).off('click', '#btn_front_open_batch').on('click', '#btn_front_open_batch', function(e) {
        e.preventDefault();
        
        $('#front-batch-modal .tb-bs-body > div:not(.tb-batch-report-container)').show();
        $('#front-batch-modal .tb-batch-report-container').remove();
        $('#front-batch-modal .tb-bs-footer').html('<button id="btn_front_submit_batch" class="tb-btn-primary w-100">تولید و ثبت تایم‌ها</button>');

        $('#front_batch_area').val('').trigger('change');
        TBCore.renderCustomSelect($('#front_batch_area'));
        $('#front_batch_start_date, #front_batch_start_date_gregorian, #front_batch_end_date, #front_batch_end_date_gregorian').val('');
        $('#front_batch_errors_box').hide();
        $('.tb-inline-error').remove();
        
        const $container = $('.front-weekdays-container');
        $container.empty();

        weekDays.forEach(day => {
            $container.append(`
                <div class="tc-weekday-row">
                    <div class="tc-weekday-checkbox">
                        <label class="form-check-label d-flex align-items-center gap-2" style="font-size:13px; font-weight:bold; cursor:pointer;">
                            <input class="form-check-input front-day-check" type="checkbox" value="${day.id}">
                            ${day.name}
                        </label>
                    </div>
                    <div class="tc-weekday-times" id="front_times_${day.id}">
                        <div class="tc-time-input-wrapper position-relative">
                            <input type="text" class="form-control front-time-start tb-clock-picker tb-white-readonly" dir="ltr" placeholder="انتخاب" readonly inputmode="none">
                        </div>
                        <span class="text-muted">تا</span>
                        <div class="tc-time-input-wrapper position-relative">
                            <input type="text" class="form-control front-time-end tb-clock-picker tb-white-readonly" dir="ltr" placeholder="انتخاب" readonly inputmode="none">
                        </div>
                    </div>
                </div>
            `);
        });
        
        if (typeof TBCore !== 'undefined' && TBCore.PremiumTimePicker) {
            new TBCore.PremiumTimePicker('.tb-clock-picker');
        }

        $('#front-batch-modal').addClass('active');
        $('body').css('overflow', 'hidden');
    });

    function closeBatchModal() {
        $('#front-batch-modal').removeClass('active');
        $('body').css('overflow', '');
    }

    $(document).off('click', '#btn_close_batch_modal').on('click', '#btn_close_batch_modal', closeBatchModal);
    $(document).off('click', '#front-batch-modal').on('click', '#front-batch-modal', function(e) {
        if (e.target === this) closeBatchModal();
    });

    $(document).off('change', '.front-day-check').on('change', '.front-day-check', function() {
        const dayId = $(this).val();
        if ($(this).is(':checked')) {
            $(`#front_times_${dayId}`).addClass('active');
        } else {
            $(`#front_times_${dayId}`).removeClass('active');
            $(`#front_times_${dayId} input`).val('');
            $(`#front_times_${dayId}`).find('.tb-inline-error').remove();
        }
    });

    $(document).off('click', '#btn_front_submit_batch').on('click', '#btn_front_submit_batch', function() {
        $('.tb-inline-error').remove();
        let generalErrors = [];
        let weekdayError = false;

        const areaId = $('#front_batch_area').val();
        const startDate = $('#front_batch_start_date_gregorian').val();
        const endDate = $('#front_batch_end_date_gregorian').val();
        const buffer = TBCore.toEnglishNum($('#front_batch_buffer').val());

        const isMobile = $(window).width() <= 768;

        if (!areaId) { generalErrors.push('حوزه درمانی را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#front_batch_area'), 'حوزه درمانی را انتخاب کنید.'); }
        if (!startDate) { generalErrors.push('تاریخ شروع را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#front_batch_start_date'), 'تاریخ شروع را انتخاب کنید.'); }
        if (!endDate) { generalErrors.push('تاریخ پایان را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#front_batch_end_date'), 'تاریخ پایان را انتخاب کنید.'); }
        if (buffer === '') { generalErrors.push('زمان استراحت را وارد کنید.'); if(isMobile) TBCore.showInlineError($('#front_batch_buffer'), 'زمان استراحت را وارد کنید.'); }

        let selectedDays = [];
        let daysChecked = false;

        $('.front-day-check:checked').each(function() {
            daysChecked = true;
            const dayId = $(this).val();
            const $startInput = $(`#front_times_${dayId} .front-time-start`);
            const $endInput = $(`#front_times_${dayId} .front-time-end`);
            const startTime = TBCore.toEnglishNum($startInput.val());
            const endTime = TBCore.toEnglishNum($endInput.val());

            if (!startTime) { generalErrors.push(`ساعت شروع برای روز ${weekDays.find(d=>d.id==dayId).name} الزامی است.`); if(isMobile) TBCore.showInlineError($startInput, '* ساعت شروع الزامی است'); }
            if (!endTime) { generalErrors.push(`ساعت پایان برای روز ${weekDays.find(d=>d.id==dayId).name} الزامی است.`); if(isMobile) TBCore.showInlineError($endInput, '* ساعت پایان الزامی است'); }

            if (startTime && endTime) {
                const startParts = startTime.split(':');
                const endParts = endTime.split(':');
                const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
                const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);

                if (startMinutes >= endMinutes) {
                    generalErrors.push(`ساعت پایان برای روز ${weekDays.find(d=>d.id==dayId).name} باید بیشتر از ساعت شروع باشد.`);
                    const $dayLabelContainer = $(`#front_times_${dayId}`).closest('.tc-weekday-row').find('.tc-weekday-checkbox');
                    if(isMobile) TBCore.showInlineError($dayLabelContainer, 'ساعت پایان باید بیشتر از ساعت شروع باشد.');
                } else {
                    selectedDays.push({ day: dayId, start: startTime, end: endTime });
                }
            }
        });

        if (!daysChecked) {
            weekdayError = true;
            generalErrors.push('حداقل یک روز هفته را انتخاب کنید.');
            if(isMobile) TBCore.showInlineError($('.front-weekdays-container'), 'حداقل یک روز هفته را انتخاب کنید.');
        }

        if (generalErrors.length > 0 || weekdayError) {
            if (generalErrors.length > 0 && !isMobile) {
                let errHtml = '<ul>';
                generalErrors.forEach(e => errHtml += `<li>${e}</li>`);
                errHtml += '</ul>';
                $('#front_batch_errors_box').html(errHtml).slideDown();
            }
            $('#front-batch-modal .tb-bs-body').animate({ scrollTop: 0 }, 300);
            return; 
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال پردازش...');

        $.post(TB_Front.ajaxurl, {
            action: 'tb_add_batch_sessions',
            security: TB_Front.admin_nonce,
            therapist_id: TB_Front.t_id,
            area_id: areaId,
            start_date: startDate,
            end_date: endDate,
            week_days_data: JSON.stringify(selectedDays),
            buffer: buffer
        }).done(function(res) {
            if (res.success) {
                const data = res.data;
                let reportHtml = '<div class="tb-batch-report-container">';
                
                if (data.generated > 0) {
                    reportHtml += `
                        <div class="tb-report-success">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            <h4>عملیات با موفقیت انجام شد</h4>
                            <p>تعداد <strong>${TBCore.toPersianNum(data.generated)}</strong> تایم آزاد در تقویم ثبت گردید.</p>
                        </div>
                    `;
                }

                if (data.skipped_slots && data.skipped_slots.length > 0) {
                    const marginTopClass = data.generated > 0 ? 'mt-4' : '';
                    reportHtml += `
                        <div class="tb-report-warning ${marginTopClass}">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <h4>تعداد ${TBCore.toPersianNum(data.skipped_slots.length)} تایم نادیده گرفته شد</h4>
                            <p style="margin-bottom: 15px; font-size: 14px;">به دلیل تداخل با جلسات قبلی یا تقویم گوگل:</p>
                            <ul class="tb-skipped-list">
                    `;
                    data.skipped_slots.forEach(slot => {
                        const parts = slot.split(' ');
                        const dateParts = parts[0].split('-');
                        const jDate = gregorianToJalali(parseInt(dateParts[0]), parseInt(dateParts[1]), parseInt(dateParts[2]));
                        const jDateStr = jDate[0] + '/' + (jDate[1]<10?'0'+jDate[1]:jDate[1]) + '/' + (jDate[2]<10?'0'+jDate[2]:jDate[2]);
                        reportHtml += `<li>تاریخ ${TBCore.toPersianNum(jDateStr)} - ساعت ${TBCore.toPersianNum(parts[1])}</li>`;
                    });
                    reportHtml += `</ul></div>`;
                }

                reportHtml += `</div>`;

                $('#front-batch-modal .tb-bs-body > div').hide();
                $('#front-batch-modal .tb-bs-body').append(reportHtml);
                $('#front-batch-modal .tb-bs-footer').html(`<button id="btn_close_batch_report" class="tb-btn-primary w-100">متوجه شدم</button>`);
                
                $('#front-batch-modal .tb-bs-body').animate({ scrollTop: 0 }, 300);

                window.frontCalendarPage = 1;
                window.loadFrontCalendarTable();
            } else {
                $btn.prop('disabled', false).text('تولید و ثبت تایم‌ها');
                $('#tb-alert-modal').css('z-index', '10000000');
                TBCore.showAlertModal(res.data.message || res.data);
            }
        }).fail(function(xhr) {
            $btn.prop('disabled', false).text('تولید و ثبت تایم‌ها');
            alert("خطای سرور در تولید انبوه:\n\n" + xhr.responseText);
        });
    });

    $(document).off('click', '#btn_close_batch_report').on('click', '#btn_close_batch_report', function() {
        closeBatchModal();
    });

   $(document).off('click', '.tb-btn-delete-front').on('click', '.tb-btn-delete-front', function() {
        const id = $(this).data('id');
        // پیدا کردن تاریخ و ساعت از ردیف جدول
        const $row = $(this).closest('tr');
        const date = $row.find('td:eq(1)').text().trim();
        const time = $row.find('td:eq(3)').text().trim();
        
        TBCore.showConfirmModal(`آیا از حذف تایم آزاد <strong>${date} ساعت ${time}</strong> مطمئن هستید؟`, 'بله، حذف شود', 'tb-btn-danger', function() {
            $.post(TB_Front.ajaxurl, {
                action: 'tb_delete_session',
                security: TB_Front.admin_nonce,
                session_id: id
            }).done(function(res) {
                if (res.success) {
                    window.loadFrontCalendarTable();
                } else {
                    TBCore.showAlertModal(res.data);
                }
            });
        });
    });

    $(document).off('click', '.tb-btn-lock').on('click', '.tb-btn-lock', function() {
        TBCore.showAlertModal('این تایم توسط مراجع رزرو شده یا در حال پرداخت است. جهت لغو یا جابجایی، لطفاً با مدیریت کلینیک هماهنگ کنید.');
    });
    
    $(document).off('click', '.tb-modal-close').on('click', '.tb-modal-close', function(e) {
        e.preventDefault();
        $(this).closest('.tb-modal-overlay').fadeOut(200);
    });
 
    // ==========================================
    // ۸. کارتابل تعیین تکلیف (Resolution Center)
    // ==========================================
    
    function checkPendingResolutions() {
        if (!TB_Front.t_id) return;
        
        $.post(TB_Front.ajaxurl, {
            action: 'tb_front_get_pending_resolutions',
            security: TB_Front.nonce
        }).done(function(res) {
            if (res.success && res.data.length > 0) {
                $('#front_pending_count').text(TBCore.toPersianNum(res.data.length));
                $('#front_pending_resolution_alert').css('display', 'flex');
                
                const $tbody = $('#front_resolution_table_body');
                $tbody.empty();
                
                res.data.forEach(item => {
                    const dtParts = item.start_datetime.split(' ');
                    const dParts = dtParts[0].split('-');
                    const tParts = dtParts[1].split(':');
                    const jDate = gregorianToJalali(parseInt(dParts[0]), parseInt(dParts[1]), parseInt(dParts[2]));
                    const dateStr = jDate[0] + '/' + (jDate[1] < 10 ? '0' + jDate[1] : jDate[1]) + '/' + (jDate[2] < 10 ? '0' + jDate[2] : jDate[2]);
                    const timeStr = tParts[0] + ':' + tParts[1];

                    $tbody.append(`
                        <tr>
                            <td style="text-align: center;" dir="ltr">
                                <div style="font-weight:bold;">${TBCore.toPersianNum(dateStr)}</div>
                                <div style="color:var(--tb-subtitle);">${TBCore.toPersianNum(timeStr)}</div>
                            </td>
                            <td style="text-align: right; font-weight:bold;">${item.client_first_name} ${item.client_last_name}</td>
                            <td style="text-align: center;">${item.area_name} | ${item.channel_name}</td>
<td style="text-align: center;">
                                <div style="display:flex; gap:5px; justify-content:center; flex-wrap: nowrap;">
                                    <!-- 👈 اضافه شدن data-name و data-datetime به دکمه‌های کارتابل -->
                                    <button class="tb-btn-success tb-btn-resolve" data-id="${item.id}" data-status="completed" data-name="${item.client_first_name} ${item.client_last_name}" data-datetime="${TBCore.toPersianNum(dateStr)} ساعت ${TBCore.toPersianNum(timeStr)}" style="padding:6px 10px; font-size:11px; white-space: nowrap;">پایان جلسه</button>
                                    <button class="tb-btn-danger tb-btn-resolve" data-id="${item.id}" data-status="no_show" data-name="${item.client_first_name} ${item.client_last_name}" data-datetime="${TBCore.toPersianNum(dateStr)} ساعت ${TBCore.toPersianNum(timeStr)}" style="padding:6px 10px; font-size:11px; background:#1A1D21; white-space: nowrap;">غیبت مراجع</button>
                                </div>
                            </td>
                        </tr>
                    `);
                });
            } else {
                $('#front_pending_resolution_alert').hide();
            }
        });
    }


// 👈 حل قطعی باگ آپدیت نشدن جدول امروز و ویجت آمار پس از تعیین تکلیف
    $(document).on('click', '.tb-btn-resolve', function() {
        const id = $(this).data('id');
        const status = $(this).data('status');
        const name = $(this).attr('data-name') || 'این مراجع';
        const datetime = $(this).attr('data-datetime') || '';
        
        const msg = status === 'completed' 
            ? `آیا از پایان یافتن جلسه <strong>${name}</strong> در تاریخ ${datetime} اطمینان دارید؟ مبلغ در سیستم حسابداری تثبیت می‌شود.` 
            : `آیا مطمئن هستید <strong>${name}</strong> در تاریخ ${datetime} حاضر نشده است؟ مبلغ به عنوان جریمه ضبط می‌شود.`;
            
        const btnClass = status === 'completed' ? 'tb-btn-success' : 'tb-btn-danger';
        const btnText = status === 'completed' ? 'بله، پایان جلسه' : 'بله، ثبت غیبت';
        
        const $btn = $(this);

        $('#tb-confirm-modal').css('z-index', '100010');

        TBCore.showConfirmModal(msg, btnText, btnClass, function() {
            $btn.prop('disabled', true).text('...');
            
            const ajaxAction = typeof TB_Front !== 'undefined' ? 'tb_front_resolve_session_status' : 'tb_resolve_session_status';
            const securityNonce = typeof TB_Front !== 'undefined' ? TB_Front.nonce : TB_Admin.nonce;
            const ajaxUrl = typeof TB_Front !== 'undefined' ? TB_Front.ajaxurl : TB_Admin.ajaxurl;

            $.post(ajaxUrl, {
                action: ajaxAction,
                security: securityNonce,
                session_id: id,
                status: status
            }).done(function(res) {
                if (res.success) {
                    // ۱. حذف ردیف از پاپ‌آپ کارتابل
                    $btn.closest('tr').fadeOut(300, function() { 
                        $(this).remove(); 
                        if ($('#front_resolution_table_body tr').length === 0) {
                            $('#front-resolution-modal').fadeOut(200);
                        }
                    });
                    
                    // ۲. پیدا کردن همین جلسه در جدول "برنامه کاری امروز" و حذف آن
                    const $todayRow = $('.tb-btn-complete-session[data-id="'+id+'"]').closest('tr');
                    if ($todayRow.length) {
                        $todayRow.fadeOut(300, function() {
                            $(this).remove();
                            
                            // 👈 ۳. آپدیت زنده عدد ویجت "کل جلسات امروز"
                            const $statNumber = $('.tb-stat-number');
                            if ($statNumber.length) {
                                // خواندن عدد فعلی (با حذف کلمه "جلسه" و تبدیل به انگلیسی)
                                let currentText = $statNumber.text().replace('جلسه', '').trim();
                                let currentCount = parseInt(TBCore.toEnglishNum(currentText)) || 0;
                                
                                if (currentCount > 0) {
                                    currentCount--;
                                    // نوشتن عدد جدید با فرمت فارسی
                                    $statNumber.html(`${TBCore.toPersianNum(currentCount)} <span>جلسه</span>`);
                                }
                            }
                        });
                    }
                    
                    // ۴. آپدیت کردن عدد روی نوار هشدار قرمز رنگ
                    if (typeof checkPendingResolutions === 'function') checkPendingResolutions();
                    
                } else {
                    $btn.prop('disabled', false);
                    TBCore.showAlertModal(res.data);
                }
            }).fail(function() {
                $btn.prop('disabled', false);
                TBCore.showAlertModal('خطا در ارتباط با سرور.');
            });
        });
    });
    
    // ==========================================
    // ۱۱. 👈 مدیریت جدول جلسات آینده (در داشبورد)
    // ==========================================
    window.frontFuturePage = 1;

    window.loadFrontFutureTable = function() {
        if (!TB_Front.t_id) return;

        const perPage = $('#front_future_per_page').val() || 10;
        const $tbody = $('#front_future_calendar_body');
        const $pagination = $('#front_future_pagination');
        
        $tbody.html('<tr><td colspan="8" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> در حال بارگذاری...</td></tr>');

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + String(tomorrow.getDate()).padStart(2, '0');

        $.post(TB_Front.ajaxurl, {
            action: 'tb_front_get_calendar_table',
            security: TB_Front.nonce,
            therapist_id: TB_Front.t_id,
            per_page: perPage,
            paged: window.frontFuturePage,
            status: 'booked', 
            start_date: tomorrowStr 
        }).done(function(res) {
            if (res.success) {
                $tbody.empty();
                $pagination.empty();

                if (res.data.items.length === 0) {
                    $tbody.html('<tr><td colspan="8" class="text-center text-muted py-4">جلسه‌ای برای روزهای آینده رزرو نشده است.</td></tr>');
                    return;
                }

                let counter = (window.frontFuturePage - 1) * perPage + 1;

                res.data.items.forEach(item => {
                    const dtParts = item.start_datetime.split(' ');
                    const dParts = dtParts[0].split('-');
                    const tParts = dtParts[1].split(':');

                    const gy = parseInt(dParts[0], 10);
                    const gm = parseInt(dParts[1], 10);
                    const gd = parseInt(dParts[2], 10);
                    const jDate = gregorianToJalali(gy, gm, gd);
                    const dateStr = jDate[0] + '/' + (jDate[1] < 10 ? '0' + jDate[1] : jDate[1]) + '/' + (jDate[2] < 10 ? '0' + jDate[2] : jDate[2]);
                    
                    const dateObj = new Date(gy, gm - 1, gd);
                    const daysName = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];
                    const dayName = daysName[dateObj.getDay()];
                    
                    const timeStr = tParts[0] + ':' + tParts[1];

                    $tbody.append(`
                        <tr>
                            <td style="text-align: center;" dir="ltr">${TBCore.toPersianNum(counter++)}</td>
                            <td style="text-align: center;" dir="ltr">
                                <div style="font-weight: bold; color: var(--tb-dark-text);">${TBCore.toPersianNum(dateStr)}</div>
                            </td>
                            <td style="text-align: center;">${dayName}</td>
                            <td style="text-align: center; font-weight: bold;" dir="ltr">${TBCore.toPersianNum(timeStr)}</td>
                            <td style="text-align: right; font-weight: bold;">${item.client_first_name} ${item.client_last_name}</td>
                            <td style="text-align: center; font-weight: bold; color: var(--tb-subtitle);" dir="ltr">${TBCore.toPersianNum(item.client_mobile)}</td>
                            <td style="text-align: center;" class="tb-nowrap">${item.area_name} | <span class="tb-chip-role tb-chip-role-t">${item.channel_name}</span> (${TBCore.toPersianNum(item.duration)} دقیقه)</td>
                            <td style="text-align: center;">
                                <span class="tc-status-badge tc-status-booked">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width: 14px; height: 14px;"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> رزرو قطعی
                                </span>
                            </td>
                        </tr>
                    `);
                });

                renderSmartPagination(res.data.total_pages, window.frontFuturePage, $pagination);
            }
        });
    };

    $(document).off('change', '#front_future_per_page').on('change', '#front_future_per_page', function() { 
        window.frontFuturePage = 1; 
        window.loadFrontFutureTable(); 
    });
    
    $(document).off('click', '#front_future_pagination .tb-page-btn').on('click', '#front_future_pagination .tb-page-btn', function() {
        if ($(this).hasClass('disabled')) return;
        window.frontFuturePage = $(this).data('page');
        window.loadFrontFutureTable();
    });
    
    // ==========================================
    // 👈 حل قطعی و نهایی باز شدن پاپ‌آپ کارتابل
    // ==========================================
    $(document).on('click', '.tb-btn-resolution-trigger', function(e) {
        e.preventDefault();
        e.stopPropagation(); // جلوگیری از تداخل با رویدادهای دیگر
        
        // پیدا کردن مودال و نمایش آن با بالاترین z-index ممکن
        const $modal = $('#front-resolution-modal');
        if ($modal.length) {
            $modal.css({
                'display': 'flex',
                'z-index': '10000000'
            });
        } else {
            TBCore.showAlertModal('خطا: پنجره کارتابل در صفحه یافت نشد.');
        }
    });
    
// ==========================================
    // ۱۲. 👈 جستجوی ایجکس مراجعین در فیلتر تقویم (نسخه قطعی SPA)
    // ==========================================
    let clientSearchTimeout;
    
    // 👈 استفاده از document.on برای فیلدی که با ایجکس لود می‌شود
    $(document).off('input', '#front_filter_client_name').on('input', '#front_filter_client_name', function() {
        clearTimeout(clientSearchTimeout);
        const val = $(this).val().replace(/[^آ-ی\s\u200C0-9۰-۹]/g, '');
        $(this).val(TBCore.toPersianNum(val));
        
        const $results = $('#front_client_search_results');
        
        if (val !== '') $('#front_filter_client_clear').show();
        else {
            $('#front_filter_client_clear').hide();
            $results.slideUp(150);
            $('#front_filter_client_id').val('');
            return;
        }

        if (val.length < 3) return;

        clientSearchTimeout = setTimeout(() => {
            $results.html('<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm"></span> در حال جستجو...</div>').show();
            
            $.post(TB_Front.ajaxurl, {
                action: 'tb_front_search_therapist_clients',
                security: TB_Front.nonce,
                therapist_id: TB_Front.t_id,
                search: val
            }).done(function(res) {
                if (res.success) {
                    $results.empty();
                    if (res.data.length === 0) {
                        $results.html('<div class="p-3 text-center text-muted">مراجعی یافت نشد.</div>');
                        return;
                    }
                    res.data.forEach(user => {
                        $results.append(`<div class="tb-autocomplete-item tc-client-filter-item" data-id="${user.ID}" data-name="${user.first_name} ${user.last_name}" data-mobile="${user.mobile}">${user.first_name} ${user.last_name} (${TBCore.toPersianNum(user.mobile)})</div>`);
                    });
                }
            });
        }, 500);
    });

    $(document).off('click', '.tc-client-filter-item').on('click', '.tc-client-filter-item', function() {
        const userId = $(this).data('id');
        const name = $(this).data('name');
        const mobile = $(this).data('mobile');

        $('#front_filter_client_id').val(userId);
        $('#front_filter_client_name').val(name + ' (' + TBCore.toPersianNum(mobile) + ')').prop('disabled', true);
        $('#front_client_search_results').slideUp(150);
        
        window.frontCalendarPage = 1;
        window.loadFrontCalendarTable();
    });

    // 👈 استفاده از document.on برای دکمه پاک کردن
    $(document).off('click', '#front_filter_client_clear').on('click', '#front_filter_client_clear', function(e) {
        e.preventDefault();
        $('#front_filter_client_name').val('').prop('disabled', false);
        $('#front_filter_client_id').val('');
        $(this).hide();
        $('#front_client_search_results').slideUp(150);
        
        window.frontCalendarPage = 1;
        window.loadFrontCalendarTable();
    });
    
});