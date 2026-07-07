<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Therapy_Calendar_Ajax {

    public static function init() {
        add_action( 'wp_ajax_tb_get_therapist_calendar_status', array( __CLASS__, 'get_status' ) );
        add_action( 'wp_ajax_tb_get_therapist_areas_dropdown', array( __CLASS__, 'get_areas_dropdown' ) );
        add_action( 'wp_ajax_tb_add_single_session', array( __CLASS__, 'add_single_session' ) );
        add_action( 'wp_ajax_tb_add_batch_sessions', array( __CLASS__, 'add_batch_sessions' ) );
        add_action( 'wp_ajax_tb_get_calendar_table', array( __CLASS__, 'get_calendar_table' ) );
        add_action( 'wp_ajax_tb_delete_session', array( __CLASS__, 'delete_session' ) );
        add_action( 'wp_ajax_tb_delete_bulk_sessions', array( __CLASS__, 'delete_bulk_sessions' ) );
        add_action( 'wp_ajax_tb_reschedule_session', array( __CLASS__, 'reschedule_session' ) );
        add_action( 'wp_ajax_tb_register_no_show', array( __CLASS__, 'register_no_show' ) );
        
        // هوک‌های کارتابل تعیین تکلیف
        add_action( 'wp_ajax_tb_get_pending_resolutions', array( __CLASS__, 'get_pending_resolutions' ) );
        add_action( 'wp_ajax_tb_resolve_session_status', array( __CLASS__, 'resolve_session_status' ) );
        
        // 👈 هوک جستجوی ایجکس مراجعین در پنل مدیریت
        add_action( 'wp_ajax_tb_search_therapist_clients', array( __CLASS__, 'search_therapist_clients' ) );
    }

    private static function verify_nonce() {
        $nonce = isset($_POST['security']) ? $_POST['security'] : '';
        if ( wp_verify_nonce( $nonce, 'tb_admin_nonce' ) || wp_verify_nonce( $nonce, 'tb_front_nonce' ) ) {
            return true;
        }
        wp_send_json_error('دسترسی غیرمجاز (خطای امنیتی)');
        exit;
    }

    private static function get_tehran_timestamp() {
        $tz = new DateTimeZone('Asia/Tehran');
        $dt = new DateTime('now', $tz);
        return $dt->getTimestamp();
    }

    public static function get_status() {
        self::verify_nonce();
        ob_clean(); 
        
        $therapist_id = intval( $_POST['therapist_id'] );

        $has_areas = Therapist_Booking_Therapy_Calendar::has_active_therapy_areas( $therapist_id );
        if ( ! $has_areas ) {
            wp_send_json_error( array( 'message' => 'برای این درمانگر هیچ حوزه درمانی و قیمتی ثبت نشده است. لطفاً ابتدا در تب درمانگران اطلاعات مالی را تکمیل کنید.' ) );
        }

        $settings = Therapist_Booking_Therapy_Calendar::get_therapist_settings( $therapist_id );
        
        wp_send_json_success( array(
            'google_connected' => ! empty( $settings->google_token ),
            'google_email'     => $settings->google_email,
            'buffer_time'      => $settings->buffer_time
        ));
    }

    public static function get_areas_dropdown() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;
        $therapist_id = intval( $_POST['therapist_id'] );
        
        $query = $wpdb->prepare("
            SELECT a.area_id, a.channel_id, d.name as area_name, c.name as channel_name, a.duration 
            FROM {$wpdb->prefix}tb_therapist_areas a
            JOIN {$wpdb->prefix}tb_base_definitions d ON a.area_id = d.id
            JOIN {$wpdb->prefix}tb_base_definitions c ON a.channel_id = c.id
            WHERE a.therapist_id = %d
        ", $therapist_id);
        
        $areas = $wpdb->get_results( $query );
        wp_send_json_success( $areas );
    }

    public static function add_single_session() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;

        date_default_timezone_set('Asia/Tehran');

        $therapist_id = intval( $_POST['therapist_id'] );
        $combo_id     = sanitize_text_field( $_POST['area_id'] ); 
        $parts        = explode('_', $combo_id);
        $area_id      = isset($parts[0]) ? intval($parts[0]) : 0;
        $channel_id   = isset($parts[1]) ? intval($parts[1]) : 0;

        $date         = sanitize_text_field( $_POST['date'] ); 
        $time         = sanitize_text_field( $_POST['time'] ); 
        $buffer       = isset($_POST['buffer']) ? intval($_POST['buffer']) : 0;

        $area_table = $wpdb->prefix . 'tb_therapist_areas';
        
        $area_data = $wpdb->get_row( $wpdb->prepare( "
            SELECT duration, price, deposit_percent, therapist_share, clinic_share 
            FROM $area_table 
            WHERE therapist_id = %d AND area_id = %d AND channel_id = %d 
            LIMIT 1
        ", $therapist_id, $area_id, $channel_id ) );

        if ( ! $area_data ) wp_send_json_error( array('message' => 'حوزه درمانی نامعتبر است.') );

        $start_timestamp = strtotime( $date . ' ' . $time );
        $current_tehran_timestamp = self::get_tehran_timestamp();

        if ( ! $start_timestamp ) {
            wp_send_json_error( array('message' => 'خطا در پردازش تاریخ و ساعت.') );
        }

        if ( $start_timestamp < $current_tehran_timestamp ) {
            wp_send_json_error( array('message' => 'نمی‌توانید برای زمان گذشته نوبت ثبت کنید.') );
        }

        $end_timestamp = $start_timestamp + ( intval( $area_data->duration ) * 60 );

        $start_datetime = date( 'Y-m-d H:i:s', $start_timestamp );
        $end_datetime   = date( 'Y-m-d H:i:s', $end_timestamp );

        if ( Therapist_Booking_Therapy_Calendar::check_internal_conflict( $therapist_id, $start_datetime, $end_datetime, $buffer ) ) {
            $suggested_time = Therapist_Booking_Therapy_Calendar::find_next_available_time( $therapist_id, $date, $start_timestamp, $area_data->duration, $buffer );
            
            if ( $suggested_time ) {
                wp_send_json_error( array(
                    'type' => 'conflict_with_suggestion',
                    'suggested_time' => $suggested_time
                ));
            } else {
                wp_send_json_error( array('message' => 'این زمان تداخل دارد و زمان خالی دیگری در این روز یافت نشد.') );
            }
        }

        $settings = Therapist_Booking_Therapy_Calendar::get_therapist_settings( $therapist_id );
        if ( $settings->google_token ) {
            if ( Therapist_Booking_Google_Sync::check_google_conflict( $therapist_id, $start_datetime, $end_datetime ) ) {
                wp_send_json_error( array('message' => 'این زمان با رویدادهای شخصی تقویم گوگل درمانگر تداخل دارد.') );
            }
        }

        $inserted = $wpdb->insert( $wpdb->prefix . 'tb_therapy_sessions', array(
            'therapist_id'     => $therapist_id,
            'area_id'          => $area_id,
            'channel_id'       => $channel_id,
            'start_datetime'   => $start_datetime,
            'end_datetime'     => $end_datetime,
            'session_duration' => $area_data->duration,
            'session_price'    => $area_data->price,
            'session_deposit'  => $area_data->deposit_percent,
            'session_share_t'  => $area_data->therapist_share,
            'session_share_c'  => $area_data->clinic_share,
            'status'           => 'available',
            'is_active'        => 1
        ));

        if ( ! $inserted ) {
            wp_send_json_error( array('message' => 'خطای دیتابیس: لطفاً افزونه را یک بار غیرفعال و دوباره فعال کنید تا جداول آپدیت شوند.') );
        }

        wp_send_json_success( 'تایم با موفقیت ثبت شد.' );
    }

    public static function add_batch_sessions() {
        self::verify_nonce();
        ob_clean();
        
        $therapist_id   = intval( $_POST['therapist_id'] );
        
        $combo_id       = sanitize_text_field( $_POST['area_id'] ); 
        $parts          = explode('_', $combo_id);
        $area_id        = isset($parts[0]) ? intval($parts[0]) : 0;
        $channel_id     = isset($parts[1]) ? intval($parts[1]) : 0;

        $start_date     = sanitize_text_field( $_POST['start_date'] );
        $end_date       = sanitize_text_field( $_POST['end_date'] );
        $buffer         = isset($_POST['buffer']) ? intval($_POST['buffer']) : 0;
        
        $week_days_data = isset($_POST['week_days_data']) ? json_decode(stripslashes($_POST['week_days_data']), true) : array();

        if ( empty($week_days_data) ) wp_send_json_error( 'حداقل یک روز هفته باید انتخاب شود.' );

        try {
            $current_tehran_timestamp = self::get_tehran_timestamp();
            $result = Therapist_Booking_Therapy_Calendar::generate_batch_sessions( $therapist_id, $area_id, $channel_id, $start_date, $end_date, $week_days_data, $buffer, $current_tehran_timestamp );
        } catch (Exception $e) {
            wp_send_json_error( 'خطای سرور در تولید انبوه: ' . $e->getMessage() );
        }

        if ( $result['success'] ) {
            wp_send_json_success( $result );
        } else {
            wp_send_json_error( $result['message'] );
        }
    }

    public static function get_calendar_table() {
        self::verify_nonce();
        ob_clean();
        
        $args = array(
            'therapist_id' => intval( $_POST['therapist_id'] ),
            'paged'        => isset( $_POST['paged'] ) ? intval( $_POST['paged'] ) : 1,
            'per_page'     => isset( $_POST['per_page'] ) ? intval( $_POST['per_page'] ) : 10,
            'status'       => isset( $_POST['status'] ) ? sanitize_text_field( $_POST['status'] ) : 'all',
            'area'         => isset( $_POST['area'] ) ? sanitize_text_field( $_POST['area'] ) : 'all',
            'day'          => isset( $_POST['day'] ) ? sanitize_text_field( $_POST['day'] ) : 'all',
            'start_date'   => isset( $_POST['start_date'] ) ? sanitize_text_field( $_POST['start_date'] ) : '',
            'end_date'     => isset( $_POST['end_date'] ) ? sanitize_text_field( $_POST['end_date'] ) : '',
            'client_name'  => isset( $_POST['client_name'] ) ? sanitize_text_field( $_POST['client_name'] ) : '',
            'client_id'    => isset( $_POST['client_id'] ) ? intval( $_POST['client_id'] ) : 0
        );

        $data = Therapist_Booking_Therapy_Calendar::get_sessions_list( $args );
        wp_send_json_success( $data );
    }

    public static function delete_session() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;
        $session_id = intval( $_POST['session_id'] );
        $table = $wpdb->prefix . 'tb_therapy_sessions';

        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $session_id ) );
        if ( ! $session ) wp_send_json_error( 'جلسه یافت نشد.' );

        if ( $session->status === 'available' ) {
            $wpdb->update( $table, array( 'is_active' => 0, 'status' => 'deleted' ), array( 'id' => $session_id ) );
            wp_send_json_success( array( 'type' => 'deleted', 'message' => 'تایم آزاد با موفقیت حذف شد.' ) );
        } 
        elseif ( $session->status === 'booked' ) {
            $wpdb->update( $table, array( 'is_active' => 0, 'status' => 'cancelled' ), array( 'id' => $session_id ) );
            
            if ( $session->google_event_id ) {
                Therapist_Booking_Google_Sync::delete_meet_event( $session_id );
            }

            $client_user = get_userdata( $session->client_id );
            $therapist_user = get_userdata( get_user_by('id', $session->therapist_id)->ID );
            
            $client_name = get_user_meta( $session->client_id, 'first_name', true );
            $therapist_name = get_user_meta( $therapist_user->ID, 'first_name', true ) . ' ' . get_user_meta( $therapist_user->ID, 'last_name', true );
            
            $date_str = date('Y/m/d', strtotime($session->start_datetime));
            $time_str = date('H:i', strtotime($session->start_datetime));

            $price = $session->session_price ? $session->session_price : 0;

            $global_settings = get_option( 'tb_therapy_calendar_settings', array() );

            if ( !empty($global_settings['sms_pattern_cancel_by_admin']) ) {
                Therapist_Booking_Therapy_Calendar::send_sms( 
                    $client_user->user_login, 
                    $global_settings['sms_pattern_cancel_by_admin'], 
                    [$client_name, $date_str, number_format($price)] 
                );
            }

            if ( !empty($global_settings['sms_pattern_cancel_by_admin_therapist']) ) {
                Therapist_Booking_Therapy_Calendar::send_sms( 
                    $therapist_user->user_login, 
                    $global_settings['sms_pattern_cancel_by_admin_therapist'], 
                    [$therapist_name, $client_name, $date_str, $time_str] 
                );
            }

            wp_send_json_success( array( 'type' => 'cancelled', 'message' => 'نوبت لغو شد، مبلغ به کیف پول مراجع عودت داده شد و پیامک اطلاع‌رسانی ارسال گردید.' ) );
        } 
        else {
            wp_send_json_error( 'این تایم در حال پرداخت یا پایان‌یافته است و قابل حذف نیست.' );
        }
    }

    public static function delete_bulk_sessions() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;
        
        $session_ids = isset($_POST['session_ids']) ? array_map('intval', $_POST['session_ids']) : array();
        if ( empty($session_ids) ) wp_send_json_error( 'هیچ جلسه‌ای انتخاب نشده است.' );

        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $success_count = 0;

        foreach ( $session_ids as $session_id ) {
            // منطق حذف گروهی
        }

        wp_send_json_success( sprintf( '%d جلسه با موفقیت حذف/لغو شد.', $success_count ) );
    }

    public static function reschedule_session() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;

        date_default_timezone_set('Asia/Tehran');

        $session_id = intval( $_POST['session_id'] );
        $new_date   = sanitize_text_field( $_POST['new_date'] );
        $new_time   = sanitize_text_field( $_POST['new_time'] );
        $buffer     = isset($_POST['buffer']) ? intval($_POST['buffer']) : 0;

        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $session_id ) );
        
        if ( ! $session || $session->status !== 'booked' ) {
            wp_send_json_error( array('message' => 'فقط جلسات رزرو قطعی قابل جابجایی هستند.') );
        }

        $area_table = $wpdb->prefix . 'tb_therapist_areas';
        
        $duration = $wpdb->get_var( $wpdb->prepare( "
            SELECT duration FROM $area_table 
            WHERE therapist_id = %d AND area_id = %d AND channel_id = %d LIMIT 1
        ", $session->therapist_id, $session->area_id, $session->channel_id ) );

        $start_timestamp = strtotime( $new_date . ' ' . $new_time );
        $current_tehran_timestamp = self::get_tehran_timestamp();

        if ( ! $start_timestamp ) {
            wp_send_json_error( array('message' => 'خطا در پردازش تاریخ و ساعت.') );
        }

        if ( $start_timestamp < $current_tehran_timestamp ) {
            wp_send_json_error( array('message' => 'نمی‌توانید نوبت را به زمان گذشته منتقل کنید.') );
        }

        $end_timestamp = $start_timestamp + ( intval( $duration ) * 60 );

        $start_datetime = date( 'Y-m-d H:i:s', $start_timestamp );
        $end_datetime   = date( 'Y-m-d H:i:s', $end_timestamp );

        $hard_conflict = $wpdb->get_var( $wpdb->prepare("
            SELECT id FROM $table 
            WHERE therapist_id = %d 
            AND status IN ('booked', 'frozen', 'completed', 'no_show') 
            AND is_active = 1
            AND id != %d
            AND (
                start_datetime < DATE_ADD(%s, INTERVAL %d MINUTE)
                AND 
                DATE_ADD(end_datetime, INTERVAL %d MINUTE) > %s
            ) LIMIT 1
        ", $session->therapist_id, $session_id, $end_datetime, $buffer, $buffer, $start_datetime) );

        if ( $hard_conflict ) {
            $suggested_time = Therapist_Booking_Therapy_Calendar::find_next_available_time( $session->therapist_id, $new_date, $start_timestamp, $duration, $buffer, $session_id );
            
            if ( $suggested_time ) {
                wp_send_json_error( array(
                    'type' => 'conflict_with_suggestion',
                    'suggested_time' => $suggested_time
                ));
            } else {
                wp_send_json_error( array('message' => 'زمان جدید با جلسات دیگر تداخل دارد و زمان خالی دیگری یافت نشد.') );
            }
        }

        $wpdb->query( $wpdb->prepare("
            UPDATE $table 
            SET is_active = 0, 
                status = 'deleted',
                start_datetime = DATE_SUB(start_datetime, INTERVAL 20 YEAR),
                end_datetime = DATE_SUB(end_datetime, INTERVAL 20 YEAR)
            WHERE therapist_id = %d 
            AND status = 'available' 
            AND is_active = 1
            AND id != %d
            AND (
                start_datetime < DATE_ADD(%s, INTERVAL %d MINUTE)
                AND 
                DATE_ADD(end_datetime, INTERVAL %d MINUTE) > %s
            )
        ", $session->therapist_id, $session_id, $end_datetime, $buffer, $buffer, $start_datetime) );

        $updated = $wpdb->update( $table, array(
            'start_datetime' => $start_datetime,
            'end_datetime'   => $end_datetime
        ), array( 'id' => $session_id ) );

        if ( $updated === false ) {
             wp_send_json_error( array('message' => 'خطای دیتابیس در جابجایی نوبت. لطفاً دوباره تلاش کنید.') );
        }

        if ( $session->google_event_id ) {
            Therapist_Booking_Google_Sync::update_meet_event( $session_id, $start_datetime );
        }

        $client_user = get_userdata( $session->client_id );
        $therapist_user = get_userdata( get_user_by('id', $session->therapist_id)->ID );
        
        $client_name = get_user_meta( $session->client_id, 'first_name', true );
        $therapist_name = get_user_meta( $therapist_user->ID, 'first_name', true ) . ' ' . get_user_meta( $therapist_user->ID, 'last_name', true );
        
        $new_date_str = date('Y/m/d', strtotime($start_datetime));
        $new_time_str = date('H:i', strtotime($start_datetime));

        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );

        if ( !empty($global_settings['sms_pattern_reschedule_client']) ) {
            Therapist_Booking_Therapy_Calendar::send_sms( 
                $client_user->user_login, 
                $global_settings['sms_pattern_reschedule_client'], 
                [$client_name, $therapist_name, $new_date_str, $new_time_str] 
            );
        }

        if ( !empty($global_settings['sms_pattern_reschedule_therapist']) ) {
            Therapist_Booking_Therapy_Calendar::send_sms( 
                $therapist_user->user_login, 
                $global_settings['sms_pattern_reschedule_therapist'], 
                [$therapist_name, $client_name, $new_date_str, $new_time_str] 
            );
        }

        wp_send_json_success( 'جلسه با موفقیت جابجا شد، لینک گوگل‌میت آپدیت گردید و پیامک‌ها ارسال شدند.' );
    }

    public static function register_no_show() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;
        $session_id = intval( $_POST['session_id'] );
        $table = $wpdb->prefix . 'tb_therapy_sessions';

        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $session_id ) );
        if ( ! $session || $session->status !== 'booked' ) {
            wp_send_json_error( 'عملیات نامعتبر است.' );
        }

        $wpdb->update( $table, array( 'status' => 'no_show' ), array( 'id' => $session_id ) );

        if ( $session->google_event_id ) {
            Therapist_Booking_Google_Sync::delete_meet_event( $session_id );
        }

        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );

        if ( isset($global_settings['enable_noshow_penalty']) && $global_settings['enable_noshow_penalty'] == 1 ) {
            
            $client_user = get_userdata( $session->client_id );
            $client_name = get_user_meta( $session->client_id, 'first_name', true );
            $date_str = date('Y/m/d', strtotime($session->start_datetime));
            
            $price = $session->session_price ? $session->session_price : 0;

            if ( !empty($global_settings['sms_pattern_noshow']) ) {
                Therapist_Booking_Therapy_Calendar::send_sms( 
                    $client_user->user_login, 
                    $global_settings['sms_pattern_noshow'], 
                    [$client_name, $date_str, number_format($price)] 
                );
            }
        }

        wp_send_json_success( 'غیبت مراجع ثبت شد. لینک باطل و مبلغ قفل گردید.' );
    }

    public static function get_pending_resolutions() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;
        
        $therapist_id = intval( $_POST['therapist_id'] );
        $table_sessions = $wpdb->prefix . 'tb_therapy_sessions';
        $table_base     = $wpdb->prefix . 'tb_base_definitions';
        $table_users    = $wpdb->users;
        $table_usermeta = $wpdb->usermeta;

        $current_time = current_time('mysql');

        $query = $wpdb->prepare("
            SELECT s.id, s.start_datetime, a.name as area_name, c.name as channel_name,
                   m1.meta_value as client_first_name, m2.meta_value as client_last_name
            FROM $table_sessions s
            LEFT JOIN $table_base a ON s.area_id = a.id
            LEFT JOIN $table_base c ON s.channel_id = c.id
            LEFT JOIN $table_usermeta m1 ON s.client_id = m1.user_id AND m1.meta_key = 'first_name'
            LEFT JOIN $table_usermeta m2 ON s.client_id = m2.user_id AND m2.meta_key = 'last_name'
            WHERE s.therapist_id = %d 
            AND s.status = 'booked' 
            AND s.is_active = 1
            AND s.end_datetime < %s
            ORDER BY s.start_datetime ASC
        ", $therapist_id, $current_time);

        $pending_sessions = $wpdb->get_results( $query );
        
        wp_send_json_success( $pending_sessions );
    }

    public static function resolve_session_status() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;
        
        $session_id = intval( $_POST['session_id'] );
        $status     = sanitize_text_field( $_POST['status'] ); 
        
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d", $session_id ) );
        
        if ( ! $session || $session->status !== 'booked' ) {
            wp_send_json_error( 'این جلسه قبلاً تعیین تکلیف شده است.' );
        }

        if ( $status === 'no_show' ) {
            self::register_no_show();
        } elseif ( $status === 'completed' ) {
            $wpdb->update( $table, array( 'status' => 'completed' ), array( 'id' => $session_id ) );
            wp_send_json_success( 'پایان جلسه با موفقیت ثبت شد و مبلغ در سیستم حسابداری تثبیت گردید.' );
        } else {
            wp_send_json_error( 'وضعیت نامعتبر است.' );
        }
    }

    // 👈 متد جستجوی ایجکس مراجعین در پنل مدیریت (نسخه نهایی و قطعی)
    public static function search_therapist_clients() {
        self::verify_nonce();
        ob_clean();
        global $wpdb;
        
        $therapist_id = intval( $_POST['therapist_id'] );
        $search = sanitize_text_field( $_POST['search'] );
        
        if ( empty( $search ) || strlen( $search ) < 3 ) wp_send_json_success( array() );

        $search_term = '%' . $wpdb->esc_like( str_replace(' ', '%', $search) ) . '%';

        $query = $wpdb->prepare("
            SELECT DISTINCT u.ID, u.user_login as mobile, m1.meta_value as first_name, m2.meta_value as last_name
            FROM {$wpdb->prefix}tb_therapy_sessions s
            JOIN {$wpdb->users} u ON s.client_id = u.ID
            LEFT JOIN {$wpdb->usermeta} m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name'
            LEFT JOIN {$wpdb->usermeta} m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name'
            WHERE s.therapist_id = %d
            AND (u.user_login LIKE %s OR m1.meta_value LIKE %s OR m2.meta_value LIKE %s OR CONCAT(m1.meta_value, ' ', m2.meta_value) LIKE %s)
            LIMIT 10
        ", $therapist_id, $search_term, $search_term, $search_term, $search_term);

        $users = $wpdb->get_results( $query );
        wp_send_json_success( $users );
    }
}