<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Skyroom_API {

    private static function get_api_key() {
        $settings = get_option( 'tb_course_settings', array() );
        return isset( $settings['skyroom_api_key'] ) ? $settings['skyroom_api_key'] : false;
    }

    private static function request( $action, $params = array() ) {
        $api_key = self::get_api_key();
        if ( ! $api_key ) {
            return new WP_Error( 'no_api_key', 'کلید API اسکای‌روم در تنظیمات ثبت نشده است.' );
        }

        $url = 'https://www.skyroom.online/skyroom/api/' . $api_key;
        
        $body = array(
            'action' => $action,
            'params' => $params
        );

        $response = wp_remote_post( $url, array(
            'method'      => 'POST',
            'timeout'     => 15,
            'headers'     => array( 'Content-Type' => 'application/json' ),
            'body'        => json_encode( $body ),
            'sslverify'   => false
        ));

        if ( is_wp_error( $response ) ) {
            return $response;
        }

        $response_body = wp_remote_retrieve_body( $response );
        $result = json_decode( $response_body, true );

        if ( isset( $result['ok'] ) && $result['ok'] === true ) {
            return $result['result'];
        } else {
            $error_msg = isset( $result['error_message'] ) ? $result['error_message'] : 'خطای نامشخص از سمت اسکای‌روم';
            return new WP_Error( 'skyroom_error', $error_msg );
        }
    }

    // ساخت اتاق جدید برای دوره
    public static function create_room( $name, $title, $max_users ) {
        $params = array(
            'name'           => $name, // باید لاتین و یکتا باشد
            'title'          => $title,
            'guest_login'    => false, // ورود مهمان ممنوع
            'op_login_first' => true,  // اول باید مدرس وارد شود
            'max_users'      => intval( $max_users )
        );

        return self::request( 'createRoom', $params );
    }

    // تولید لینک ورود مستقیم (بدون نیاز به یوزر و پسورد)
    public static function get_login_url( $room_id, $user_id, $nickname, $access = 1, $ttl = 3600 ) {
        $params = array(
            'room_id'    => intval( $room_id ),
            'user_id'    => (string) $user_id, // آیدی کاربر در وردپرس برای جلوگیری از ورود همزمان
            'nickname'   => $nickname, // نام واقعی کاربر
            'access'     => intval( $access ), // 1: کاربر عادی (دانشجو), 3: اپراتور (مدرس)
            'concurrent' => 1,
            'language'   => 'fa',
            'ttl'        => intval( $ttl )
        );

        return self::request( 'createLoginUrl', $params );
    }
}