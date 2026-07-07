jQuery(document).ready(function($) {
    
    let calendarPage = 1;
    let currentTherapistId = 0;

    // ==========================================
    // ۰. توابع کمکی و تقویم شمسی اختصاصی
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

    const TBCalendar = (function() {
        const months = ["فروردین", "اردیبهشت", "خرداد", "تیر", "مرداد", "شهریور", "مهر", "آبان", "آذر", "دی", "بهمن", "اسفند"];
        let currentJYear, currentJMonth, todayJYear, todayJMonth, todayJDay;
        let targetInput = null;
        let targetHidden = null;
        let allowPastDates = false; // 👈 متغیر یکپارچه و قطعی

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
                    
                    // 👈 اعمال شرط قطعی: اگر allowPastDates فالس بود، گذشته را قفل کن
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

                // 👈 خواندن قطعی ویژگی از HTML
                allowPastDates = (targetInput.attr('data-allow-past') === 'true');

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

    $(document).on('click', '.tb-date-picker', function(e) {
        e.preventDefault();
        TBCalendar.open(this, $(this).data('gregorian'));
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
        calendarPage = 1;
        $('#tc_filter_status').val('all');
        $('#tc_filter_area').val('all');
        $('#tc_filter_day').val('all');
        $('#tc_filter_start_date, #tc_filter_start_date_gregorian, #tc_filter_end_date, #tc_filter_end_date_gregorian').val('');
        
        if(typeof TBCore !== 'undefined' && TBCore.renderCustomSelect) {
            TBCore.renderCustomSelect($('#tc_filter_status'));
            TBCore.renderCustomSelect($('#tc_filter_area'));
            TBCore.renderCustomSelect($('#tc_filter_day'));
        }
        
        loadCalendarTable();
        checkPendingResolutions();
    }

    // ==========================================
    // ۳. جستجوی زنده درمانگر و لود خودکار
    // ==========================================
    let searchCalendarTimeout;
    $('#tb-search-calendar-therapist').on('input', function() {
        clearTimeout(searchCalendarTimeout);
        const val = $(this).val().replace(/[^آ-ی\s\u200C0-9۰-۹]/g, '');
        $(this).val(TBCore.toPersianNum(val));
        
        const $results = $('#tb-calendar-search-results');
        
        if (val !== '') $('#tb-search-calendar-clear').show();
        else {
            $('#tb-search-calendar-clear').hide();
            $results.slideUp(150);
            return;
        }

        if (val.length < 3) return;

        searchCalendarTimeout = setTimeout(() => {
            $results.html('<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm"></span> در حال جستجو...</div>').show();
            
            $('html, body').animate({ scrollTop: $('#tb-search-calendar-wrapper').offset().top - 50 }, 300);

            $.post(TB_Admin.ajaxurl, {
                action: 'tb_get_therapists_list',
                security: TB_Admin.nonce,
                search: val,
                per_page: 10,
                paged: 1
            }).done(function(res) {
                if (res.success) {
                    $results.empty();
                    if (res.data.items.length === 0) {
                        $results.html('<div class="p-3 text-center text-muted">درمانگری یافت نشد.</div>');
                        return;
                    }
                    res.data.items.forEach(item => {
                        $results.append(`<div class="tb-autocomplete-item tc-therapist-item" data-id="${item.user_id}" data-name="${item.first_name} ${item.last_name}" data-mobile="${item.mobile}">${item.first_name} ${item.last_name} (${TBCore.toPersianNum(item.mobile)})</div>`);
                    });
                }
            }).fail(function() {
                $results.html('<div class="p-3 text-center text-danger">خطا در ارتباط با سرور.</div>');
            });
        }, 500);
    });

    $('#tb-search-calendar-clear').on('click', function() {
        $('#tb-search-calendar-therapist').val('').prop('disabled', false);
        $(this).hide();
        $('#tb-calendar-search-results').slideUp(150);
        $('#tb-calendar-full-container').slideUp(300);
        currentTherapistId = 0;
        
        $('#tc_sel_area').val('').trigger('change');
        $('#tc_single_date, #tc_single_date_gregorian, #tc_single_time').val('');
        $('.tb-inline-error').remove();
    });

    $(document).on('click', '.tc-therapist-item', function() {
        const userId = $(this).data('id');
        const name = $(this).data('name');
        const mobile = $(this).data('mobile');

        $('#tb-search-calendar-therapist').val(name + ' (' + TBCore.toPersianNum(mobile) + ')').prop('disabled', true);
        $('#tb-calendar-search-results').slideUp(150);

        $(document).trigger('tb_auto_load_calendar', [userId]);
    });

    $(document).on('tb_auto_load_calendar', function(e, userId) {
        $('#tb-calendar-search-results').slideUp(150);

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_therapist_data',
            security: TB_Admin.nonce,
            user_id: userId
        }).done(function(res) {
            if (res.success && res.data.therapist) {
                currentTherapistId = res.data.therapist.id;
                $('#tc_therapist_id').val(currentTherapistId);
                checkTherapistStatus(currentTherapistId);
            } else {
                TBCore.showAlertModal('این کاربر به عنوان درمانگر در سیستم ثبت نشده است.');
                $('#tb-search-calendar-clear').click();
            }
        }).fail(function() {
            TBCore.showAlertModal('خطای سرور در دریافت اطلاعات درمانگر.');
            $('#tb-search-calendar-clear').click();
        });
    });

    // ==========================================
    // ۴. بررسی وضعیت درمانگر و لود اطلاعات
    // ==========================================
    function checkTherapistStatus(therapistId) {
        $('#tc_google_status_bar').html('<div class="text-center w-100"><span class="spinner-border spinner-border-sm"></span> در حال بررسی وضعیت...</div>');
        $('#tb-calendar-full-container').slideDown(300);

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_therapist_calendar_status',
            security: TB_Admin.nonce,
            therapist_id: therapistId
        }).done(function(res) {
            if (res.success) {
                renderGoogleStatusBar(res.data);
                
                $('#tc_single_buffer').val(TBCore.toPersianNum(res.data.buffer_time));
                $('#tc_batch_buffer').val(TBCore.toPersianNum(res.data.buffer_time));

                TBCore.initCustomSelect($('#tc_per_page'));
                TBCore.renderCustomSelect($('#tc_per_page'));
                TBCore.initCustomSelect($('#tc_filter_status'));
                TBCore.renderCustomSelect($('#tc_filter_status'));
                TBCore.initCustomSelect($('#tc_filter_day'));
                TBCore.renderCustomSelect($('#tc_filter_day'));

                loadTherapistAreas(therapistId, function() {
                    calendarPage = 1;
                    loadCalendarTable();
                    checkPendingResolutions();
                });

            } else {
                $('#tb-calendar-full-container').hide();
                TBCore.showAlertModal(res.data.message);
                $('#tb-search-calendar-clear').click();
            }
        }).fail(function(xhr) {
            $('#tb-calendar-full-container').hide();
            alert("خطای سرور رخ داد:\n\n" + xhr.responseText);
            $('#tb-search-calendar-clear').click();
        });
    }

    function renderGoogleStatusBar(data) {
        const $bar = $('#tc_google_status_bar');

        if (data.google_connected) {
            $bar.removeClass('disconnected').addClass('connected').html(`
                <div style="display: flex; align-items: center; gap: 15px; width: 100%; flex-wrap: wrap; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 15px; flex-grow: 1; min-width: 200px;">
                        <div style="background: #fff; padding: 10px; border-radius: 50%; width: 40px; height: 40px; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.05); display: flex; align-items: center; justify-content: center;">
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="52 42 88 66" width="24px" height="24px">
                                <path fill="#4285f4" d="M58 108h14V74L52 59v43c0 3.32 2.69 6 6 6"/>
                                <path fill="#34a853" d="M120 108h14c3.32 0 6-2.69 6-6V59l-20 15"/>
                                <path fill="#fbbc04" d="M120 48v26l20-15v-8c0-7.42-8.47-11.65-14.4-7.2"/>
                                <path fill="#ea4335" d="M72 74V48l24 18 24-18v26L96 92"/>
                                <path fill="#c5221f" d="M52 51v8l20 15V48l-5.6-4.2c-5.94-4.45-14.4-.22-14.4 7.2"/>
                            </svg>
                        </div>
                        <div style="flex-grow: 1; overflow: hidden;">
                            <h4 style="margin: 0 0 4px 0; font-size: 14px; color: var(--tb-primary); font-weight: 800;">متصل به تقویم گوگل</h4>
                            <div style="font-size: 12px; color: #0369a1; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" dir="rtl">${data.google_email}</div>
                        </div>
                    </div>
                    <div class="tb-google-status-actions" style="flex-shrink: 0;">
                        <button class="btn btn-sm btn-outline-danger tc-btn-disconnect" style="font-family:IRANYekanX; font-weight:bold; border-radius:8px; font-size: 13px; padding: 6px 10px; margin: 0px 50px 0 0;">قطع اتصال اجباری </button>
                    </div>
                </div>
            `);
            $('#tc_add_form_section').show();
        } else {
            $bar.removeClass('connected').addClass('disconnected').html(`
                <div style="display: flex; align-items: center; gap: 15px; width: 100%; flex-wrap: wrap; justify-content: space-between;">
                    <div style="display: flex; align-items: center; gap: 15px; flex-grow: 1; min-width: 200px;">
                        <div style="flex-shrink: 0;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width: 36px; height: 36px; color: #ea580c;"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                        </div>
                        <div style="flex-grow: 1;">
                            <h4 style="font-size: 14px; font-weight: bold; color: #1A1A1A; margin: 0 0 4px 0;">اکانت گوگل متصل نیست</h4>
                            <div style="font-size: 12px; color: #1A1A1A; margin: 0;">لینک گوگل‌میت تولید نخواهد شد.</div>
                        </div>
                    </div>
                    <div class="tb-google-status-actions" style="flex-shrink: 0;">
                        <button class="btn btn-sm btn-primary tc-btn-remind-google" style="font-family:IRANYekanX; font-weight:bold; border-radius:8px; font-size: 13px; padding: 6px 10px; margin: 0 50px 0 0;"> ارسال پیامک یادآوری</button>
                    </div>
                </div>
            `);
            $('#tc_add_form_section').show();
        }
    }

    $(document).on('click', '.tc-btn-remind-google', function() {
        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال ارسال...');
        setTimeout(() => {
            $btn.prop('disabled', false).text('ارسال پیامک یادآوری');
            TBCore.showAlertModal('پیامک یادآوری اتصال به گوگل با موفقیت برای درمانگر ارسال شد.');
        }, 1000);
    });

    $(document).on('click', '.tc-btn-disconnect', function() {
        TBCore.showConfirmModal('آیا از قطع اتصال اکانت گوگل این درمانگر مطمئن هستید؟', 'بله، قطع شود', 'tb-btn-danger', function() {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_disconnect_google',
                security: TB_Admin.nonce,
                therapist_id: currentTherapistId,
                has_access: false
            }, function(res) {
                if (res.success) checkTherapistStatus(currentTherapistId);
            });
        });
    });

    function loadTherapistAreas(therapistId, callback) {
        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_therapist_areas_dropdown',
            security: TB_Admin.nonce,
            therapist_id: therapistId
        }).done(function(res) {
            if (res.success) {
                const $selSingle = $('#tc_sel_area');
                const $selBatch = $('#tc_batch_area');
                const $selFilter = $('#tc_filter_area');
                
                $selSingle.empty().append('<option value="">انتخاب کنید...</option>');
                $selBatch.empty().append('<option value="">انتخاب کنید...</option>');
                $selFilter.empty().append('<option value="all">همه حوزه‌ها</option>');
                
                res.data.forEach(area => {
                    const text = `${area.area_name} | ${area.channel_name} (${TBCore.toPersianNum(area.duration)} دقیقه)`;
                    const comboValue = `${area.area_id}_${area.channel_id}`;
                    
                    $selSingle.append(`<option value="${comboValue}">${text}</option>`);
                    $selBatch.append(`<option value="${comboValue}">${text}</option>`);
                    $selFilter.append(`<option value="${comboValue}">${text}</option>`);
                });
                
                TBCore.initCustomSelect($selSingle);
                TBCore.renderCustomSelect($selSingle);
                TBCore.initCustomSelect($selBatch);
                TBCore.renderCustomSelect($selBatch);
                TBCore.initCustomSelect($selFilter);
                TBCore.renderCustomSelect($selFilter);

                if (typeof callback === 'function') {
                    callback();
                }
            }
        });
    }

    // ==========================================
    // ۵. ثبت تایم تکی
    // ==========================================
    $(document).on('click', '#btn_add_single_session', function() {
        $('.tb-inline-error').remove();
        $('#tc_single_errors_box').hide();
        let generalErrors = [];

        const areaId = $('#tc_sel_area').val();
        const date = $('#tc_single_date_gregorian').val();
        const time = TBCore.toEnglishNum($('#tc_single_time').val());
        const buffer = TBCore.toEnglishNum($('#tc_single_buffer').val());

        const isMobile = $(window).width() <= 768;

        if (!areaId) { generalErrors.push('حوزه درمانی را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#tc_sel_area'), 'حوزه درمانی را انتخاب کنید.'); }
        if (!date) { generalErrors.push('تاریخ را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#tc_single_date'), 'تاریخ را انتخاب کنید.'); }
        if (!time) { generalErrors.push('ساعت را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#tc_single_time'), 'ساعت را انتخاب کنید.'); }
        if (buffer === '') { generalErrors.push('زمان استراحت را وارد کنید.'); if(isMobile) TBCore.showInlineError($('#tc_single_buffer'), 'زمان استراحت را وارد کنید.'); }

        if (date && time) {
            const selectedDateTime = new Date(date + 'T' + time);
            const now = new Date();
            if (selectedDateTime < now) {
                generalErrors.push('نمی‌توانید برای زمان گذشته نوبت ثبت کنید.');
                if(isMobile) TBCore.showInlineError($('#tc_single_time'), 'زمان گذشته است');
            }
        }

        if (generalErrors.length > 0) {
            if (!isMobile) {
                let errHtml = '<ul>';
                generalErrors.forEach(e => errHtml += `<li>${e}</li>`);
                errHtml += '</ul>';
                $('#tc_single_errors_box').html(errHtml).slideDown();
            }
            return; 
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال ثبت...');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_add_single_session',
            security: TB_Admin.nonce,
            therapist_id: currentTherapistId,
            area_id: areaId,
            date: date,
            time: time,
            buffer: buffer
        }).done(function(res) {
            $btn.prop('disabled', false).text('ثبت تکی');
            if (res.success) {
                $('#tc_single_date').val('');
                $('#tc_single_date_gregorian').val('');
                $('#tc_single_time').val('');
                
                reloadTableAfterAdd();
            } else {
                if (res.data && res.data.type === 'conflict_with_suggestion') {
                    $('#tc_suggested_time_display').text(TBCore.toPersianNum(res.data.suggested_time));
                    $('#tc_suggested_time_val').val(res.data.suggested_time);
                    $('#tc_suggestion_target_input').val('tc_single_time');
                    $('#tc-suggestion-modal').css('display', 'flex');
                } else {
                    if (!isMobile) {
                        $('#tc_single_errors_box').html(`<ul><li>${res.data.message || res.data}</li></ul>`).slideDown();
                    } else {
                        TBCore.showInlineError($('#tc_single_time'), res.data.message || res.data);
                    }
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
        $('#tc_single_errors_box, #tc_batch_errors_box').slideUp();
    });

    // ==========================================
    // ۶. تولید انبوه (Batch Generator)
    // ==========================================
    const weekDays = [
        { id: 6, name: 'شنبه' }, { id: 0, name: 'یکشنبه' }, { id: 1, name: 'دوشنبه' },
        { id: 2, name: 'سه‌شنبه' }, { id: 3, name: 'چهارشنبه' }, { id: 4, name: 'پنج‌شنبه' }, { id: 5, name: 'جمعه' }
    ];

    function resetBatchModal() {
        $('#tc-batch-modal .tb-modal-body > div:not(.tb-batch-report-container)').show();
        $('#tc-batch-modal .tb-batch-report-container').remove();
        $('#tc-batch-modal .tb-modal-footer').html('<button id="btn_submit_batch" class="tb-btn-primary w-100">تولید و ثبت تایم‌ها</button>');

        $('#tc_batch_area').val('').trigger('change');
        TBCore.renderCustomSelect($('#tc_batch_area'));
        $('#tc_batch_start_date, #tc_batch_start_date_gregorian, #tc_batch_end_date, #tc_batch_end_date_gregorian').val('');
        $('#tc_batch_errors_box').hide();
        $('.tb-inline-error').remove();
        
        const $container = $('.tc-weekdays-container');
        $container.empty();

        weekDays.forEach(day => {
            $container.append(`
                <div class="tc-weekday-row">
                    <div class="tc-weekday-checkbox">
                        <label class="form-check-label d-flex align-items-center gap-2" style="font-size:13px; font-weight:bold; cursor:pointer;">
                            <input class="form-check-input tc-day-check" type="checkbox" value="${day.id}">
                            ${day.name}
                        </label>
                    </div>
                    <div class="tc-weekday-times" id="tc_times_${day.id}">
                        <div class="tc-time-input-wrapper position-relative">
                            <input type="text" class="form-control tc-time-start tb-clock-picker tb-white-readonly" dir="ltr" placeholder="انتخاب" readonly inputmode="none">
                        </div>
                        <span class="text-muted">تا</span>
                        <div class="tc-time-input-wrapper position-relative">
                            <input type="text" class="form-control tc-time-end tb-clock-picker tb-white-readonly" dir="ltr" placeholder="انتخاب" readonly inputmode="none">
                        </div>
                    </div>
                </div>
            `);
        });
    }

    $(document).on('click', '#btn_open_batch_modal', function(e) {
        e.preventDefault();
        resetBatchModal();
        $('#tc-batch-modal').css('display', 'flex');
        $('body').css('overflow', 'hidden');
    });

    $(document).on('change', '.tc-day-check', function() {
        const dayId = $(this).val();
        if ($(this).is(':checked')) {
            $(`#tc_times_${dayId}`).addClass('active');
        } else {
            $(`#tc_times_${dayId}`).removeClass('active');
            $(`#tc_times_${dayId} input`).val('');
            $(`#tc_times_${dayId}`).find('.tb-inline-error').remove();
        }
    });

    $(document).on('click', '#btn_submit_batch', function() {
        $('.tb-inline-error').remove();
        $('#tc_batch_errors_box').hide();
        let generalErrors = [];
        let weekdayError = false;

        const areaId = $('#tc_batch_area').val();
        const startDate = $('#tc_batch_start_date_gregorian').val();
        const endDate = $('#tc_batch_end_date_gregorian').val();
        const buffer = TBCore.toEnglishNum($('#tc_batch_buffer').val());

        const isMobile = $(window).width() <= 768;

        if (!areaId) { generalErrors.push('حوزه درمانی را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#tc_batch_area'), 'حوزه درمانی را انتخاب کنید.'); }
        if (!startDate) { generalErrors.push('تاریخ شروع را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#tc_batch_start_date'), 'تاریخ شروع را انتخاب کنید.'); }
        if (!endDate) { generalErrors.push('تاریخ پایان را انتخاب کنید.'); if(isMobile) TBCore.showInlineError($('#tc_batch_end_date'), 'تاریخ پایان را انتخاب کنید.'); }
        if (buffer === '') { generalErrors.push('زمان استراحت را وارد کنید.'); if(isMobile) TBCore.showInlineError($('#tc_batch_buffer'), 'زمان استراحت را وارد کنید.'); }

        let selectedDays = [];
        let daysChecked = false;

        $('.tc-day-check:checked').each(function() {
            daysChecked = true;
            const dayId = $(this).val();
            const $startInput = $(`#tc_times_${dayId} .tc-time-start`);
            const $endInput = $(`#tc_times_${dayId} .tc-time-end`);
            const startTime = TBCore.toEnglishNum($startInput.val());
            const endTime = TBCore.toEnglishNum($endInput.val());

            if (!startTime) { generalErrors.push(`ساعت شروع برای روز ${weekDays.find(d=>d.id==dayId).name} الزامی است.`); if(isMobile) TBCore.showInlineError($startInput, 'ساعت شروع الزامی است'); }
            if (!endTime) { generalErrors.push(`ساعت پایان برای روز ${weekDays.find(d=>d.id==dayId).name} الزامی است.`); if(isMobile) TBCore.showInlineError($endInput, 'ساعت پایان الزامی است'); }
            
            if (startTime && endTime) {
                selectedDays.push({ day: dayId, start: startTime, end: endTime });
            }
        });

        // 👈 حل خطای روزهای هفته در دسکتاپ
        if (!daysChecked) {
            weekdayError = true;
            generalErrors.push('حداقل یک روز هفته را انتخاب کنید.');
            if(isMobile) TBCore.showInlineError($('.tc-weekdays-container'), 'حداقل یک روز هفته را انتخاب کنید.');
        }

if (generalErrors.length > 0 || weekdayError) {
            if (generalErrors.length > 0 && !isMobile) {
                let errHtml = '<ul>';
                generalErrors.forEach(e => errHtml += `<li>${e}</li>`);
                errHtml += '</ul>';
                $('#tc_batch_errors_box').html(errHtml).slideDown();
            }
            // 👈 حل قطعی مشکل اسکرول: هدایت نرمِ اسکرولِ پاپ‌آپ به بالاترین نقطه (صفر)
            $('#tc-batch-modal .tb-scrollable-body').animate({ scrollTop: 0 }, 300);
            return; 
        }
        
        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال پردازش و تولید...');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_add_batch_sessions',
            security: TB_Admin.nonce,
            therapist_id: currentTherapistId,
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
                            <p style="margin-bottom: 15px;">به دلیل تداخل با جلسات قبلی یا تقویم گوگل:</p>
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

                $('#tc-batch-modal .tb-modal-body > div').hide();
                $('#tc-batch-modal .tb-modal-body').append(reportHtml);
                
                $('#tc-batch-modal .tb-modal-footer').html(`
                    <button id="btn_close_batch_report" class="tb-btn-primary w-100">متوجه شدم، بستن پنجره</button>
                `);

                reloadTableAfterAdd();

            } else {
                $btn.prop('disabled', false).text('تولید و ثبت تایم‌ها');
                if (!isMobile) {
                    $('#tc_batch_errors_box').html(`<ul><li>${res.data.message || res.data}</li></ul>`).slideDown();
                } else {
                    TBCore.showAlertModal(res.data.message || res.data);
                }
            }
        }).fail(function(xhr) {
            $btn.prop('disabled', false).text('تولید و ثبت تایم‌ها');
            alert("خطای سرور در تولید انبوه:\n\n" + xhr.responseText);
        });
    });

    $(document).on('click', '#btn_close_batch_report, .tb-modal-close', function() {
        $(this).closest('.tb-modal-overlay').fadeOut(200);
        $('body').css('overflow', '');
    });

