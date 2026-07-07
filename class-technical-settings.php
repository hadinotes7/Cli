<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Technical_Settings {

    public static function init() {
        add_action( 'wp_ajax_tb_save_technical_settings', array( __CLASS__, 'save_settings' ) );
        add_action( 'wp_ajax_tb_get_technical_settings', array( __CLASS__, 'get_settings' ) );
        add_action( 'wp_ajax_tb_test_sms_connection', array( __CLASS__, 'test_sms_connection' ) );
    }

    public static function save_settings() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );

        $data = array(
            'enable_frontend_booking'                  => sanitize_text_field( $_POST['enable_frontend_booking'] ) === 'true' ? 1 : 0,
            'allow_therapist_online_booking'           => sanitize_text_field( $_POST['allow_therapist_online_booking'] ) === 'true' ? 1 : 0,
            'allow_therapist_add_time'                 => sanitize_text_field( $_POST['allow_therapist_add_time'] ) === 'true' ? 1 : 0,
            'cart_expiration'                          => intval( $_POST['cart_expiration'] ),
            'min_booking_notice'                       => intval( $_POST['min_booking_notice'] ),
            'max_calendar_horizon'                     => intval( $_POST['max_calendar_horizon'] ),
            'default_buffer_time'                      => intval( $_POST['default_buffer_time'] ),
            'free_cancel_window'                       => intval( $_POST['free_cancel_window'] ),
            'enable_late_penalty'                      => sanitize_text_field( $_POST['enable_late_penalty'] ) === 'true' ? 1 : 0,
            'late_penalty_percent'                     => intval( $_POST['late_penalty_percent'] ),
            'google_client_id'                         => sanitize_text_field( $_POST['google_client_id'] ),
            'google_client_secret'                     => sanitize_text_field( $_POST['google_client_secret'] ),
            'google_event_template'                    => sanitize_text_field( $_POST['google_event_template'] ),
            'enable_noshow_penalty'                    => sanitize_text_field( $_POST['enable_noshow_penalty'] ) === 'true' ? 1 : 0,
            'first_reminder_hours'                     => intval( $_POST['first_reminder_hours'] ),
            'final_reminder_minutes'                   => intval( $_POST['final_reminder_minutes'] ),
            
            // 👈 فیلد جدید: زمان انتظار برای پیگیری
            'followup_wait_hours'                      => intval( $_POST['followup_wait_hours'] ),
            
            'sms_api_key'                              => sanitize_text_field( $_POST['sms_api_key'] ),
            
            // Client SMS
            'sms_pattern_booking'                      => intval( $_POST['sms_pattern_booking'] ),
            'sms_pattern_reminder1'                    => intval( $_POST['sms_pattern_reminder1'] ),
            'sms_pattern_link'                         => intval( $_POST['sms_pattern_link'] ),
            'sms_pattern_inperson_client'              => intval( $_POST['sms_pattern_inperson_client'] ),
            'sms_pattern_phone_client'                 => intval( $_POST['sms_pattern_phone_client'] ),
            'sms_pattern_cancel_by_admin'              => intval( $_POST['sms_pattern_cancel_by_admin'] ),
            'sms_pattern_cancel_by_client_free'        => intval( $_POST['sms_pattern_cancel_by_client_free'] ),
            'sms_pattern_cancel_by_client_late'        => intval( $_POST['sms_pattern_cancel_by_client_late'] ),
            'sms_pattern_reschedule_client'            => intval( $_POST['sms_pattern_reschedule_client'] ),
            'sms_pattern_noshow'                       => intval( $_POST['sms_pattern_noshow'] ),
            
            // Therapist SMS
            'sms_pattern_new_booking_therapist'        => intval( $_POST['sms_pattern_new_booking_therapist'] ),
            'sms_pattern_google_sync'                  => intval( $_POST['sms_pattern_google_sync'] ),
            'sms_pattern_link_therapist'               => intval( $_POST['sms_pattern_link_therapist'] ),
            'sms_pattern_inperson_therapist'           => intval( $_POST['sms_pattern_inperson_therapist'] ),
            'sms_pattern_phone_therapist'              => intval( $_POST['sms_pattern_phone_therapist'] ),
            'sms_pattern_cancel_by_admin_therapist'    => intval( $_POST['sms_pattern_cancel_by_admin_therapist'] ),
            'sms_pattern_cancel_by_client_therapist'   => intval( $_POST['sms_pattern_cancel_by_client_therapist'] ),
            'sms_pattern_reschedule_therapist'         => intval( $_POST['sms_pattern_reschedule_therapist'] ),
            
            // 👈 فیلدهای جدید: پترن‌های پیگیری
            'sms_pattern_followup_therapist'           => intval( $_POST['sms_pattern_followup_therapist'] ),
            'sms_pattern_followup_admin'               => intval( $_POST['sms_pattern_followup_admin'] ),
        );

        update_option( 'tb_therapy_calendar_settings', $data );

        wp_send_json_success( 'تنظیمات با موفقیت ذخیره شد.' );
    }

    public static function get_settings() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        
        $defaults = array(
            'enable_frontend_booking'                  => 1,
            'allow_therapist_online_booking'           => 1,
            'allow_therapist_add_time'                 => 1,
            'cart_expiration'                          => 20,
            'min_booking_notice'                       => 12,
            'max_calendar_horizon'                     => 30,
            'default_buffer_time'                      => 15,
            'free_cancel_window'                       => 24,
            'enable_late_penalty'                      => 0,
            'late_penalty_percent'                     => 30,
            'google_client_id'                         => '',
            'google_client_secret'                     => '',
            'google_event_template'                    => 'مشاوره {نام_مراجع} - {نوع_خدمت}',
            'enable_noshow_penalty'                    => 1,
            'first_reminder_hours'                     => 24,
            'final_reminder_minutes'                   => 20,
            
            // 👈 مقدار پیش‌فرض زمان انتظار پیگیری (۱۲ ساعت)
            'followup_wait_hours'                      => 12,
            
            'sms_api_key'                              => '',
            
            // Client SMS
            'sms_pattern_booking'                      => '',
            'sms_pattern_reminder1'                    => '',
            'sms_pattern_link'                         => '',
            'sms_pattern_inperson_client'              => '',
            'sms_pattern_phone_client'                 => '',
            'sms_pattern_cancel_by_admin'              => '',
            'sms_pattern_cancel_by_client_free'        => '',
            'sms_pattern_cancel_by_client_late'        => '',
            'sms_pattern_reschedule_client'            => '',
            'sms_pattern_noshow'                       => '',
            
            // Therapist SMS
            'sms_pattern_new_booking_therapist'        => '',
            'sms_pattern_google_sync'                  => '',
            'sms_pattern_link_therapist'               => '',
            'sms_pattern_inperson_therapist'           => '',
            'sms_pattern_phone_therapist'              => '',
            'sms_pattern_cancel_by_admin_therapist'    => '',
            'sms_pattern_cancel_by_client_therapist'   => '',
            'sms_pattern_reschedule_therapist'         => '',
            
            // 👈 مقادیر پیش‌فرض پترن‌های پیگیری
            'sms_pattern_followup_therapist'           => '',
            'sms_pattern_followup_admin'               => '',
        );

        $settings = get_option( 'tb_therapy_calendar_settings', $defaults );
        wp_send_json_success( $settings );
    }

    public static function test_sms_connection() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );

        $phone   = sanitize_text_field( $_POST['phone'] );
        $pattern = intval( $_POST['pattern'] );
        $api_key = sanitize_text_field( $_POST['api_key'] );

        if ( empty( $phone ) || empty( $pattern ) || empty( $api_key ) ) {
            wp_send_json_error( 'شماره موبایل، کد پترن و API Key الزامی است.' );
        }

        $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $phone = str_replace($persian, $english, $phone);

        $url = 'https://console.melipayamak.com/api/send/shared/' . $api_key;
        
        $body = array(
            'bodyId' => $pattern,
            'to'     => $phone,
            'args'   => ['تست ۱', 'تست ۲', 'تست ۳', 'تست ۴']
        );

        $response = wp_remote_post( $url, array(
            'method'      => 'POST',
            'timeout'     => 15,
            'redirection' => 5,
            'httpversion' => '1.0',
            'blocking'    => true,
            'headers'     => array(
                'Content-Type' => 'application/json',
            ),
            'body'        => json_encode( $body ),
            'sslverify'   => false
        ));

        if ( is_wp_error( $response ) ) {
            $error_message = $response->get_error_message();
            wp_send_json_error( "خطای ارتباط با سرور پیامک: $error_message" );
        }

        $response_body = wp_remote_retrieve_body( $response );
        $result = json_decode( $response_body, true );

        if ( isset( $result['recId'] ) ) {
            wp_send_json_success( "پیامک با موفقیت ارسال شد. کد رهگیری: " . $result['recId'] );
        } else {
            $status = isset( $result['status'] ) ? $result['status'] : 'خطای نامشخص';
            wp_send_json_error( "خطا از سمت ملی‌پیامک: " . $status );
        }
    }
}
Therapist_Booking_Technical_Settings::init();