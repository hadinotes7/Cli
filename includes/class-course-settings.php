<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Course_Settings {

    public static function init() {
        add_action( 'wp_ajax_tb_save_course_settings', array( __CLASS__, 'save_settings' ) );
        add_action( 'wp_ajax_tb_get_course_settings', array( __CLASS__, 'get_settings' ) );
    }

    public static function save_settings() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );

        $data = array(
            'skyroom_api_key'         => sanitize_text_field( $_POST['skyroom_api_key'] ),
            'enable_waitlist'         => sanitize_text_field( $_POST['enable_waitlist'] ) === 'true' ? 1 : 0,
            'enable_prerequisites'    => sanitize_text_field( $_POST['enable_prerequisites'] ) === 'true' ? 1 : 0,
            'grace_period_days'       => intval( $_POST['grace_period_days'] ),
            'enable_late_fee'         => sanitize_text_field( $_POST['enable_late_fee'] ) === 'true' ? 1 : 0,
            'late_fee_percent'        => intval( $_POST['late_fee_percent'] ),
            
            // SMS Patterns
            'sms_course_start'        => intval( $_POST['sms_course_start'] ),
            'sms_installment_reminder'=> intval( $_POST['sms_installment_reminder'] ),
            'sms_grace_warning'       => intval( $_POST['sms_grace_warning'] ),
            'sms_suspension'          => intval( $_POST['sms_suspension'] ),
            'sms_certificate'         => intval( $_POST['sms_certificate'] ),
            'sms_vod_link'            => intval( $_POST['sms_vod_link'] ),
        );

        update_option( 'tb_course_settings', $data );

        wp_send_json_success( 'تنظیمات دوره‌های آموزشی با موفقیت ذخیره شد.' );
    }

    public static function get_settings() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        
        $defaults = array(
            'skyroom_api_key'         => '',
            'enable_waitlist'         => 1,
            'enable_prerequisites'    => 1,
            'grace_period_days'       => 3,
            'enable_late_fee'         => 0,
            'late_fee_percent'        => 5,
            
            // SMS Patterns
            'sms_course_start'        => '',
            'sms_installment_reminder'=> '',
            'sms_grace_warning'       => '',
            'sms_suspension'          => '',
            'sms_certificate'         => '',
            'sms_vod_link'            => '',
        );

        $settings = get_option( 'tb_course_settings', $defaults );
        wp_send_json_success( $settings );
    }
}
Therapist_Booking_Course_Settings::init();