// 👈 حل قطعی باگ: استفاده از Event Delegation برای تمام دکمه‌های فیلتر و کمبوباکس
    $(document).off('click', '#tc_btn_search').on('click', '#tc_btn_search', function() {
        calendarPage = 1;
        loadCalendarTable();
    });

    $(document).off('click', '#tc_btn_clear_filters').on('click', '#tc_btn_clear_filters', function(e) {
        e.preventDefault();
        $('#tc_filter_status').val('all').trigger('change');
        $('#tc_filter_area').val('all').trigger('change');
        $('#tc_filter_day').val('all').trigger('change');
        $('#tc_filter_start_date, #tc_filter_start_date_gregorian, #tc_filter_end_date, #tc_filter_end_date_gregorian').val('');
        
        $('#tc_filter_client_name').val('').prop('disabled', false);
        $('#tc_filter_client_id').val(''); 
        $('#tc_filter_client_clear').hide();
        
        TBCore.renderCustomSelect($('#tc_filter_status'));
        TBCore.renderCustomSelect($('#tc_filter_area'));
        TBCore.renderCustomSelect($('#tc_filter_day'));
        
        calendarPage = 1;
        loadCalendarTable();
    });

    // 👈 حل مشکل کار نکردن کمبوباکس تعداد نمایش
    $(document).off('change', '#tc_per_page').on('change', '#tc_per_page', function() {
        calendarPage = 1;
        loadCalendarTable();
    });

    $(document).off('click', '#tc_pagination .tb-page-btn').on('click', '#tc_pagination .tb-page-btn', function() {
        if ($(this).hasClass('disabled')) return;
        calendarPage = $(this).data('page');
        loadCalendarTable();
    });
    
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
            $container.append(`<button class="tb-page-btn" data-page="${currentPage + 1}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>`);
        } else {
            $container.append(`<button class="tb-page-btn disabled"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor" style="width:16px;height:16px;"><path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg></button>`);
        }
    }

  function loadCalendarTable() {
        if (!currentTherapistId) return;

        const perPage = $('#tc_per_page').val() || 10;
        const status = $('#tc_filter_status').val() || 'all';
        const area = $('#tc_filter_area').val() || 'all';
        const day = $('#tc_filter_day').val() || 'all';
        const startDate = $('#tc_filter_start_date_gregorian').val() || '';
       const endDate = $('#tc_filter_end_date_gregorian').val() || '';
        const clientName = $('#tc_filter_client_name').val() || ''; 
        const clientId = $('#tc_filter_client_id').val() || 0; // 👈 دریافت ID مراجع

        const $tbody = $('#tc_table_body');
        const $pagination = $('#tc_pagination');
        
        $tbody.html('<tr class="tb-empty-row"><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> در حال بارگذاری...</td></tr>');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_calendar_table',
            security: TB_Admin.nonce,
            therapist_id: currentTherapistId,
            per_page: perPage,
            paged: calendarPage,
            status: status,
            area: area,
            day: day,
            start_date: startDate,
            end_date: endDate,
            client_name: clientName,
            client_id: clientId // 👈 ارسال ID به سرور
        }).done(function(res) {
            if (res.success) {
                $tbody.empty();
                $pagination.empty();

                if (res.data.items.length === 0) {
                    $tbody.html('<tr class="tb-empty-row"><td colspan="7" class="text-center text-muted py-4">هیچ جلسه‌ای یافت نشد.</td></tr>');
                    return;
                }

                let counter = (calendarPage - 1) * perPage + 1;

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

                // 👈 اضافه شدن data-name و data-datetime به دکمه‌های جدول اصلی
                    if (item.status === 'available') {
                        statusHtml = `<span class="tc-status-badge tc-status-available"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> آزاد</span>`;
                        actionBtns = `
                            <button class="tb-action-btn tb-btn-reschedule" data-id="${item.id}" title="جابجایی"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg></button>
                            <button class="tb-action-btn tb-btn-delete" data-id="${item.id}" data-status="available" data-datetime="${TBCore.toPersianNum(dateStr)} ساعت ${TBCore.toPersianNum(timeStr)}" title="حذف"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                        `;
                    } else if (item.status === 'frozen') {
                        statusHtml = `<span class="tc-status-badge tc-status-frozen"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg> در حال پرداخت</span>`;
                        actionBtns = `<span class="text-muted" style="font-size:11px;">قفل موقت</span>`;
                    } else if (item.status === 'booked') {
                        statusHtml = `
                            <span class="tc-status-badge tc-status-booked"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg> رزرو قطعی</span>
                            <div class="tc-client-info">
                                <span>${item.client_first_name} ${item.client_last_name}</span>
                                <span dir="ltr"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.896-1.596-5.069-3.769-6.665-6.666l1.292-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" /></svg> ${TBCore.toPersianNum(item.client_mobile)}</span>
                            </div>
                        `;
                        actionBtns = `
                            <button class="tb-action-btn tb-btn-reschedule" data-id="${item.id}" title="جابجایی"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg></button>
                            <button class="tb-action-btn tb-btn-delete" data-id="${item.id}" data-status="booked" data-name="${item.client_first_name} ${item.client_last_name}" data-datetime="${TBCore.toPersianNum(dateStr)} ساعت ${TBCore.toPersianNum(timeStr)}" title="لغو و عودت وجه"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                        `;
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
                        statusHtml = `<span class="tc-status-badge tc-status-deleted"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg> لغو شده</span>`;
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

                renderSmartPagination(res.data.total_pages, calendarPage, $pagination);
            }
        }).fail(function(xhr) {
            $tbody.html('<tr><td colspan="7" class="text-center text-danger py-4">خطای سرور در دریافت جدول.</td></tr>');
            alert("خطای سرور:\n\n" + xhr.responseText);
        });
    }

    // ==========================================
    // ۸. عملیات روی جلسات (حذف، جابجایی، غیبت)
    // ==========================================
    
   // 👈 خواندن نام و تاریخ برای پاپ‌آپ حذف/لغو
    $(document).on('click', '.tb-btn-delete', function() {
        const id = $(this).data('id');
        const status = $(this).data('status');
        const name = $(this).attr('data-name') || 'این مراجع';
        const datetime = $(this).attr('data-datetime') || '';
        
        let confirmMsg = '';
        let btnText = '';
        
        if (status === 'available') {
            confirmMsg = `آیا از حذف تایم آزاد <strong>${datetime}</strong> مطمئن هستید؟`;
            btnText = 'بله، حذف شود';
        } else {
            confirmMsg = `آیا از لغو جلسه <strong>${name}</strong> در تاریخ ${datetime} مطمئن هستید؟ مبلغ به کیف پول مراجع عودت داده شده و پیامک ارسال می‌شود.`;
            btnText = 'بله، لغو شود';
        }

TBCore.showConfirmModal(confirmMsg, btnText, 'tb-btn-danger', function() {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_delete_session',
                security: TB_Admin.nonce,
                session_id: id
            }).done(function(res) {
                TBCore.showAlertModal(res.data.message || res.data);
                if (res.success) {
                    loadCalendarTable();
                    // 👈 حل قطعی باگ: آپدیت زنده کارتابل پس از لغو جلسه
                    if (typeof checkPendingResolutions === 'function') {
                        checkPendingResolutions();
                    }
                }
            }).fail(function(xhr) {
                alert("خطای سرور:\n\n" + xhr.responseText);
            });
        });
    });

    $(document).on('click', '.tb-btn-reschedule', function() {
        const id = $(this).data('id');
        $('#tc_reschedule_session_id').val(id);
        $('#tc_reschedule_date').val('');
        $('#tc_reschedule_date_gregorian').val('');
        $('#tc_reschedule_time').val('').attr('type', 'text');
        
        const defaultBuffer = $('#tc_single_buffer').val();
        $('#tc_reschedule_buffer').val(defaultBuffer);
        
        $('#tc-reschedule-modal').css('display', 'flex');
    });

    $('#btn_submit_reschedule').on('click', function() {
        $('.tb-inline-error').remove();
        let errors = [];

        const id = $('#tc_reschedule_session_id').val();
        const date = $('#tc_reschedule_date_gregorian').val();
        const time = TBCore.toEnglishNum($('#tc_reschedule_time').val());
        const buffer = TBCore.toEnglishNum($('#tc_reschedule_buffer').val());

        if (!date) { errors.push('error'); TBCore.showInlineError($('#tc_reschedule_date'), 'تاریخ جدید را انتخاب کنید.'); }
        if (!time) { errors.push('error'); TBCore.showInlineError($('#tc_reschedule_time'), 'ساعت جدید را انتخاب کنید.'); }
        if (buffer === '') { errors.push('error'); TBCore.showInlineError($('#tc_reschedule_buffer'), 'زمان استراحت را وارد کنید.'); }

        if (date && time) {
            const selectedDateTime = new Date(date + 'T' + time);
            const now = new Date();
            if (selectedDateTime < now) {
                errors.push('error');
                TBCore.showInlineError($('#tc_reschedule_time'), 'زمان انتخابی گذشته است.');
            }
        }

        if (errors.length > 0) {
            return;
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال جابجایی...');

$.post(TB_Admin.ajaxurl, {
                action: 'tb_reschedule_session',
                security: TB_Admin.nonce,
                session_id: id,
                new_date: date,
                new_time: time,
                buffer: buffer
            }).done(function(res) {
                $btn.prop('disabled', false).text('تایید و جابجایی');
                if (res.success) {
                    $('#tc-reschedule-modal').fadeOut(200);
                    TBCore.showAlertModal(res.data);
                    
                    // 👈 حل قطعی خطای دید: ریست کردن فیلترها، بازگشت به صفحه ۱ و رفرش کامل
                    if (typeof reloadTableAfterAdd === 'function') {
                        reloadTableAfterAdd();
                    } else {
                        loadCalendarTable();
                    }
                    
                } else {
                if (res.data && res.data.type === 'conflict_with_suggestion') {
                    $('#tc_suggested_time_display').text(TBCore.toPersianNum(res.data.suggested_time));
                    $('#tc_suggested_time_val').val(res.data.suggested_time);
                    $('#tc_suggestion_target_input').val('tc_reschedule_time');
                    $('#tc-suggestion-modal').css('display', 'flex');
                } else {
                    TBCore.showAlertModal(res.data.message || res.data);
                }
            }
        }).fail(function(xhr) {
            $btn.prop('disabled', false).text('تایید و جابجایی');
            alert("خطای سرور:\n\n" + xhr.responseText);
        });
    });

    // ==========================================
    // ۹. کارتابل تعیین تکلیف (Resolution Center)
    // ==========================================
    
    function checkPendingResolutions() {
        if (!currentTherapistId) return;
        
        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_pending_resolutions',
            security: TB_Admin.nonce,
            therapist_id: currentTherapistId
        }).done(function(res) {
            if (res.success && res.data.length > 0) {
                $('#tc_pending_count').text(TBCore.toPersianNum(res.data.length));
                $('#tc_pending_resolution_alert').css('display', 'flex');
                
                const $tbody = $('#tc_resolution_table_body');
                $tbody.empty();
                
                res.data.forEach(item => {
                    const dtParts = item.start_datetime.split(' ');
                    const dParts = dtParts[0].split('-');
                    const tParts = dtParts[1].split(':');
                    const jDate = gregorianToJalali(parseInt(dParts[0]), parseInt(dParts[1]), parseInt(dParts[2]));
                    const dateStr = jDate[0] + '/' + (jDate[1] < 10 ? '0' + jDate[1] : jDate[1]) + '/' + (jDate[2] < 10 ? '0' + jDate[2] : jDate[2]);
                    const timeStr = tParts[0] + ':' + tParts[1];

                  // 👈 برگرداندن تمام ستون‌های جدول کارتابل
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
                                    <button class="tb-btn-success tb-btn-resolve" data-id="${item.id}" data-status="completed" data-name="${item.client_first_name} ${item.client_last_name}" data-datetime="${TBCore.toPersianNum(dateStr)} ساعت ${TBCore.toPersianNum(timeStr)}" style="padding:6px 10px; font-size:11px; white-space: nowrap;">پایان جلسه</button>
                                    <button class="tb-btn-danger tb-btn-resolve" data-id="${item.id}" data-status="no_show" data-name="${item.client_first_name} ${item.client_last_name}" data-datetime="${TBCore.toPersianNum(dateStr)} ساعت ${TBCore.toPersianNum(timeStr)}" style="padding:6px 10px; font-size:11px; background:#1A1D21; white-space: nowrap;">غیبت مراجع</button>
                                </div>
                            </td>
                        </tr>
                    `);
                });
            } else {
                $('#tc_pending_resolution_alert').hide();
            }
        });
    }

    $('#btn_open_resolution_modal').on('click', function() {
        $('#tc-resolution-modal').css('display', 'flex');
    });

// 👈 خواندن دقیق نام و تاریخ از دکمه‌های کارتابل در پنل مدیریت
    $(document).off('click', '.tb-btn-resolve').on('click', '.tb-btn-resolve', function() {
        const id = $(this).data('id');
        const status = $(this).data('status');
        
        // استفاده از attr برای اطمینان از خواندن دیتای داینامیک
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
                    $btn.closest('tr').fadeOut(300, function() { 
                        $(this).remove(); 
                        
                        if ($('#tc_resolution_table_body tr').length === 0) {
                            $('#tc-resolution-modal').fadeOut(200);
                        }
                    });
                    
                    if (typeof window.loadFrontCalendarTable === 'function') window.loadFrontCalendarTable();
                    if (typeof loadCalendarTable === 'function') loadCalendarTable();
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
    // 👈 جستجوی ایجکس مراجعین در فیلتر تقویم (پنل مدیریت)
    // ==========================================
    let clientSearchTimeout;
    
    $(document).off('input', '#tc_filter_client_name').on('input', '#tc_filter_client_name', function() {
        clearTimeout(clientSearchTimeout);
        const val = $(this).val().replace(/[^آ-ی\s\u200C0-9۰-۹]/g, '');
        $(this).val(TBCore.toPersianNum(val));
        
        const $results = $('#tc_client_search_results');
        
        if (val !== '') $('#tc_filter_client_clear').show();
        else {
            $('#tc_filter_client_clear').hide();
            $results.slideUp(150);
            $('#tc_filter_client_id').val('');
            return;
        }

        if (val.length < 3) return;

        clientSearchTimeout = setTimeout(() => {
            $results.html('<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm"></span> در حال جستجو...</div>').show();
            
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_search_therapist_clients',
                security: TB_Admin.nonce,
                therapist_id: currentTherapistId,
                search: val
            }).done(function(res) {
                if (res.success) {
                    $results.empty();
                    if (res.data.length === 0) {
                        $results.html('<div class="p-3 text-center text-muted">مراجعی یافت نشد.</div>');
                        return;
                    }
                    res.data.forEach(user => {
                        $results.append(`<div class="tb-autocomplete-item tc-admin-client-filter-item" data-id="${user.ID}" data-name="${user.first_name} ${user.last_name}" data-mobile="${user.mobile}">${user.first_name} ${user.last_name} (${TBCore.toPersianNum(user.mobile)})</div>`);
                    });
                }
            });
        }, 500);
    });

    $(document).off('click', '.tc-admin-client-filter-item').on('click', '.tc-admin-client-filter-item', function() {
        const userId = $(this).data('id');
        const name = $(this).data('name');
        const mobile = $(this).data('mobile');

        $('#tc_filter_client_id').val(userId);
        $('#tc_filter_client_name').val(name + ' (' + TBCore.toPersianNum(mobile) + ')').prop('disabled', true);
        $('#tc_client_search_results').slideUp(150);
        
        calendarPage = 1;
        loadCalendarTable();
    });

    $(document).off('click', '#tc_filter_client_clear').on('click', '#tc_filter_client_clear', function(e) {
        e.preventDefault();
        $('#tc_filter_client_name').val('').prop('disabled', false);
        $('#tc_filter_client_id').val('');
        $(this).hide();
        $('#tc_client_search_results').slideUp(150);
        
        calendarPage = 1;
        loadCalendarTable();
    });
});