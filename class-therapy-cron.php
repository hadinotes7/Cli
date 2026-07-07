<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Therapy_Cron {

    public static function init() {
        add_action( 'wp', array( __CLASS__, 'schedule_events' ) );
        add_action( 'tb_cron_release_expired_carts', array( __CLASS__, 'release_expired_carts' ) );
        add_action( 'tb_cron_process_20min_reminders', array( __CLASS__, 'process_20min_reminders' ) );
        add_action( 'tb_cron_process_daily_reminders', array( __CLASS__, 'process_daily_reminders' ) );
        
        // 👈 هوک جدید برای کرون‌جاب پیگیری جلسات معلق
        add_action( 'tb_cron_process_followups', array( __CLASS__, 'process_followups' ) );
    }

    public static function schedule_events() {
        if ( ! wp_next_scheduled( 'tb_cron_release_expired_carts' ) ) {
            wp_schedule_event( time(), 'every_minute', 'tb_cron_release_expired_carts' );
        }
        if ( ! wp_next_scheduled( 'tb_cron_process_20min_reminders' ) ) {
            wp_schedule_event( time(), 'every_five_minutes', 'tb_cron_process_20min_reminders' );
        }
        if ( ! wp_next_scheduled( 'tb_cron_process_daily_reminders' ) ) {
            wp_schedule_event( time(), 'hourly', 'tb_cron_process_daily_reminders' );
        }
        
        // 👈 زمان‌بندی کرون‌جاب پیگیری (هر یک ساعت چک می‌کند)
        if ( ! wp_next_scheduled( 'tb_cron_process_followups' ) ) {
            wp_schedule_event( time(), 'hourly', 'tb_cron_process_followups' );
        }
    }

    public static function release_expired_carts() {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $wpdb->query( "
            UPDATE $table 
            SET status = 'available', locked_until = NULL, client_id = NULL 
            WHERE status = 'frozen' AND locked_until < NOW()
        " );
    }

    public static function process_20min_reminders() {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        
        $reminder_minutes = isset($global_settings['final_reminder_minutes']) ? intval($global_settings['final_reminder_minutes']) : 20;
        
        $column_check = $wpdb->get_results("SHOW COLUMNS FROM $table LIKE 'link_sent'");
        if (empty($column_check)) {
            $wpdb->query("ALTER TABLE $table ADD link_sent tinyint(1) DEFAULT 0");
        }

        $min_time = $reminder_minutes - 5;
        $max_time = $reminder_minutes + 5;

        $sessions = $wpdb->get_results( $wpdb->prepare("
            SELECT s.*, c.channel_nature 
            FROM $table s
            JOIN {$wpdb->prefix}tb_therapist_areas ta ON s.area_id = ta.area_id AND s.therapist_id = ta.therapist_id
            JOIN {$wpdb->prefix}tb_base_definitions c ON ta.channel_id = c.id
            WHERE s.status = 'booked' 
            AND s.link_sent = 0
            AND s.start_datetime BETWEEN DATE_ADD(NOW(), INTERVAL %d MINUTE) AND DATE_ADD(NOW(), INTERVAL %d MINUTE)
        ", $min_time, $max_time) );

        foreach ( $sessions as $session ) {
            $client_user = get_userdata( $session->client_id );
            $therapist_user = get_userdata( get_user_by('id', $session->therapist_id)->ID );
            
            $client_name = get_user_meta( $session->client_id, 'first_name', true );
            $therapist_name = get_user_meta( $therapist_user->ID, 'first_name', true ) . ' ' . get_user_meta( $therapist_user->ID, 'last_name', true );
            
            $nature = $session->channel_nature;

            if ( $nature === 'online' ) {
                if ( !empty($global_settings['sms_pattern_link']) ) {
                    Therapist_Booking_Therapy_Calendar::send_sms( $client_user->user_login, $global_settings['sms_pattern_link'], [$client_name, $therapist_name, $reminder_minutes, $session->meet_link] );
                }
                if ( !empty($global_settings['sms_pattern_link_therapist']) ) {
                    Therapist_Booking_Therapy_Calendar::send_sms( $therapist_user->user_login, $global_settings['sms_pattern_link_therapist'], [$therapist_name, $client_name, $reminder_minutes, $session->meet_link] );
                }
            } 
            elseif ( $nature === 'inperson' ) {
                $clinic_address = 'آدرس کلینیک'; 
                if ( !empty($global_settings['sms_pattern_inperson_client']) ) {
                    Therapist_Booking_Therapy_Calendar::send_sms( $client_user->user_login, $global_settings['sms_pattern_inperson_client'], [$client_name, $therapist_name, $reminder_minutes, $clinic_address] );
                }
                if ( !empty($global_settings['sms_pattern_inperson_therapist']) ) {
                    Therapist_Booking_Therapy_Calendar::send_sms( $therapist_user->user_login, $global_settings['sms_pattern_inperson_therapist'], [$therapist_name, $client_name, $reminder_minutes] );
                }
            } 
            elseif ( $nature === 'phone' ) {
                $clinic_phone = 'شماره کلینیک';
                if ( !empty($global_settings['sms_pattern_phone_client']) ) {
                    Therapist_Booking_Therapy_Calendar::send_sms( $client_user->user_login, $global_settings['sms_pattern_phone_client'], [$client_name, $therapist_name, $reminder_minutes, $clinic_phone] );
                }
                if ( !empty($global_settings['sms_pattern_phone_therapist']) ) {
                    Therapist_Booking_Therapy_Calendar::send_sms( $therapist_user->user_login, $global_settings['sms_pattern_phone_therapist'], [$therapist_name, $client_name, $reminder_minutes, $client_user->user_login] );
                }
            }

            $wpdb->update( $table, array('link_sent' => 1), array('id' => $session->id) );
        }
    }

    public static function process_daily_reminders() {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        
        $reminder_hours = isset($global_settings['first_reminder_hours']) ? intval($global_settings['first_reminder_hours']) : 24;
        
        $column_check = $wpdb->get_results("SHOW COLUMNS FROM $table LIKE 'reminder_sent'");
        if (empty($column_check)) {
            $wpdb->query("ALTER TABLE $table ADD reminder_sent tinyint(1) DEFAULT 0");
        }

        $min_time = $reminder_hours - 1;
        $max_time = $reminder_hours + 1;

        $sessions = $wpdb->get_results( $wpdb->prepare("
            SELECT * FROM $table 
            WHERE status = 'booked' 
            AND reminder_sent = 0
            AND start_datetime BETWEEN DATE_ADD(NOW(), INTERVAL %d HOUR) AND DATE_ADD(NOW(), INTERVAL %d HOUR)
        ", $min_time, $max_time) );

        foreach ( $sessions as $session ) {
            $client_user = get_userdata( $session->client_id );
            $client_name = get_user_meta( $session->client_id, 'first_name', true );
            
            $time_str = date('H:i', strtotime($session->start_datetime));
            
            $session_date = date('Y-m-d', strtotime($session->start_datetime));
            $tomorrow = date('Y-m-d', strtotime('+1 day'));
            $day_text = ($session_date == $tomorrow) ? 'فردا' : 'امروز';

            if ( !empty($global_settings['sms_pattern_reminder1']) ) {
                Therapist_Booking_Therapy_Calendar::send_sms( 
                    $client_user->user_login, 
                    $global_settings['sms_pattern_reminder1'], 
                    [$client_name, $day_text, $time_str] 
                );
            }

            $wpdb->update( $table, array('reminder_sent' => 1), array('id' => $session->id) );
        }
    }

    // 👈 متد جدید: پیگیری جلسات معلق (The Watchdog)
    public static function process_followups() {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        
        // خواندن زمان انتظار از تنظیمات (پیش‌فرض ۱۲ ساعت)
        $wait_hours = isset($global_settings['followup_wait_hours']) ? intval($global_settings['followup_wait_hours']) : 12;
        
        // پیدا کردن جلساتی که وضعیتشان هنوز booked است و از زمان پایان آن‌ها به اندازه wait_hours گذشته است
        $sessions = $wpdb->get_results( $wpdb->prepare("
            SELECT * FROM $table 
            WHERE status = 'booked' 
            AND followup_sent = 0
            AND end_datetime < DATE_SUB(NOW(), INTERVAL %d HOUR)
        ", $wait_hours) );

        // دریافت شماره موبایل مدیر کلینیک از تنظیمات پایه (برای ارسال پیامک به مدیر)
        $base_settings = get_option( 'tb_clinic_base_info', array() );
        $admin_mobile = isset($base_settings['manager_mobile']) ? $base_settings['manager_mobile'] : '';

        foreach ( $sessions as $session ) {
            $client_name = get_user_meta( $session->client_id, 'first_name', true ) . ' ' . get_user_meta( $session->client_id, 'last_name', true );
            
            $therapist_user = get_userdata( get_user_by('id', $session->therapist_id)->ID );
            $therapist_name = get_user_meta( $therapist_user->ID, 'first_name', true ) . ' ' . get_user_meta( $therapist_user->ID, 'last_name', true );
            
            // تبدیل تاریخ میلادی به شمسی برای پیامک (ساده)
            $date_str = date('Y/m/d', strtotime($session->start_datetime));

            // ۱. ارسال پیامک تلنگر به درمانگر
            if ( !empty($global_settings['sms_pattern_followup_therapist']) ) {
                Therapist_Booking_Therapy_Calendar::send_sms( 
                    $therapist_user->user_login, 
                    $global_settings['sms_pattern_followup_therapist'], 
                    [$therapist_name, $client_name, $date_str] 
                );
            }

            // ۲. ارسال پیامک تلنگر به مدیر کلینیک
            if ( !empty($admin_mobile) && !empty($global_settings['sms_pattern_followup_admin']) ) {
                Therapist_Booking_Therapy_Calendar::send_sms( 
                    $admin_mobile, 
                    $global_settings['sms_pattern_followup_admin'], 
                    [$therapist_name, $client_name] 
                );
            }

            // آپدیت فلگ ارسال در دیتابیس تا پیامک تکراری نرود
            $wpdb->update( $table, array('followup_sent' => 1), array('id' => $session->id) );
        }
    }
}

add_filter( 'cron_schedules', function ( $schedules ) {
    $schedules['every_minute'] = array(
        'interval' => 60,
        'display'  => 'هر یک دقیقه'
    );
    $schedules['every_five_minutes'] = array(
        'interval' => 300,
        'display'  => 'هر پنج دقیقه'
    );
    return $schedules;
});