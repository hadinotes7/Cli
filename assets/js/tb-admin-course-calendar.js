jQuery(document).ready(function($) {

    let currentInstructorId = 0;
    let previewSessions = [];
    let batchesPage = 1;

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

    let searchInstructorTimeout;
    $('#tcc_search_instructor').on('input', function() {
        clearTimeout(searchInstructorTimeout);
        const val = $(this).val().replace(/[^آ-ی\s\u200C0-9۰-۹]/g, '');
        $(this).val(TBCore.toPersianNum(val));
        
        const $results = $('#tcc_search_results');
        
        if (val !== '') $('#tcc_search_clear').show();
        else {
            $('#tcc_search_clear').hide();
            $results.slideUp(150);
            return;
        }

        if (val.length < 3) return;

        searchInstructorTimeout = setTimeout(() => {
            $results.html('<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm"></span> در حال جستجو...</div>').show();
            
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
                        $results.html('<div class="p-3 text-center text-muted">مدرسی یافت نشد.</div>');
                        return;
                    }
                    res.data.items.forEach(item => {
                        $results.append(`<div class="tb-autocomplete-item tcc-instructor-item" data-id="${item.user_id}" data-name="${item.first_name} ${item.last_name}" data-mobile="${item.mobile}">${item.first_name} ${item.last_name} (${TBCore.toPersianNum(item.mobile)})</div>`);
                    });
                }
            });
        }, 500);
    });

    $('#tcc_search_clear').on('click', function() {
        $('#tcc_search_instructor').val('').prop('disabled', false);
        $(this).hide();
        $('#tcc_search_results').slideUp(150);
        $('#tcc_full_container').slideUp(300);
        currentInstructorId = 0;
    });

    $(document).on('click', '.tcc-instructor-item', function() {
        const userId = $(this).data('id');
        const name = $(this).data('name');
        const mobile = $(this).data('mobile');

        $('#tcc_search_instructor').val(name + ' (' + TBCore.toPersianNum(mobile) + ')').prop('disabled', true);
        $('#tcc_search_results').slideUp(150);

        checkInstructorStatus(userId);
    });

    function checkInstructorStatus(userId) {
        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_instructor_status',
            security: TB_Admin.nonce,
            therapist_id: userId
        }).done(function(res) {
            if (res.success) {
                currentInstructorId = userId;
                $('#tcc_instructor_id').val(userId);
                
                const $sel = $('#tcc_sel_course');
                $sel.empty().append('<option value="">انتخاب کنید...</option>');
                
                res.data.forEach(c => {
                    // 👈 حل باگ: استفاده از display_name که از سمت سرور آماده شده است
                    const text = c.display_name;
                    
                    $sel.append(`<option value="${c.combo_id}" 
                        data-has-inperson="${c.has_inperson}" 
                        data-has-online="${c.has_online}"
                        data-deposit-inperson="${c.has_inperson ? c.inperson_data.deposit : 0}"
                        data-deposit-online="${c.has_online ? c.online_data.deposit : 0}"
                        >${text}</option>`);
                });
                
                TBCore.initCustomSelect($sel);
                TBCore.renderCustomSelect($sel);

                $('#tcc_full_container').slideDown(300);
                
                batchesPage = 1;
                loadCourseBatchesTable();

            } else {
                TBCore.showAlertModal(res.data);
                $('#tcc_search_clear').click();
            }
        });
    }

    $('#tcc_sel_course').on('change', function() {
        const $selected = $(this).find('option:selected');
        if ($selected.val() !== '') {
            const hasInperson = $selected.data('has-inperson');
            const hasOnline = $selected.data('has-online');

            if (hasInperson) {
                $('#tcc_check_inperson').prop('disabled', false).closest('.p-3').css('opacity', '1');
            } else {
                $('#tcc_check_inperson').prop('disabled', true).prop('checked', false).trigger('change').closest('.p-3').css('opacity', '0.5');
            }

            if (hasOnline) {
                $('#tcc_check_online').prop('disabled', false).closest('.p-3').css('opacity', '1');
            } else {
                $('#tcc_check_online').prop('disabled', true).prop('checked', false).trigger('change').closest('.p-3').css('opacity', '0.5');
            }

            const depInperson = parseInt($selected.data('deposit-inperson')) || 100;
            const depOnline = parseInt($selected.data('deposit-online')) || 100;
            
            let deposit = 100;
            let alertHtml = '';

            if (hasInperson && hasOnline) {
                deposit = Math.min(depInperson, depOnline);
                alertHtml = `این کلاس به صورت هیبریدی برگزار می‌شود (بیعانه حضوری: <strong>${TBCore.toPersianNum(depInperson)}٪</strong> | بیعانه آنلاین: <strong>${TBCore.toPersianNum(depOnline)}٪</strong>). شما در حال تعریف قالب اقساط برای <strong>مبلغ باقیمانده</strong> هستید. لطفاً اقساط را طوری تعریف کنید که جمع آن‌ها دقیقاً ۱۰۰٪ (از بدهی هر دانشجو) شود.`;
            } else if (hasInperson) {
                deposit = depInperson;
                alertHtml = `طبق تنظیمات پایه، بیعانه این دوره <strong>${TBCore.toPersianNum(deposit)}٪</strong> است. بنابراین مبلغ باقیمانده جهت تقسیط، <strong>${TBCore.toPersianNum(100 - deposit)}٪</strong> از کل مبلغ خواهد بود.`;
            } else if (hasOnline) {
                deposit = depOnline;
                alertHtml = `طبق تنظیمات پایه، بیعانه این دوره <strong>${TBCore.toPersianNum(deposit)}٪</strong> است. بنابراین مبلغ باقیمانده جهت تقسیط، <strong>${TBCore.toPersianNum(100 - deposit)}٪</strong> از کل مبلغ خواهد بود.`;
            }

            $('#tcc_installment_alert').html(alertHtml);
            
            if (deposit === 100) {
                $('#tcc_enable_installments').prop('checked', false).prop('disabled', true);
                $('#tcc_installments_wrapper').hide();
            } else {
                $('#tcc_enable_installments').prop('disabled', false);
            }
        } else {
            $('#tcc_check_inperson, #tcc_check_online').prop('disabled', false).prop('checked', false).trigger('change').closest('.p-3').css('opacity', '1');
        }
    });

    $('.tcc-cap-check').on('change', function() {
        const id = $(this).attr('id');
        const targetWrap = id === 'tcc_check_inperson' ? '#tcc_wrap_inperson' : '#tcc_wrap_online';
        const targetInput = id === 'tcc_check_inperson' ? '#tcc_cap_inperson' : '#tcc_cap_online';
        
        if ($(this).is(':checked')) {
            $(targetWrap).slideDown(200);
        } else {
            $(targetWrap).slideUp(200);
            $(targetInput).val('');
        }
    });

    $('#tcc_enable_installments').on('change', function() {
        if ($(this).is(':checked')) {
            $('#tcc_installments_wrapper').slideDown(200);
            if ($('.tcc-inst-row').length === 0) $('#btn_add_installment').click();
        } else {
            $('#tcc_installments_wrapper').slideUp(200);
        }
    });

    let instCounter = 1;
    $('#btn_add_installment').on('click', function() {
        const html = `
            <div class="row g-2 align-items-center mb-2 tcc-inst-row">
                <div class="col-md-4">
                    <input type="text" class="form-control tb-input inst-title" placeholder="عنوان (مثال: قسط اول)" value="قسط ${TBCore.toPersianNum(instCounter++)}">
                </div>
                <div class="col-md-3 position-relative">
                    <span style="position:absolute; left:15px; top:10px; color:#7E8383; font-size:12px; font-weight:bold;">٪</span>
                    <input type="text" class="form-control tb-input text-center inst-percent th-input-fa-num" dir="ltr" placeholder="درصد">
                </div>
                <div class="col-md-4">
                    <input type="text" class="form-control tb-input text-center tb-date-picker tb-white-readonly inst-date" data-gregorian="inst_date_g_${instCounter}" placeholder="تاریخ سررسید" readonly>
                    <input type="hidden" class="inst-date-g" id="inst_date_g_${instCounter}">
                </div>
                <div class="col-md-1 text-center">
                    <button class="tcc-btn-remove-inst"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg></button>
                </div>
            </div>
        `;
        $('#tcc_installments_list').append(html);
        validateInstallments();
    });

    $(document).on('click', '.tcc-btn-remove-inst', function() {
        $(this).closest('.tcc-inst-row').remove();
        validateInstallments();
    });

    $(document).on('input', '.inst-percent', function() {
        let val = $(this).val().replace(/[^0-9۰-۹\.]/g, '');
        $(this).val(TBCore.toPersianNum(val));
        validateInstallments();
    });

    function validateInstallments() {
        if (!$('#tcc_enable_installments').is(':checked')) {
            $('#btn_generate_preview').prop('disabled', false);
            return true;
        }

        let total = 0;
        $('.inst-percent').each(function() {
            let val = parseFloat(TBCore.toEnglishNum($(this).val())) || 0;
            total += val;
        });

        $('#tcc_total_percent').text(TBCore.toPersianNum(total) + '%');

        if (total === 100) {
            $('#tcc_total_percent').css('color', 'var(--tb-success)');
            $('#btn_generate_preview').prop('disabled', false);
            return true;
        } else {
            $('#tcc_total_percent').css('color', 'var(--tb-error)');
            $('#btn_generate_preview').prop('disabled', true);
            return false;
        }
    }

    $('#btn_generate_preview').on('click', function(e) {
        e.preventDefault();
        
        const courseId = $('#tcc_sel_course').val();
        const startDate = $('#tcc_start_date_gregorian').val();
        const totalSessions = TBCore.toEnglishNum($('#tcc_total_sessions').val());
        const startTime = TBCore.toEnglishNum($('#tcc_start_time').val());
        const endTime = TBCore.toEnglishNum($('#tcc_end_time').val());
        
        let weekdays = [];
        $('.tcc-weekday-check:checked').each(function() { weekdays.push($(this).val()); });

        if (!courseId || !startDate || !totalSessions || weekdays.length === 0 || !startTime || !endTime) {
            TBCore.showAlertModal('لطفاً تمام فیلدهای ستاره‌دار ساختار زمانی را پر کنید.');
            return;
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال محاسبه...');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_generate_course_preview',
            security: TB_Admin.nonce,
            start_date: startDate,
            total_sessions: totalSessions,
            weekdays: weekdays,
            start_time: startTime,
            end_time: endTime
        }).done(function(res) {
            $btn.prop('disabled', false).text('تولید و مشاهده پیش‌نمایش جلسات');
            if (res.success) {
                previewSessions = res.data;
                renderPreviewTable();
                $('#tcc_preview_section').slideDown(300);
                setTimeout(() => { $('#tcc_preview_section')[0].scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 300);
            } else {
                TBCore.showAlertModal(res.data);
            }
        }).fail(function(xhr) {
            $btn.prop('disabled', false).text('تولید و مشاهده پیش‌نمایش جلسات');
            TBCore.showAlertModal('خطای سرور در تولید پیش‌نمایش. لطفاً دوباره تلاش کنید.');
        });
    });

    function renderPreviewTable() {
        const $tbody = $('#tcc_preview_body');
        $tbody.empty();

        previewSessions.forEach((s, index) => {
            const dParts = s.date_gregorian.split('-');
            const jDate = gregorianToJalali(parseInt(dParts[0]), parseInt(dParts[1]), parseInt(dParts[2]));
            const jDateStr = jDate[0] + '/' + (jDate[1]<10?'0'+jDate[1]:jDate[1]) + '/' + (jDate[2]<10?'0'+jDate[2]:jDate[2]);

            $tbody.append(`
                <tr data-index="${index}">
                    <td style="text-align: center; font-weight: bold;">${TBCore.toPersianNum(s.session_number)}</td>
                    <td style="text-align: center;">
                        <input type="text" class="form-control tb-input text-center tb-date-picker tb-white-readonly prev-date" data-gregorian="prev_g_${index}" value="${TBCore.toPersianNum(jDateStr)}" readonly>
                        <input type="hidden" class="prev-date-g" id="prev_g_${index}" value="${s.date_gregorian}">
                    </td>
                    <td style="text-align: center;">
                        <input type="text" class="form-control tb-input text-center tb-clock-picker tb-white-readonly prev-start" dir="ltr" value="${TBCore.toPersianNum(s.start_time)}" readonly>
                    </td>
                    <td style="text-align: center;">
                        <input type="text" class="form-control tb-input text-center tb-clock-picker tb-white-readonly prev-end" dir="ltr" value="${TBCore.toPersianNum(s.end_time)}" readonly>
                    </td>
                    <td style="text-align: center;">
                        <button class="tcc-btn-remove-preview"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                    </td>
                </tr>
            `);
        });

        if (typeof TBCore !== 'undefined' && TBCore.PremiumTimePicker) {
            new TBCore.PremiumTimePicker('.tb-clock-picker');
        }
    }

    $(document).on('click', '.tcc-btn-remove-preview', function() {
        $(this).closest('tr').remove();
    });

    $('#btn_final_save_course').on('click', function() {
        const capInperson = TBCore.toEnglishNum($('#tcc_cap_inperson').val()) || 0;
        const capOnline = TBCore.toEnglishNum($('#tcc_cap_online').val()) || 0;

        if (capInperson == 0 && capOnline == 0) {
            TBCore.showAlertModal('حداقل یکی از ظرفیت‌های حضوری یا آنلاین باید بیشتر از صفر باشد.');
            return;
        }

        if ($('#tcc_enable_installments').is(':checked') && !validateInstallments()) {
            TBCore.showAlertModal('جمع درصد اقساط باید دقیقاً ۱۰۰٪ باشد.');
            return;
        }

        let finalSessions = [];
        $('#tcc_preview_body tr').each(function() {
            finalSessions.push({
                number: TBCore.toEnglishNum($(this).find('td:eq(0)').text()),
                date: $(this).find('.prev-date-g').val(),
                start: TBCore.toEnglishNum($(this).find('.prev-start').val()),
                end: TBCore.toEnglishNum($(this).find('.prev-end').val())
            });
        });

        if (finalSessions.length === 0) {
            TBCore.showAlertModal('لیست جلسات نمی‌تواند خالی باشد.');
            return;
        }

        let finalInstallments = [];
        if ($('#tcc_enable_installments').is(':checked')) {
            $('.tcc-inst-row').each(function() {
                finalInstallments.push({
                    title: $(this).find('.inst-title').val(),
                    percent: TBCore.toEnglishNum($(this).find('.inst-percent').val()),
                    date: $(this).find('.inst-date-g').val()
                });
            });
        }

        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال ارتباط با اسکای‌روم و ثبت در دیتابیس...');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_save_course_batch',
            security: TB_Admin.nonce,
            therapist_id: currentInstructorId,
            course_combo_id: $('#tcc_sel_course').val(),
            cap_inperson: capInperson,
            cap_online: capOnline,
            sessions_data: JSON.stringify(finalSessions),
            installments_data: JSON.stringify(finalInstallments)
        }).done(function(res) {
            $btn.prop('disabled', false).text('ثبت نهایی دوره و ساخت اتاق اسکای‌روم');
            if (res.success) {
                TBCore.showAlertModal(res.data);
                $('#tcc_preview_section').slideUp();
                
                batchesPage = 1;
                loadCourseBatchesTable();
                
            } else {
                TBCore.showAlertModal(res.data);
            }
        }).fail(function(xhr) {
            $btn.prop('disabled', false).text('ثبت نهایی دوره و ساخت اتاق اسکای‌روم');
            alert('خطای سرور: ' + xhr.responseText);
        });
    });

    function loadCourseBatchesTable() {
        if (!currentInstructorId) return;

        const perPage = $('#tcc_per_page').val() || 10;
        const $tbody = $('#tcc_batches_body');
        const $pagination = $('#tcc_batches_pagination');
        
        $tbody.html('<tr><td colspan="7" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> در حال بارگذاری...</td></tr>');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_course_batches_list',
            security: TB_Admin.nonce,
            therapist_id: currentInstructorId,
            per_page: perPage,
            paged: batchesPage
        }).done(function(res) {
            if (res.success) {
                $tbody.empty();
                $pagination.empty();

                if (res.data.items.length === 0) {
                    $tbody.html('<tr><td colspan="7" class="text-center text-muted py-4">هیچ دوره‌ای برای این مدرس ثبت نشده است.</td></tr>');
                    return;
                }

                let counter = (batchesPage - 1) * perPage + 1;

                res.data.items.forEach(item => {
                    let dateStr = '-';
                    if (item.start_date && item.end_date) {
                        const sParts = item.start_date.split(' ')[0].split('-');
                        const eParts = item.end_date.split(' ')[0].split('-');
                        if (sParts.length === 3 && eParts.length === 3) {
                            const jStart = gregorianToJalali(parseInt(sParts[0]), parseInt(sParts[1]), parseInt(sParts[2]));
                            const jEnd = gregorianToJalali(parseInt(eParts[0]), parseInt(eParts[1]), parseInt(eParts[2]));
                            dateStr = `${jStart[0]}/${jStart[1]<10?'0'+jStart[1]:jStart[1]}/${jStart[2]<10?'0'+jStart[2]:jStart[2]} تا ${jEnd[0]}/${jEnd[1]<10?'0'+jEnd[1]:jEnd[1]}/${jEnd[2]<10?'0'+jEnd[2]:jEnd[2]}`;
                        }
                    }

                    let capHtml = '';
                    if (item.capacity_inperson > 0) {
                        capHtml += `<div style="font-size:11px; color:#166534; background:#dcfce7; padding:2px 6px; border-radius:4px; margin-bottom:4px;">حضوری: ${TBCore.toPersianNum(item.enrolled_inperson)} / ${TBCore.toPersianNum(item.capacity_inperson)}</div>`;
                    }
                    if (item.capacity_online > 0) {
                        capHtml += `<div style="font-size:11px; color:#0369a1; background:#e0f2fe; padding:2px 6px; border-radius:4px;">آنلاین: ${TBCore.toPersianNum(item.enrolled_online)} / ${TBCore.toPersianNum(item.capacity_online)}</div>`;
                    }

                    let statusHtml = '';
                    let rowClass = '';
                    if (item.status === 'registering') statusHtml = `<span class="tc-status-badge tc-status-available">در حال ثبت‌نام</span>`;
                    else if (item.status === 'active') statusHtml = `<span class="tc-status-badge tc-status-booked">در حال برگزاری</span>`;
                    else if (item.status === 'completed') statusHtml = `<span class="tc-status-badge" style="background:#f1f5f9; color:#1A1D21;">پایان یافته</span>`;
                    else if (item.status === 'cancelled') {
                        statusHtml = `<span class="tc-status-badge tc-status-deleted">لغو شده</span>`;
                        rowClass = 'tc-row-deleted';
                    }

                    $tbody.append(`
                        <tr class="${rowClass}">
                            <td style="text-align: center; font-weight:bold;" dir="ltr">${TBCore.toPersianNum(counter++)}</td>
                            <td style="text-align: right;">
                                <div style="font-weight: bold; color: var(--tb-dark-text);">${item.snapshot_course_name}</div>
                                <div style="font-size: 11px; color: var(--tb-subtitle); margin-top: 4px;">${item.snapshot_group_name} | ${item.snapshot_structure_name}</div>
                            </td>
                            <td style="text-align: center;" dir="ltr">
                                <div style="font-weight:bold;">${TBCore.toPersianNum(dateStr)}</div>
                                <div style="font-size:11px; color:var(--tb-subtitle); margin-top:4px;">${TBCore.toPersianNum(item.total_sessions)} جلسه</div>
                            </td>
                            <td style="text-align: center;" dir="ltr">${capHtml}</td>
                            <td style="text-align: center;">
                                ${item.has_installments > 0 ? '<span style="color:var(--tb-success); font-weight:bold;">دارد</span>' : '<span style="color:var(--tb-subtitle);">ندارد</span>'}
                            </td>
                            <td style="text-align: center;">${statusHtml}</td>
                            <td style="text-align: center;">
                                <div class="tb-action-btns">
                                    <button class="tb-action-btn tb-btn-delete btn-cancel-batch" data-id="${item.id}" title="لغو دوره و عودت وجه"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg></button>
                                </div>
                            </td>
                        </tr>
                    `);
                });

                if (res.data.total_pages > 1) {
                    for (let i = 1; i <= res.data.total_pages; i++) {
                        const activeClass = i === res.data.paged ? 'active' : '';
                        $pagination.append(`<button class="tb-page-btn ${activeClass}" data-page="${i}">${TBCore.toPersianNum(i)}</button>`);
                    }
                }
            } else {
                $tbody.html(`<tr><td colspan="7" class="text-center text-danger py-4">${res.data}</td></tr>`);
            }
        }).fail(function(xhr) {
            $tbody.html('<tr><td colspan="7" class="text-center text-danger py-4">خطای سرور در دریافت جدول.</td></tr>');
        });
    }

    $('#tcc_per_page').on('change', function() {
        batchesPage = 1;
        loadCourseBatchesTable();
    });

    $(document).on('click', '#tcc_batches_pagination .tb-page-btn', function() {
        batchesPage = $(this).data('page');
        loadCourseBatchesTable();
    });

    $(document).on('click', '.btn-cancel-batch', function() {
        const id = $(this).data('id');
        TBCore.showConfirmModal('آیا از لغو کامل این دوره مطمئن هستید؟ (در فاز مالی، وجه تمام دانشجویان عودت داده خواهد شد)', 'بله، لغو شود', 'tb-btn-danger', function() {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_cancel_course_batch',
                security: TB_Admin.nonce,
                batch_id: id
            }).done(function(res) {
                if (res.success) {
                    loadCourseBatchesTable();
                } else {
                    TBCore.showAlertModal(res.data);
                }
            });
        });
    });

});