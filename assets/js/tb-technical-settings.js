jQuery(document).ready(function($) {

    // =================================================================
    // ۱. مدیریت تب‌های داخلی (با کلاس ایزوله شده tb-tech-tab-btn)
    // =================================================================
    $('.tb-tech-tab-btn').on('click', function(e) {
        e.preventDefault();
        if ($(this).hasClass('active')) return;

        // تغییر کلاس دکمه‌ها
        $(this).siblings().removeClass('active');
        $(this).addClass('active');

        // تغییر محتوای تب‌ها
        const targetId = $(this).data('target');
        $('.ts-inner-pane').hide().removeClass('active');
        $('#' + targetId).fadeIn(300).addClass('active');
        
        // لود کردن اطلاعات بر اساس تب انتخابی
        if (targetId === 'ts-therapy-calendar') {
            loadTechnicalSettings();
        } else if (targetId === 'ts-course-settings') {
            loadCourseSettings();
        }
    });

    // لود اولیه وقتی از منوی اصلی وارد این بخش می‌شویم
    $(document).on('tb_tab_changed', function(e, targetId) {
        if (targetId === 'tab-technical-settings') {
            // همیشه تب اول را به صورت پیش‌فرض لود کن
            $('.tb-tech-tab-btn[data-target="ts-therapy-calendar"]').click();
        }
    });

    // =================================================================
    // ۲. منطق فرم تنظیمات تقویم روان‌درمانی
    // =================================================================
    $('#ts_enable_late_penalty').on('change', function() {
        if ($(this).is(':checked')) {
            $('#ts_penalty_percent_wrapper').slideDown(200);
        } else {
            $('#ts_penalty_percent_wrapper').slideUp(200);
            $('#ts_late_penalty_percent').val('');
        }
    });

    $('#ts_late_penalty_percent').on('input', function() {
        let rawVal = TBCore.toEnglishNum($(this).val().replace(/[^0-9۰-۹]/g, ''));
        let val = parseInt(rawVal);
        if (isNaN(val)) val = '';
        else if (val > 100) val = 100;
        else if (val < 0) val = 0;
        $(this).val(val !== '' ? TBCore.toPersianNum(val.toString()) : '');
    });

    function loadTechnicalSettings() {
        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_technical_settings',
            security: TB_Admin.nonce
        }).done(function(res) {
            if (res.success) {
                const data = res.data;
                
                $('#ts_enable_frontend_booking').prop('checked', data.enable_frontend_booking == 1);
                $('#ts_allow_therapist_online_booking').prop('checked', data.allow_therapist_online_booking == 1);
                $('#ts_allow_therapist_add_time').prop('checked', data.allow_therapist_add_time == 1);
                
                $('#ts_cart_expiration').val(TBCore.toPersianNum(data.cart_expiration));
                $('#ts_min_booking_notice').val(TBCore.toPersianNum(data.min_booking_notice));
                $('#ts_max_calendar_horizon').val(TBCore.toPersianNum(data.max_calendar_horizon));
                $('#ts_default_buffer_time').val(TBCore.toPersianNum(data.default_buffer_time));
                $('#ts_free_cancel_window').val(TBCore.toPersianNum(data.free_cancel_window));
                
                if (data.enable_late_penalty == 1) {
                    $('#ts_enable_late_penalty').prop('checked', true);
                    $('#ts_penalty_percent_wrapper').show();
                    $('#ts_late_penalty_percent').val(TBCore.toPersianNum(data.late_penalty_percent));
                } else {
                    $('#ts_enable_late_penalty').prop('checked', false);
                    $('#ts_penalty_percent_wrapper').hide();
                }

                $('#ts_google_client_id').val(data.google_client_id);
                $('#ts_google_client_secret').val(data.google_client_secret);
                $('#ts_google_event_template').val(data.google_event_template);
                $('#ts_enable_noshow_penalty').prop('checked', data.enable_noshow_penalty == 1);
                
                $('#ts_first_reminder_hours').val(TBCore.toPersianNum(data.first_reminder_hours));
                $('#ts_final_reminder_minutes').val(TBCore.toPersianNum(data.final_reminder_minutes));
                $('#ts_followup_wait_hours').val(TBCore.toPersianNum(data.followup_wait_hours));
                
                $('#ts_sms_api_key').val(data.sms_api_key);
                
                // Client SMS
                $('#ts_sms_pattern_booking').val(TBCore.toPersianNum(data.sms_pattern_booking));
                $('#ts_sms_pattern_reminder1').val(TBCore.toPersianNum(data.sms_pattern_reminder1));
                $('#ts_sms_pattern_link').val(TBCore.toPersianNum(data.sms_pattern_link));
                $('#ts_sms_pattern_inperson_client').val(TBCore.toPersianNum(data.sms_pattern_inperson_client));
                $('#ts_sms_pattern_phone_client').val(TBCore.toPersianNum(data.sms_pattern_phone_client));
                $('#ts_sms_pattern_cancel_by_admin').val(TBCore.toPersianNum(data.sms_pattern_cancel_by_admin));
                $('#ts_sms_pattern_cancel_by_client_free').val(TBCore.toPersianNum(data.sms_pattern_cancel_by_client_free));
                $('#ts_sms_pattern_cancel_by_client_late').val(TBCore.toPersianNum(data.sms_pattern_cancel_by_client_late));
                $('#ts_sms_pattern_reschedule_client').val(TBCore.toPersianNum(data.sms_pattern_reschedule_client));
                $('#ts_sms_pattern_noshow').val(TBCore.toPersianNum(data.sms_pattern_noshow));
                
                // Therapist SMS
                $('#ts_sms_pattern_new_booking_therapist').val(TBCore.toPersianNum(data.sms_pattern_new_booking_therapist));
                $('#ts_sms_pattern_google_sync').val(TBCore.toPersianNum(data.sms_pattern_google_sync));
                $('#ts_sms_pattern_link_therapist').val(TBCore.toPersianNum(data.sms_pattern_link_therapist));
                $('#ts_sms_pattern_inperson_therapist').val(TBCore.toPersianNum(data.sms_pattern_inperson_therapist));
                $('#ts_sms_pattern_phone_therapist').val(TBCore.toPersianNum(data.sms_pattern_phone_therapist));
                $('#ts_sms_pattern_cancel_by_admin_therapist').val(TBCore.toPersianNum(data.sms_pattern_cancel_by_admin_therapist));
                $('#ts_sms_pattern_cancel_by_client_therapist').val(TBCore.toPersianNum(data.sms_pattern_cancel_by_client_therapist));
                $('#ts_sms_pattern_reschedule_therapist').val(TBCore.toPersianNum(data.sms_pattern_reschedule_therapist));
                
                $('#ts_sms_pattern_followup_therapist').val(TBCore.toPersianNum(data.sms_pattern_followup_therapist));
                $('#ts_sms_pattern_followup_admin').val(TBCore.toPersianNum(data.sms_pattern_followup_admin));
            }
        });
    }

    $('#btn_save_technical_settings').on('click', function() {
        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال ذخیره...');

        const data = {
            action: 'tb_save_technical_settings',
            security: TB_Admin.nonce,
            
            enable_frontend_booking: $('#ts_enable_frontend_booking').is(':checked'),
            allow_therapist_online_booking: $('#ts_allow_therapist_online_booking').is(':checked'),
            allow_therapist_add_time: $('#ts_allow_therapist_add_time').is(':checked'),
            
            cart_expiration: TBCore.toEnglishNum($('#ts_cart_expiration').val()),
            min_booking_notice: TBCore.toEnglishNum($('#ts_min_booking_notice').val()),
            max_calendar_horizon: TBCore.toEnglishNum($('#ts_max_calendar_horizon').val()),
            default_buffer_time: TBCore.toEnglishNum($('#ts_default_buffer_time').val()),
            free_cancel_window: TBCore.toEnglishNum($('#ts_free_cancel_window').val()),
            enable_late_penalty: $('#ts_enable_late_penalty').is(':checked'),
            late_penalty_percent: TBCore.toEnglishNum($('#ts_late_penalty_percent').val()),
            google_client_id: $('#ts_google_client_id').val().trim(),
            google_client_secret: $('#ts_google_client_secret').val().trim(),
            google_event_template: $('#ts_google_event_template').val(),
            enable_noshow_penalty: $('#ts_enable_noshow_penalty').is(':checked'),
            first_reminder_hours: TBCore.toEnglishNum($('#ts_first_reminder_hours').val()),
            final_reminder_minutes: TBCore.toEnglishNum($('#ts_final_reminder_minutes').val()),
            followup_wait_hours: TBCore.toEnglishNum($('#ts_followup_wait_hours').val()),
            
            sms_api_key: $('#ts_sms_api_key').val().trim(),
            
            // Client SMS
            sms_pattern_booking: TBCore.toEnglishNum($('#ts_sms_pattern_booking').val()),
            sms_pattern_reminder1: TBCore.toEnglishNum($('#ts_sms_pattern_reminder1').val()),
            sms_pattern_link: TBCore.toEnglishNum($('#ts_sms_pattern_link').val()),
            sms_pattern_inperson_client: TBCore.toEnglishNum($('#ts_sms_pattern_inperson_client').val()),
            sms_pattern_phone_client: TBCore.toEnglishNum($('#ts_sms_pattern_phone_client').val()),
            sms_pattern_cancel_by_admin: TBCore.toEnglishNum($('#ts_sms_pattern_cancel_by_admin').val()),
            sms_pattern_cancel_by_client_free: TBCore.toEnglishNum($('#ts_sms_pattern_cancel_by_client_free').val()),
            sms_pattern_cancel_by_client_late: TBCore.toEnglishNum($('#ts_sms_pattern_cancel_by_client_late').val()),
            sms_pattern_reschedule_client: TBCore.toEnglishNum($('#ts_sms_pattern_reschedule_client').val()),
            sms_pattern_noshow: TBCore.toEnglishNum($('#ts_sms_pattern_noshow').val()),
            
            // Therapist SMS
            sms_pattern_new_booking_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_new_booking_therapist').val()),
            sms_pattern_google_sync: TBCore.toEnglishNum($('#ts_sms_pattern_google_sync').val()),
            sms_pattern_link_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_link_therapist').val()),
            sms_pattern_inperson_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_inperson_therapist').val()),
            sms_pattern_phone_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_phone_therapist').val()),
            sms_pattern_cancel_by_admin_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_cancel_by_admin_therapist').val()),
            sms_pattern_cancel_by_client_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_cancel_by_client_therapist').val()),
            sms_pattern_reschedule_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_reschedule_therapist').val()),
            
            sms_pattern_followup_therapist: TBCore.toEnglishNum($('#ts_sms_pattern_followup_therapist').val()),
            sms_pattern_followup_admin: TBCore.toEnglishNum($('#ts_sms_pattern_followup_admin').val()),
        };

        $.post(TB_Admin.ajaxurl, data).done(function(res) {
            $btn.prop('disabled', false).text('ذخیره تنظیمات تقویم و پیامک');
            if (res.success) {
                TBCore.showAlertModal(res.data);
            } else {
                TBCore.showAlertModal('خطا در ذخیره اطلاعات.');
            }
        }).fail(function() {
            $btn.prop('disabled', false).text('ذخیره تنظیمات تقویم و پیامک');
            alert('خطای سرور در ذخیره تنظیمات.');
        });
    });

    $('#btn_test_sms').on('click', function() {
        const phone = $('#ts_test_phone').val();
        const pattern = TBCore.toEnglishNum($('#ts_test_pattern').val());
        const apiKey = $('#ts_sms_api_key').val().trim();
        const $resultBox = $('#ts_test_sms_result');
        const $btn = $(this);

        $resultBox.hide().removeClass('text-success text-danger');

        if (!phone || !pattern || !apiKey) {
            $resultBox.text('لطفاً شماره موبایل، کد پترن و API Key را وارد کنید.').addClass('text-danger').slideDown();
            return;
        }

        $btn.prop('disabled', true).text('در حال ارسال...');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_test_sms_connection',
            security: TB_Admin.nonce,
            phone: phone,
            pattern: pattern,
            api_key: apiKey
        }).done(function(res) {
            $btn.prop('disabled', false).text('تست ارسال پیامک');
            if (res.success) {
                $resultBox.text(res.data).addClass('text-success').slideDown();
            } else {
                $resultBox.text(res.data).addClass('text-danger').slideDown();
            }
        }).fail(function(xhr) {
            $btn.prop('disabled', false).text('تست ارسال پیامک');
            $resultBox.text('خطای سرور: ' + xhr.statusText).addClass('text-danger').slideDown();
        });
    });

    // =================================================================
    // ۳. منطق فرم تنظیمات دوره‌های آموزشی
    // =================================================================
    $('#cs_enable_late_fee').on('change', function() {
        if ($(this).is(':checked')) {
            $('#cs_late_fee_percent_wrapper').slideDown(200);
        } else {
            $('#cs_late_fee_percent_wrapper').slideUp(200);
            $('#cs_late_fee_percent').val('');
        }
    });

    $('#cs_late_fee_percent').on('input', function() {
        let rawVal = TBCore.toEnglishNum($(this).val().replace(/[^0-9۰-۹]/g, ''));
        let val = parseInt(rawVal);
        if (isNaN(val)) val = '';
        else if (val > 100) val = 100;
        else if (val < 0) val = 0;
        $(this).val(val !== '' ? TBCore.toPersianNum(val.toString()) : '');
    });

    function loadCourseSettings() {
        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_course_settings',
            security: TB_Admin.nonce
        }).done(function(res) {
            if (res.success) {
                const data = res.data;
                
                $('#cs_skyroom_api_key').val(data.skyroom_api_key);
                $('#cs_enable_waitlist').prop('checked', data.enable_waitlist == 1);
                $('#cs_enable_prerequisites').prop('checked', data.enable_prerequisites == 1);
                $('#cs_grace_period_days').val(TBCore.toPersianNum(data.grace_period_days));
                
                if (data.enable_late_fee == 1) {
                    $('#cs_enable_late_fee').prop('checked', true);
                    $('#cs_late_fee_percent_wrapper').show();
                    $('#cs_late_fee_percent').val(TBCore.toPersianNum(data.late_fee_percent));
                } else {
                    $('#cs_enable_late_fee').prop('checked', false);
                    $('#cs_late_fee_percent_wrapper').hide();
                }

                // SMS Patterns
                $('#cs_sms_course_start').val(TBCore.toPersianNum(data.sms_course_start));
                $('#cs_sms_installment_reminder').val(TBCore.toPersianNum(data.sms_installment_reminder));
                $('#cs_sms_grace_warning').val(TBCore.toPersianNum(data.sms_grace_warning));
                $('#cs_sms_suspension').val(TBCore.toPersianNum(data.sms_suspension));
                $('#cs_sms_certificate').val(TBCore.toPersianNum(data.sms_certificate));
                $('#cs_sms_vod_link').val(TBCore.toPersianNum(data.sms_vod_link));
            }
        });
    }

    $('#btn_save_course_settings').on('click', function() {
        const $btn = $(this);
        $btn.prop('disabled', true).text('در حال ذخیره...');

        const data = {
            action: 'tb_save_course_settings',
            security: TB_Admin.nonce,
            
            skyroom_api_key: $('#cs_skyroom_api_key').val().trim(),
            enable_waitlist: $('#cs_enable_waitlist').is(':checked'),
            enable_prerequisites: $('#cs_enable_prerequisites').is(':checked'),
            grace_period_days: TBCore.toEnglishNum($('#cs_grace_period_days').val()),
            enable_late_fee: $('#cs_enable_late_fee').is(':checked'),
            late_fee_percent: TBCore.toEnglishNum($('#cs_late_fee_percent').val()),
            
            // SMS Patterns
            sms_course_start: TBCore.toEnglishNum($('#cs_sms_course_start').val()),
            sms_installment_reminder: TBCore.toEnglishNum($('#cs_sms_installment_reminder').val()),
            sms_grace_warning: TBCore.toEnglishNum($('#cs_sms_grace_warning').val()),
            sms_suspension: TBCore.toEnglishNum($('#cs_sms_suspension').val()),
            sms_certificate: TBCore.toEnglishNum($('#cs_sms_certificate').val()),
            sms_vod_link: TBCore.toEnglishNum($('#cs_sms_vod_link').val()),
        };

        $.post(TB_Admin.ajaxurl, data).done(function(res) {
            $btn.prop('disabled', false).text('ذخیره تنظیمات دوره‌های آموزشی');
            if (res.success) {
                TBCore.showAlertModal(res.data);
            } else {
                TBCore.showAlertModal('خطا در ذخیره اطلاعات.');
            }
        }).fail(function() {
            $btn.prop('disabled', false).text('ذخیره تنظیمات دوره‌های آموزشی');
            alert('خطای سرور در ذخیره تنظیمات.');
        });
    });

});