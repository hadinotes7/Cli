jQuery(document).ready(function($) {

    // =================================================================
    // منطق فرم تنظیمات دوره‌های آموزشی
    // =================================================================

    // مدیریت تاگل جریمه دیرکرد
    $('#cs_enable_late_fee').on('change', function() {
        if ($(this).is(':checked')) {
            $('#cs_late_fee_percent_wrapper').slideDown(200);
        } else {
            $('#cs_late_fee_percent_wrapper').slideUp(200);
            $('#cs_late_fee_percent').val('');
        }
    });

    // محدودیت درصد جریمه (۰ تا ۱۰۰)
    $('#cs_late_fee_percent').on('input', function() {
        let rawVal = TBCore.toEnglishNum($(this).val().replace(/[^0-9۰-۹]/g, ''));
        let val = parseInt(rawVal);
        if (isNaN(val)) val = '';
        else if (val > 100) val = 100;
        else if (val < 0) val = 0;
        $(this).val(val !== '' ? TBCore.toPersianNum(val.toString()) : '');
    });

    // این تابع را به صورت سراسری (Global) تعریف می‌کنیم تا فایل tb-technical-settings.js بتواند آن را صدا بزند
    window.loadCourseSettings = function() {
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
    };

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