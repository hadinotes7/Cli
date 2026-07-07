jQuery(document).ready(function($) {
    
    let therapistPage = 1;
    let tempTherapyAreas = [];
    let tempEduCourses = [];
    
    // فیلتر فیلدهای جستجو (فقط حروف فارسی و اعداد فارسی)
    $('#tb-search-therapist, #tb-search-user-input').on('input', function() {
        let val = $(this).val();
        val = val.replace(/[^آ-ی\s\u200C0-9۰-۹]/g, '');
        val = TBCore.toPersianNum(val);
        $(this).val(val);
    });

    TBCore.initCustomSelect($('#tb-per-page-therapist'));
    TBCore.renderCustomSelect($('#tb-per-page-therapist'));

    $('#tb-per-page-therapist').on('change', function() {
        therapistPage = 1;
        loadTherapists();
    });

    $(document).on('tb_tab_changed', function(e, targetId) {
        if (targetId === 'tab-therapists') {
            loadTherapists();
        }
    });

    function loadTherapists() {
        const showDeleted = $('#tb-toggle-deleted-therapist').is(':checked');
        const search = $('#tb-search-therapist').val();
        const perPage = $('#tb-per-page-therapist').val();
        const $tbody = $('#tb-therapist-table-body');
        const $pagination = $('#tb-pagination-therapist');
        
        $tbody.html('<tr class="tb-empty-row"><td colspan="6" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> در حال بارگذاری...</td></tr>');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_therapists_list',
            security: TB_Admin.nonce,
            show_deleted: showDeleted,
            search: search,
            per_page: perPage,
            paged: therapistPage
        }, function(res) {
            if (res.success) {
                $tbody.empty();
                $pagination.empty();

                if (res.data.items.length === 0) {
                    $tbody.html('<tr class="tb-empty-row"><td colspan="6" class="text-center text-muted py-4">هیچ رکوردی یافت نشد.</td></tr>');
                    return;
                }

                res.data.items.forEach(item => {
                    const isDeleted = item.is_active == 0;
                    const textClass = isDeleted ? 'deleted-text' : '';
                    
                    let avatarHtml = '';
                    if (item.avatar_url) {
                        avatarHtml = `<img src="${item.avatar_url}" class="tb-avatar-sm">`;
                    } else {
                        const firstLetter = item.first_name ? item.first_name.charAt(0) : 'ک';
                        const colors = ['#fecaca', '#fed7aa', '#fef08a', '#d9f99d', '#bbf7d0', '#a5f3fc', '#bfdbfe', '#e9d5ff', '#fbcfe8', '#fecdd3'];
                        const bgColor = colors[item.id % colors.length];
                        avatarHtml = `<div class="tb-avatar-placeholder" style="background-color:${bgColor}; color:#1A1D21;">${firstLetter}</div>`;
                    }

                    let roleTags = '';
                    if (item.areas_count > 0) roleTags += `<span class="tb-chip-role tb-chip-role-t">درمانگر</span> `;
                    if (item.courses_count > 0) roleTags += `<span class="tb-chip-role tb-chip-role-e">مدرس</span>`;
                    if (roleTags === '') roleTags = '-';

                    let summary = '';
                    if (item.areas_count > 0) summary += `<span class="tb-chip-summary">${TBCore.toPersianNum(item.areas_count)} حوزه درمانی</span> `;
                    if (item.courses_count > 0) summary += `<span class="tb-chip-summary">${TBCore.toPersianNum(item.courses_count)} دوره آموزشی</span>`;
                    if (summary === '') summary = '-';

                    let actionBtns = '';
                    if (isDeleted) {
                        actionBtns = `
                        <button class="tb-action-btn tb-btn-restore-therapist" data-id="${item.id}" data-name="${item.first_name} ${item.last_name}" title="بازیابی">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        </button>`;
                    } else {
                        actionBtns = `
                        <button class="tb-action-btn tb-btn-edit-therapist" data-id="${item.user_id}" title="ویرایش">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                        </button>
                        <button class="tb-action-btn tb-btn-calendar-therapist" data-userid="${item.user_id}" data-name="${item.first_name} ${item.last_name}" data-mobile="${item.mobile}" title="تقویم کاری" style="color: #1A1D21;">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
                        </button>
                        <button class="tb-action-btn tb-btn-delete-therapist" data-id="${item.id}" data-name="${item.first_name} ${item.last_name}" title="حذف">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>
                    `;
                    }

                    $tbody.append(`
                        <tr>
                            <td style="text-align: right;">
                                <div class="tb-avatar-cell">
                                    ${avatarHtml}
                                    <span class="tb-nowrap ${textClass}">${item.first_name} ${item.last_name}</span>
                                </div>
                            </td>
                            <td style="text-align: center;" class="tb-col-code tb-nowrap ${textClass}" dir="ltr">${TBCore.toPersianNum(item.mobile)}</td>
                            <td style="text-align: center;" class="tb-nowrap">${roleTags}</td>
                            <td style="text-align: center;" class="tb-nowrap ${textClass}">${summary}</td>
                            <td><div class="tb-action-btns">${actionBtns}</div></td>
                        </tr>
                    `);
                });

                if (res.data.total_pages > 1) {
                    for (let i = 1; i <= res.data.total_pages; i++) {
                        const activeClass = i === res.data.paged ? 'active' : '';
                        $pagination.append(`<button class="tb-page-btn ${activeClass}" data-page="${i}">${TBCore.toPersianNum(i)}</button>`);
                    }
                }
            }
        });
    }

    $('#tb-toggle-deleted-therapist').on('change', function() {
        therapistPage = 1;
        loadTherapists();
    });

    let searchTherapistTimeout;
    $('#tb-search-therapist').on('input', function() {
        clearTimeout(searchTherapistTimeout);
        const val = $(this).val();
        if (val !== '') $('#tb-search-therapist-clear').show();
        else $('#tb-search-therapist-clear').hide();

        searchTherapistTimeout = setTimeout(() => {
            therapistPage = 1;
            loadTherapists();
        }, 400);
    });

    $('#tb-search-therapist-clear').on('click', function() {
        $('#tb-search-therapist').val('');
        $(this).hide();
        therapistPage = 1;
        loadTherapists();
    });

    $(document).on('click', '#tb-pagination-therapist .tb-page-btn', function() {
        therapistPage = $(this).data('page');
        loadTherapists();
    });

    $(document).on('click', '.tb-btn-delete-therapist', function() {
        const id = $(this).data('id');
        const name = $(this).data('name');
        TBCore.showConfirmModal(`آیا از غیرفعال کردن «${name}» مطمئن هستید؟`, 'بله، حذف شود', 'tb-btn-danger', function() {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_toggle_therapist_status',
                security: TB_Admin.nonce,
                id: id,
                status: 0
            }, function(res) {
                if (res.success) loadTherapists();
            });
        });
    });

    $(document).on('click', '.tb-btn-restore-therapist', function() {
        const id = $(this).data('id');
        const name = $(this).data('name');
        TBCore.showConfirmModal(`آیا مایل به بازیابی «${name}» هستید؟`, 'بله، بازیابی شود', 'tb-btn-success', function() {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_restore_therapist',
                security: TB_Admin.nonce,
                id: id
            }, function(res) {
                if (res.success) loadTherapists();
            });
        });
    });

    $(document).on('click', '.tb-btn-calendar-therapist', function() {
        const userId = $(this).data('userid');
        const name = $(this).data('name');
        const mobile = $(this).data('mobile');
        const searchString = name + ' (' + TBCore.toPersianNum(mobile) + ')';
        
        $('.tb-tab-btn[data-target="tab-therapy-calendar"]').click();
        
        setTimeout(() => {
            $('#tb-search-calendar-therapist').val(searchString).prop('disabled', true);
            $('#tb-search-calendar-clear').show();
            $(document).trigger('tb_auto_load_calendar', [userId]);
        }, 300);
    });

    $('#tb-btn-add-therapist').on('click', function() {
        $('#tb-therapist-full-form').hide();
        $('#tb-search-user-input').val('').prop('disabled', false);
        $('#tb-search-user-clear').hide();
        $('#tb-btn-final-save-therapist').hide();
        $('.tb-inline-error').remove();
        
        $('#th_user_id').val(0);
        $('#th_avatar_base64').val('');
        $('#th_existing_avatar').val('');
        $('#tb-avatar-preview-box').css('background-image', 'none').html('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>');
        $('#tb-btn-select-avatar').show();
        $('#tb-btn-remove-avatar').hide();
        $('#tb-therapist-full-form input, #tb-therapist-full-form textarea').val('');
        tempTherapyAreas = [];
        tempEduCourses = [];
        renderChips();
        
        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_active_base_items',
            security: TB_Admin.nonce
        }, function(res) {
            if (res.success) {
                populateSelect('#th_sel_therapy_area', res.data.therapy_area, 'انتخاب حوزه درمانی...');
                populateSelect('#th_sel_therapy_channel', res.data.channel, 'انتخاب کانال برگزاری...');
                populateSelect('#th_sel_edu_group', res.data.edu_group, ' انتخاب گروه آموزشی...');
                populateSelect('#th_sel_edu_course', res.data.edu_course, 'انتخاب دوره آموزشی...');
                populateSelect('#th_sel_edu_structure', res.data.structure, 'انتخاب ساختار دوره...');
                populateSelect('#th_sel_edu_channel', res.data.channel, 'انتخاب کانال برگزاری...');
            }
        });

        $('#tb-therapist-modal').css('display', 'flex');
    });

    function populateSelect(selector, data, placeholder) {
        const $select = $(selector);
        $select.empty().append(`<option value="">${placeholder}</option>`);
        data.forEach(item => {
            $select.append(`<option value="${item.id}">${item.name}</option>`);
        });
        TBCore.initCustomSelect($select);
        TBCore.renderCustomSelect($select);
    }

    let userSearchTimeout;
    $('#tb-search-user-input').on('input', function() {
        clearTimeout(userSearchTimeout);
        const val = $(this).val();
        const $results = $('#tb-user-search-results');
        
        if (val !== '') $('#tb-search-user-clear').show();
        else {
            $('#tb-search-user-clear').hide();
            $results.slideUp(150);
            $('#tb-search-user-wrapper').css('padding-bottom', '0');
            return;
        }

        if (val.length < 3) return;
        userSearchTimeout = setTimeout(() => {
            $results.html('<div class="p-3 text-center text-muted"><span class="spinner-border spinner-border-sm"></span> در حال جستجو...</div>').show();
            $('#tb-therapist-modal-body').css('min-height', '350px');
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_search_users',
                security: TB_Admin.nonce,
                search: val
            }, function(res) {
                if (res.success) {
                    $results.empty();
                    if (res.data.length === 0) {
                        $results.html('<div class="p-3 text-center text-muted">کاربری یافت نشد.</div>');
                        return;
                    }
                    res.data.forEach(user => {
                        $results.append(`<div class="tb-autocomplete-item" data-id="${user.id}" data-name="${user.name}" data-mobile="${user.mobile}" data-gender="${user.gender}" data-dob="${user.dob}">${user.name} (${TBCore.toPersianNum(user.mobile)})</div>`);
                    });
                }
            });
        }, 500);
    });

    $('#tb-search-user-clear').on('click', function() {
        $('#tb-search-user-input').val('').prop('disabled', false);
        $(this).hide();
        $('#tb-user-search-results').slideUp(150);
        $('#tb-search-user-wrapper').css('padding-bottom', '0');
        $('#tb-therapist-full-form').slideUp(300);
        $('#tb-btn-final-save-therapist').hide();
    });

    $(document).on('click', '.tb-autocomplete-item', function() {
        const userId = $(this).data('id');
        const name = $(this).data('name');
        const mobile = $(this).data('mobile');
        const gender = $(this).data('gender');
        const dob = $(this).data('dob');

        $('#th_user_id').val(userId);
        $('#tb-search-user-input').val(name + ' (' + TBCore.toPersianNum(mobile) + ')').prop('disabled', true);
        $('#tb-user-search-results').slideUp(150);
        $('#tb-search-user-wrapper').css('padding-bottom', '0');

        $('#lbl_user_name').text(name);
        $('#lbl_user_mobile').text(TBCore.toPersianNum(mobile).split('').join(' '));
        $('#lbl_user_gender').text(gender);
        $('#lbl_user_dob').text(TBCore.toPersianNum(dob));

        $('#tb-btn-final-save-therapist').text('ثبت نهایی اطلاعات');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_therapist_data',
            security: TB_Admin.nonce,
            user_id: userId
        }, function(res) {
            if (res.success) {
                const t = res.data.therapist;
                if (t && t.avatar_url) {
                    $('#th_existing_avatar').val(t.avatar_url);
                    $('#tb-avatar-preview-box').html('').css('background-image', `url(${t.avatar_url})`);
                    $('#tb-btn-select-avatar').hide();
                    $('#tb-btn-remove-avatar').show();
                }
                if (t) {
                    $('#th_national_code').val(TBCore.toPersianNum(t.national_code));
                    $('#th_education').val(t.education);
                    $('#th_phone2').val(TBCore.toPersianNum(t.phone2));
                    $('#th_home_phone').val(TBCore.toPersianNum(t.home_phone));
                    $('#th_work_phone').val(TBCore.toPersianNum(t.work_phone));
                    $('#th_home_address').val(t.home_address);
                    $('#th_work_address').val(t.work_address);
                    $('#th_experience').val(t.experience);
                    $('#th_bank_name').val(t.bank_name);
                    $('#th_account_number').val(TBCore.toPersianNum(t.account_number));
                    $('#th_card_number').val(TBCore.formatCardNumber(t.card_number));
                    $('#th_shaba_number').val(TBCore.toPersianNum(t.shaba_number));
                }

                tempTherapyAreas = (res.data.areas || []).map(a => ({
                    area_id: String(a.area_id), channel_id: String(a.channel_id),
                    area_name: a.area_name, channel_name: a.channel_name,
                    time: a.duration, amount: a.price, deposit: a.deposit_percent,
                    share_t: a.therapist_share, share_c: a.clinic_share
                }));

                tempEduCourses = (res.data.courses || []).map(c => ({
                    group_id: String(c.group_id), course_id: String(c.course_id),
                    structure_id: String(c.structure_id), channel_id: String(c.channel_id),
                    group_name: c.group_name, course_name: c.course_name,
                    structure_name: c.structure_name, channel_name: c.channel_name,
                    time: c.duration, amount: c.price, deposit: c.deposit_percent,
                    share_t: c.therapist_share, share_c: c.clinic_share
                }));

                renderChips();
            }
            $('#tb-therapist-full-form').slideDown(300);
            $('#tb-btn-final-save-therapist').show();
        });
    });

    $(document).on('click', '.tb-btn-edit-therapist', function() {
        const userId = $(this).data('id');
        $('#tb-btn-add-therapist').click(); 
        
        setTimeout(() => {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_get_therapist_data',
                security: TB_Admin.nonce,
                user_id: userId
            }, function(res) {
                if (res.success) {
                    const t = res.data.therapist;
                    $('#th_user_id').val(userId);
                    
                    $('#tb-search-user-input').val(t.first_name + ' ' + t.last_name + ' (' + TBCore.toPersianNum(t.mobile) + ')').prop('disabled', true);
                    $('#tb-search-user-clear').show();
                    
                    $('#lbl_user_name').text(t.first_name + ' ' + t.last_name);
                    $('#lbl_user_mobile').text(TBCore.toPersianNum(t.mobile).split('').join(' '));
                    $('#lbl_user_gender').text(t.gender ? t.gender : 'نامشخص');
                    $('#lbl_user_dob').text(t.dob ? TBCore.toPersianNum(t.dob) : 'نامشخص');
                    
                    if (t.avatar_url) {
                        $('#th_existing_avatar').val(t.avatar_url);
                        $('#tb-avatar-preview-box').html('').css('background-image', `url(${t.avatar_url})`);
                        $('#tb-btn-select-avatar').hide();
                        $('#tb-btn-remove-avatar').show();
                    }
                    $('#th_national_code').val(TBCore.toPersianNum(t.national_code));
                    $('#th_education').val(t.education);
                    $('#th_phone2').val(TBCore.toPersianNum(t.phone2));
                    $('#th_home_phone').val(TBCore.toPersianNum(t.home_phone));
                    $('#th_work_phone').val(TBCore.toPersianNum(t.work_phone));
                    $('#th_home_address').val(t.home_address);
                    $('#th_work_address').val(t.work_address);
                    $('#th_experience').val(t.experience);
                    $('#th_bank_name').val(t.bank_name);
                    $('#th_account_number').val(TBCore.toPersianNum(t.account_number));
                    $('#th_card_number').val(TBCore.formatCardNumber(t.card_number));
                    $('#th_shaba_number').val(TBCore.toPersianNum(t.shaba_number));

                    tempTherapyAreas = (res.data.areas || []).map(a => ({
                        area_id: String(a.area_id), channel_id: String(a.channel_id),
                        area_name: a.area_name, channel_name: a.channel_name,
                        time: a.duration, amount: a.price, deposit: a.deposit_percent,
                        share_t: a.therapist_share, share_c: a.clinic_share
                    }));

                    tempEduCourses = (res.data.courses || []).map(c => ({
                        group_id: String(c.group_id), course_id: String(c.course_id),
                        structure_id: String(c.structure_id), channel_id: String(c.channel_id),
                        group_name: c.group_name, course_name: c.course_name,
                        structure_name: c.structure_name, channel_name: c.channel_name,
                        time: c.duration, amount: c.price, deposit: c.deposit_percent,
                        share_t: c.therapist_share, share_c: c.clinic_share
                    }));

                    renderChips();

                    $('#tb-btn-final-save-therapist').text('ثبت نهایی تغییرات');
                    $('#tb-therapist-full-form').slideDown(300);
                    $('#tb-btn-final-save-therapist').show();
                }
            });
        }, 500);
    });

    let currentCropImg = null;
    let dragStartX, dragStartY, imgX = 0, imgY = 0, scale = 1;
    let isDragging = false;
    const CANVAS_SIZE = 600; 

    $('#tb-btn-select-avatar').on('click', function(e) { 
        e.preventDefault();
        $('#tb_avatar_file').val(''); 
        $('#tb_avatar_file').click(); 
    });

    $('#tb_avatar_file').on('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.match('image.*')) {
            TBCore.showAlertModal('لطفاً یک فایل تصویری معتبر انتخاب کنید.');
            $(this).val('');
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            TBCore.showAlertModal('حجم عکس نباید بیشتر از ۲ مگابایت باشد.');
            $(this).val('');
            return;
        }

        const reader = new FileReader();
        reader.onload = function(event) {
            const img = new Image();
            img.onload = function() {
                currentCropImg = img;
                const canvas = document.getElementById('tb-cropper-canvas');
                
                canvas.width = CANVAS_SIZE;
                canvas.height = CANVAS_SIZE;
                
                scale = Math.max(CANVAS_SIZE / img.width, CANVAS_SIZE / img.height);
                
                imgX = (CANVAS_SIZE - img.width * scale) / 2;
                imgY = (CANVAS_SIZE - img.height * scale) / 2;

                drawCropper();
                $('#tb-cropper-modal').css('display', 'flex');
            };
            img.onerror = function() {
                TBCore.showAlertModal('خطا در بارگذاری تصویر. لطفاً عکس دیگری امتحان کنید.');
            };
            img.src = event.target.result;
        };
        reader.readAsDataURL(file);
        $(this).val(''); 
    });

    function drawCropper() {
        if (!currentCropImg) return;
        const canvas = document.getElementById('tb-cropper-canvas');
        const ctx = canvas.getContext('2d');

        const minX = CANVAS_SIZE - (currentCropImg.width * scale);
        const minY = CANVAS_SIZE - (currentCropImg.height * scale);

        if (imgX > 0) imgX = 0;
        if (imgX < minX) imgX = minX;
        if (imgY > 0) imgY = 0;
        if (imgY < minY) imgY = minY;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = "#ffffff"; 
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(currentCropImg, imgX, imgY, currentCropImg.width * scale, currentCropImg.height * scale);
    }

    function getEventPos(e, canvas) {
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / rect.width;
        const scaleY = canvas.height / rect.height;
        let clientX = e.clientX;
        let clientY = e.clientY;
        
        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }
        
        return {
            x: (clientX - rect.left) * scaleX,
            y: (clientY - rect.top) * scaleY
        };
    }

    const canvas = document.getElementById('tb-cropper-canvas');
    
    canvas.addEventListener('mousedown', function(e) {
        isDragging = true;
        const pos = getEventPos(e, canvas);
        dragStartX = pos.x - imgX;
        dragStartY = pos.y - imgY;
    });
    canvas.addEventListener('mousemove', function(e) {
        if (isDragging) {
            const pos = getEventPos(e, canvas);
            imgX = pos.x - dragStartX;
            imgY = pos.y - dragStartY;
            drawCropper();
        }
    });
    canvas.addEventListener('mouseup', function() { isDragging = false; });
    canvas.addEventListener('mouseleave', function() { isDragging = false; });

    canvas.addEventListener('touchstart', function(e) {
        isDragging = true;
        const pos = getEventPos(e, canvas);
        dragStartX = pos.x - imgX;
        dragStartY = pos.y - imgY;
    });
    canvas.addEventListener('touchmove', function(e) {
        if (isDragging) {
            e.preventDefault(); 
            const pos = getEventPos(e, canvas);
            imgX = pos.x - dragStartX;
            imgY = pos.y - dragStartY;
            drawCropper();
        }
    }, { passive: false });
    canvas.addEventListener('touchend', function() { isDragging = false; });

    $('#tb-btn-crop-confirm').on('click', function() {
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        $('#th_avatar_base64').val(dataUrl);
        $('#tb-avatar-preview-box').html('').css('background-image', `url(${dataUrl})`);
        $('#tb-btn-select-avatar').hide();
        $('#tb-btn-remove-avatar').show();
        $('#tb-cropper-modal').fadeOut(200);
    });

    $('.tb-cropper-close').on('click', function() {
        $('#tb-cropper-modal').fadeOut(200);
    });

    $('#tb-btn-remove-avatar').on('click', function() {
        $('#th_avatar_base64').val('');
        $('#th_existing_avatar').val('');
        $('#tb-avatar-preview-box').css('background-image', 'none').html('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" /></svg>');
        $(this).hide();
        $('#tb-btn-select-avatar').show();
    });

    $(document).on('click', '.tb-avatar-preview, .tb-avatar-sm', function() {
        let url = '';
        if ($(this).hasClass('tb-avatar-preview')) {
            const bg = $(this).css('background-image');
            if (bg && bg !== 'none') url = bg.replace(/(url\(|\)|"|')/g, '');
        } else {
            url = $(this).attr('src');
        }
        
        if (url) {
            $('#tb-lightbox-img').attr('src', url);
            $('#tb-lightbox-modal').css('display', 'flex');
        }
    });
    $('.tb-lightbox-close').on('click', function() {
        $('#tb-lightbox-modal').fadeOut(200);
    });

    $('.tb-dynamic-select').on('change', function() {
        const areaId = $('#th_sel_therapy_area').val();
        const channelId = $('#th_sel_therapy_channel').val();
        
        if (areaId !== '' && channelId !== '') {
            const existing = tempTherapyAreas.find(a => a.area_id == areaId && a.channel_id == channelId);
            if (existing) {
                $('#th_price_time').val(TBCore.toPersianNum(existing.time));
                $('#th_price_amount').val(TBCore.formatMoney(existing.amount));
                $('#th_price_deposit').val(TBCore.toPersianNum(existing.deposit));
                $('#th_price_share_t').val(TBCore.toPersianNum(existing.share_t));
                $('#th_price_share_c').val(TBCore.toPersianNum(existing.share_c));
            } else {
                $('#th_therapy_pricing_form input').val('');
                $('#th_price_share_c').text('۱۰۰');
            }
            $('#th_therapy_pricing_form').slideDown(200);
            
            setTimeout(() => {
                $('#th_therapy_area_section')[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        } else {
            $('#th_therapy_pricing_form').slideUp(200);
        }
    });

    $('#th_price_deposit, #th_price_share_t, #th_edu_deposit, #th_edu_share_t').on('input', function() {
        let rawVal = TBCore.toEnglishNum($(this).val().replace(/[^0-9۰-۹]/g, ''));
        let val = parseInt(rawVal);

        if (isNaN(val)) {
            val = '';
        } else if (val > 100) {
            val = 100;
        } else if (val < 0) {
            val = 0;
        }

        $(this).val(val !== '' ? TBCore.toPersianNum(val.toString()) : '');

        let id = $(this).attr('id');
        
        if (id === 'th_price_share_t') {
            let clinicShare = val !== '' ? (100 - val) : 100;
            $('#th_price_share_c').text(TBCore.toPersianNum(clinicShare.toString()));
        } 
        else if (id === 'th_edu_share_t') {
            let clinicShare = val !== '' ? (100 - val) : 100;
            $('#th_edu_share_c').text(TBCore.toPersianNum(clinicShare.toString()));
        }
    });

    $('#btn_save_therapy_area').on('click', function() {
        $('.tb-inline-error').remove();
        const areaId = $('#th_sel_therapy_area').val();
        const channelId = $('#th_sel_therapy_channel').val();
        
        const areaText = $('#th_sel_therapy_area').next('.custom-select-wrapper').find('.selected-text').text();
        const channelText = $('#th_sel_therapy_channel').next('.custom-select-wrapper').find('.selected-text').text();
        
        const time = TBCore.toEnglishNum($('#th_price_time').val());
        const amount = TBCore.toEnglishNum($('#th_price_amount').val().replace(/,/g, ''));
        const deposit = TBCore.toEnglishNum($('#th_price_deposit').val());
        const share_t = TBCore.toEnglishNum($('#th_price_share_t').val());
        const share_c = 100 - (parseInt(share_t) || 0);

        if (!time) { TBCore.showInlineError($('#th_price_time'), 'لطفاً زمان را وارد کنید.'); return; }
        if (!amount) { TBCore.showInlineError($('#th_price_amount'), 'لطفاً هزینه را وارد کنید.'); return; }
        if (!deposit) { TBCore.showInlineError($('#th_price_deposit'), 'لطفاً بیعانه را وارد کنید.'); return; }
        if (!share_t) { TBCore.showInlineError($('#th_price_share_t'), 'لطفاً سهم درمانگر را وارد کنید.'); return; }

        tempTherapyAreas = tempTherapyAreas.filter(a => !(a.area_id == areaId && a.channel_id == channelId));
        
        tempTherapyAreas.push({
            area_id: areaId, channel_id: channelId,
            area_name: areaText, channel_name: channelText,
            time: time, amount: amount, deposit: deposit, share_t: share_t, share_c: share_c
        });
        
        renderChips();
        
        $('#th_sel_therapy_area').val('').trigger('change');
        $('#th_sel_therapy_channel').val('').trigger('change');
        TBCore.renderCustomSelect($('#th_sel_therapy_area'));
        TBCore.renderCustomSelect($('#th_sel_therapy_channel'));
    });

    $('.tb-dynamic-select-edu').on('change', function() {
        const g = $('#th_sel_edu_group').val();
        const c = $('#th_sel_edu_course').val();
        const s = $('#th_sel_edu_structure').val();
        const ch = $('#th_sel_edu_channel').val();
        
        if (g !== '' && c !== '' && s !== '' && ch !== '') {
            const existing = tempEduCourses.find(x => x.group_id == g && x.course_id == c && x.structure_id == s && x.channel_id == ch);
            if (existing) {
                $('#th_edu_time').val(TBCore.toPersianNum(existing.time));
                $('#th_edu_amount').val(TBCore.formatMoney(existing.amount));
                $('#th_edu_deposit').val(TBCore.toPersianNum(existing.deposit));
                $('#th_edu_share_t').val(TBCore.toPersianNum(existing.share_t));
                $('#th_edu_share_c').text(TBCore.toPersianNum(existing.share_c));
            } else {
                $('#th_edu_pricing_form input').val('');
                $('#th_edu_share_c').text('۱۰۰');
            }
            $('#th_edu_pricing_form').slideDown(200);
            
            setTimeout(() => {
                $('#th_edu_course_section')[0].scrollIntoView({ behavior: 'smooth', block: 'start' });
            }, 200);
        } else {
            $('#th_edu_pricing_form').slideUp(200);
        }
    });

    $('#btn_save_edu_course').on('click', function() {
        $('.tb-inline-error').remove();
        const g = $('#th_sel_edu_group').val();
        const c = $('#th_sel_edu_course').val();
        const s = $('#th_sel_edu_structure').val();
        const ch = $('#th_sel_edu_channel').val();
        
        const gText = $('#th_sel_edu_group').next('.custom-select-wrapper').find('.selected-text').text();
        const cText = $('#th_sel_edu_course').next('.custom-select-wrapper').find('.selected-text').text();
        const sText = $('#th_sel_edu_structure').next('.custom-select-wrapper').find('.selected-text').text();
        const chText = $('#th_sel_edu_channel').next('.custom-select-wrapper').find('.selected-text').text();
        
        const time = TBCore.toEnglishNum($('#th_edu_time').val());
        const amount = TBCore.toEnglishNum($('#th_edu_amount').val().replace(/,/g, ''));
        const deposit = TBCore.toEnglishNum($('#th_edu_deposit').val());
        const share_t = TBCore.toEnglishNum($('#th_edu_share_t').val());
        const share_c = 100 - (parseInt(share_t) || 0);

        if (!time) { TBCore.showInlineError($('#th_edu_time'), 'لطفاً زمان را وارد کنید.'); return; }
        if (!amount) { TBCore.showInlineError($('#th_edu_amount'), 'لطفاً هزینه را وارد کنید.'); return; }
        if (!deposit) { TBCore.showInlineError($('#th_edu_deposit'), 'لطفاً بیعانه را وارد کنید.'); return; }
        if (!share_t) { TBCore.showInlineError($('#th_edu_share_t'), 'لطفاً سهم مدرس را وارد کنید.'); return; }

        tempEduCourses = tempEduCourses.filter(x => !(x.group_id == g && x.course_id == c && x.structure_id == s && x.channel_id == ch));
        
        tempEduCourses.push({
            group_id: g, course_id: c, structure_id: s, channel_id: ch,
            group_name: gText, course_name: cText, structure_name: sText, channel_name: chText,
            time: time, amount: amount, deposit: deposit, share_t: share_t, share_c: share_c
        });
        
        renderChips();
        
        $('.tb-dynamic-select-edu').val('').trigger('change');
        $('.tb-dynamic-select-edu').each(function() { TBCore.renderCustomSelect($(this)); });
    });

    // 👈 حل باگ ۱: جداسازی رویداد کلیک روی متن تگ از دکمه حذف
    function renderChips() {
        $('#th_therapy_chips_container').empty();
        tempTherapyAreas.forEach((a, index) => {
            $('#th_therapy_chips_container').append(`
                <div class="tb-chip" data-index="${index}" data-type="area">
                    <span class="tb-chip-text">${a.area_name} | ${a.channel_name}</span>
                    <button type="button" class="tb-chip-delete" data-index="${index}" data-type="area">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            `);
        });

        $('#th_edu_chips_container').empty();
        tempEduCourses.forEach((c, index) => {
            $('#th_edu_chips_container').append(`
                <div class="tb-chip" data-index="${index}" data-type="course">
                    <span class="tb-chip-text">${c.group_name} | ${c.course_name} | ${c.structure_name} | ${c.channel_name}</span>
                    <button type="button" class="tb-chip-delete" data-index="${index}" data-type="course">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>
            `);
        });
    }

    // رویداد کلیک برای ویرایش (فقط روی متن تگ کلیک شود)
    $(document).off('click', '.tb-chip-text').on('click', '.tb-chip-text', function(e) {
        const $chip = $(this).closest('.tb-chip');
        const type = $chip.data('type');
        const index = $chip.data('index');

        if (type === 'area') {
            const a = tempTherapyAreas[index];
            $('#th_sel_therapy_area').val(a.area_id);
            $('#th_sel_therapy_channel').val(a.channel_id);
            TBCore.renderCustomSelect($('#th_sel_therapy_area'));
            TBCore.renderCustomSelect($('#th_sel_therapy_channel'));
            $('#th_sel_therapy_area').trigger('change');
        } else {
            const c = tempEduCourses[index];
            $('#th_sel_edu_group').val(c.group_id);
            $('#th_sel_edu_course').val(c.course_id);
            $('#th_sel_edu_structure').val(c.structure_id);
            $('#th_sel_edu_channel').val(c.channel_id);
            $('.tb-dynamic-select-edu').each(function() { TBCore.renderCustomSelect($(this)); });
            $('#th_sel_edu_group').trigger('change');
        }
    });

    // 👈 حل باگ ۱: بررسی استفاده شدن حوزه قبل از حذف تگ کپسولی (ارسال channel_id)
    $(document).off('click', '.tb-chip-delete').on('click', '.tb-chip-delete', function(e) {
        e.preventDefault();
        e.stopPropagation();
        
        if ($(this).hasClass('is-processing')) return;
        $(this).addClass('is-processing');

        const type = $(this).data('type');
        const index = $(this).data('index');
        const therapistId = parseInt($('#th_user_id').val()) || 0;

        if (type === 'area') {
            const areaId = tempTherapyAreas[index].area_id;
            const channelId = tempTherapyAreas[index].channel_id; // 👈 اضافه شدن این خط
            
            if (therapistId > 0) {
                const $icon = $(this);
                $icon.html('<span class="spinner-border spinner-border-sm" style="width:12px;height:12px;border-width:2px;"></span>');
                
                $.post(TB_Admin.ajaxurl, {
                    action: 'tb_check_area_usage',
                    security: TB_Admin.nonce,
                    therapist_id: therapistId,
                    area_id: areaId,
                    channel_id: channelId // 👈 ارسال به سرور
                }).done(function(res) {
                    $icon.removeClass('is-processing');
                    if (res.success) {
                        tempTherapyAreas.splice(index, 1);
                        renderChips();
                    } else {
                        $icon.html('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>');
TBCore.showAlertModal(`خطا: این حوزه درمانی در ${TBCore.toPersianNum(res.data.count)} جلسه تقویم کاری استفاده شده است و قابل حذف نیست. فقط می‌توانید متغیرهای زمان، هزینه، بیعانه و سهم درمانگر را ویرایش کنید.`);
                    }
                }).fail(function(xhr) {
                    $icon.removeClass('is-processing');
                    $icon.html('<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>');
                    alert('خطا در ارتباط با سرور: ' + xhr.statusText);
                });
            } else {
                $(this).removeClass('is-processing');
                tempTherapyAreas.splice(index, 1);
                renderChips();
            }
        } else {
            $(this).removeClass('is-processing');
            tempEduCourses.splice(index, 1);
            renderChips();
        }
    });

    $('#tb-btn-final-save-therapist').on('click', function() {
        $('.tb-inline-error').remove();
        const nationalCode = TBCore.toEnglishNum($('#th_national_code').val());
        
        if (nationalCode.length !== 10) {
            TBCore.showInlineError($('#th_national_code'), 'کد ملی باید ۱۰ رقم باشد.');
            return;
        }

        const data = {
            action: 'tb_save_therapist',
            security: TB_Admin.nonce,
            user_id: $('#th_user_id').val(),
            avatar_base64: $('#th_avatar_base64').val(),
            existing_avatar: $('#th_existing_avatar').val(),
            national_code: nationalCode,
            education: $('#th_education').val(),
            phone2: TBCore.toEnglishNum($('#th_phone2').val()),
            home_phone: TBCore.toEnglishNum($('#th_home_phone').val()),
            work_phone: TBCore.toEnglishNum($('#th_work_phone').val()),
            home_address: $('#th_home_address').val(),
            work_address: $('#th_work_address').val(),
            experience: $('#th_experience').val(),
            bank_name: $('#th_bank_name').val(),
            account_number: TBCore.toEnglishNum($('#th_account_number').val()),
            card_number: TBCore.toEnglishNum($('#th_card_number').val().replace(/\s/g, '')),
            shaba_number: TBCore.toEnglishNum($('#th_shaba_number').val()),
            therapy_areas: JSON.stringify(tempTherapyAreas),
            edu_courses: JSON.stringify(tempEduCourses)
        };

        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال ثبت...');

        $.post(TB_Admin.ajaxurl, data, function(res) {
            $btn.prop('disabled', false).text($('#th_user_id').val() == 0 ? 'ثبت نهایی اطلاعات' : 'ثبت نهایی تغییرات');
            if (res.success) {
                $('#tb-therapist-modal').fadeOut(200);
                loadTherapists();
            } else {
                TBCore.showAlertModal(res.data);
            }
        });
    });
});