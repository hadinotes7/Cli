<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Frontend_Dashboard {

    public static function init() {
        add_shortcode( 'tb_therapist_dashboard', array( __CLASS__, 'render_dashboard_shell' ) );
        add_action( 'wp_ajax_tb_load_dashboard_view', array( __CLASS__, 'load_view' ) );
        add_action( 'wp_ajax_tb_front_mark_session_status', array( __CLASS__, 'mark_session_status' ) );
        add_action( 'wp_ajax_tb_front_get_calendar_table', array( __CLASS__, 'get_calendar_table' ) );
        add_action( 'wp_ajax_tb_front_get_areas', array( __CLASS__, 'get_front_areas' ) );
        
        add_action( 'wp_ajax_tb_front_get_pending_resolutions', array( __CLASS__, 'get_pending_resolutions' ) );
        add_action( 'wp_ajax_tb_front_resolve_session_status', array( __CLASS__, 'resolve_session_status' ) );
        add_action( 'wp_ajax_tb_front_search_therapist_clients', array( __CLASS__, 'search_therapist_clients' ) );
    }

    public static function to_persian_num($string) {
        $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        return str_replace($english, $persian, $string);
    }

    public static function get_current_therapist() {
        if ( ! is_user_logged_in() ) return false;
        global $wpdb;
        $user_id = get_current_user_id();
        $table = $wpdb->prefix . 'tb_therapists';
        $therapist = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE user_id = %d AND is_active = 1", $user_id ) );
        return $therapist ? $therapist : false;
    }

    public static function get_current_therapist_id() {
        $therapist = self::get_current_therapist();
        return $therapist ? intval( $therapist->id ) : false;
    }

    public static function render_dashboard_shell() {
        if ( ! is_user_logged_in() ) {
            return '<div style="padding:20px; background:#fee2e2; color:#CC4748; border-radius:10px; text-align:center; font-family:tahoma;">برای مشاهده داشبورد ابتدا وارد سایت شوید.</div>';
        }

        $therapist = self::get_current_therapist();
        if ( ! $therapist ) {
            return '<div style="padding:20px; background:#ffedd5; color:#ea580c; border-radius:10px; text-align:center; font-family:tahoma;">شما به عنوان درمانگر در سیستم ثبت نشده‌اید.</div>';
        }

        $v = time();
        wp_enqueue_style( 'tb-persian-datepicker-css', TB_URL . 'assets/css/persian-datepicker.min.css', array(), $v );
        wp_enqueue_style( 'tb-clockpicker-css', TB_URL . 'assets/css/jquery-clockpicker.min.css', array(), $v );
        wp_enqueue_style( 'tb-front-dashboard-css', TB_URL . 'assets/css/tb-therapist-dashboard.css', array(), $v );
        
        wp_enqueue_script( 'tb-persian-date-js', TB_URL . 'assets/js/persian-date.min.js', array('jquery'), $v, true );
        wp_enqueue_script( 'tb-persian-datepicker-js', TB_URL . 'assets/js/persian-datepicker.min.js', array('jquery', 'tb-persian-date-js'), $v, true );
        wp_enqueue_script( 'tb-clockpicker-js', TB_URL . 'assets/js/jquery-clockpicker.min.js', array('jquery'), $v, true );
        wp_enqueue_script( 'tb-core-script', TB_URL . 'assets/js/tb-core.js', array('jquery'), $v, true );
        wp_enqueue_script( 'tb-front-dashboard-js', TB_URL . 'assets/js/tb-dashboard-app.js', array('jquery', 'tb-core-script'), $v, true );

$global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        $reminder_minutes = isset($global_settings['final_reminder_minutes']) ? intval($global_settings['final_reminder_minutes']) : 20;
        
        // 👈 محاسبه دقیق تاریخ فردا بر اساس زمان تهران
        $current_tehran_time = current_time('timestamp');
        $tomorrow_date = date('Y-m-d', strtotime('+1 day', $current_tehran_time));

        wp_localize_script( 'tb-front-dashboard-js', 'TB_Front', array(
            'ajaxurl'     => admin_url( 'admin-ajax.php' ),
            'nonce'       => wp_create_nonce( 'tb_front_nonce' ),
            'admin_nonce' => wp_create_nonce( 'tb_admin_nonce' ),
            't_id'        => $therapist->id,
            'reminder_min'=> $reminder_minutes,
            'tomorrow'    => $tomorrow_date // 👈 ارسال تاریخ دقیق فردا به جاوااسکریپت
        ));
        
        ob_start();
        include TB_DIR . 'templates/frontend/dashboard-shell.php';
        return ob_get_clean();
    }

    public static function load_view() {
        register_shutdown_function(function() {
            $error = error_get_last();
            if ($error && in_array($error['type'], [E_ERROR, E_PARSE, E_CORE_ERROR, E_COMPILE_ERROR, E_USER_ERROR])) {
                ob_clean();
                wp_send_json_error("🔥 خطای مهلک PHP: " . $error['message'] . " | در فایل: " . basename($error['file']) . " | خط: " . $error['line']);
            }
        });

        check_ajax_referer( 'tb_front_nonce', 'security' );
        $therapist = self::get_current_therapist();
        if ( ! $therapist ) wp_send_json_error('دسترسی غیرمجاز');

        $view = sanitize_text_field( $_POST['view'] );
        global $wpdb;

        $is_therapist = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}tb_therapist_areas WHERE therapist_id = %d", $therapist->id ) ) > 0;
        $is_instructor = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM {$wpdb->prefix}tb_therapist_courses WHERE therapist_id = %d", $therapist->id ) ) > 0;

        ob_start();
        
        try {
            if ( $view === 'profile' ) {
                $user = get_userdata( $therapist->user_id );
                if ( $user ) {
                    $therapist->mobile = $user->user_login;
                } else {
                    $therapist->mobile = 'نامشخص';
                }

                $therapist->first_name = get_user_meta( $therapist->user_id, 'first_name', true );
                $therapist->last_name  = get_user_meta( $therapist->user_id, 'last_name', true );
                $therapist->gender     = get_user_meta( $therapist->user_id, 'therapist_gender', true );
                $therapist->dob        = get_user_meta( $therapist->user_id, 'therapist_dob', true );
                
                $settings = Therapist_Booking_Therapy_Calendar::get_therapist_settings( $therapist->id );
                $google_email = isset($settings->google_email) ? $settings->google_email : null;
                
                $areas = $wpdb->get_results( $wpdb->prepare( "
                    SELECT a.*, d1.name as area_name, d2.name as channel_name 
                    FROM {$wpdb->prefix}tb_therapist_areas a
                    JOIN {$wpdb->prefix}tb_base_definitions d1 ON a.area_id = d1.id
                    JOIN {$wpdb->prefix}tb_base_definitions d2 ON a.channel_id = d2.id
                    WHERE a.therapist_id = %d", $therapist->id 
                ));

                $courses = $wpdb->get_results( $wpdb->prepare( "
                    SELECT c.*, d1.name as group_name, d2.name as course_name, d3.name as structure_name, d4.name as channel_name 
                    FROM {$wpdb->prefix}tb_therapist_courses c
                    JOIN {$wpdb->prefix}tb_base_definitions d1 ON c.group_id = d1.id
                    JOIN {$wpdb->prefix}tb_base_definitions d2 ON c.course_id = d2.id
                    JOIN {$wpdb->prefix}tb_base_definitions d3 ON c.structure_id = d3.id
                    JOIN {$wpdb->prefix}tb_base_definitions d4 ON c.channel_id = d4.id
                    WHERE c.therapist_id = %d", $therapist->id 
                ));

                include TB_DIR . 'templates/frontend/views/view-profile.php';
            } 
            elseif ( $view === 'consultant' ) {
                $current_therapist_id = $therapist->id;
                $settings = Therapist_Booking_Therapy_Calendar::get_therapist_settings( $current_therapist_id );
                $is_google_connected = !empty($settings->google_token);
                $google_auth_url = Therapist_Booking_Google_Sync::get_auth_url( $current_therapist_id );
                
                $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
                $allow_add_time = isset($global_settings['allow_therapist_add_time']) ? intval($global_settings['allow_therapist_add_time']) : 1;

                $allow_online = isset($global_settings['allow_therapist_online_booking']) ? intval($global_settings['allow_therapist_online_booking']) : 1;
                $online_condition = "";
                if ( $allow_online === 0 ) {
                    $online_condition = " AND c.channel_nature != 'online' ";
                }

                $has_allowed_areas = $wpdb->get_var( $wpdb->prepare( "
                    SELECT COUNT(*) 
                    FROM {$wpdb->prefix}tb_therapist_areas a
                    JOIN {$wpdb->prefix}tb_base_definitions c ON a.channel_id = c.id
                    WHERE a.therapist_id = %d $online_condition
                ", $therapist->id ) ) > 0;

                include TB_DIR . 'templates/frontend/views/view-consultant.php';
            }
            elseif ( $view === 'instructor' ) {
                include TB_DIR . 'templates/frontend/views/view-instructor.php';
            }
         elseif ( $view === 'overview' ) {
                // 👈 حل قطعی باگ تغییر روز: استفاده از زمان محلی وردپرس (تهران) به جای زمان سرور
                $current_tehran_time = current_time('timestamp');
                $today_start = date('Y-m-d 00:00:00', $current_tehran_time);
                $today_end   = date('Y-m-d 23:59:59', $current_tehran_time);
                
                $query_base = "
                    SELECT s.*, a.name as area_name, c.name as channel_name, c.channel_nature, ta.duration,
                           u.user_login as client_mobile, m1.meta_value as client_first_name, m2.meta_value as client_last_name
                    FROM {$wpdb->prefix}tb_therapy_sessions s
                    LEFT JOIN {$wpdb->prefix}tb_base_definitions a ON s.area_id = a.id
                    LEFT JOIN {$wpdb->prefix}tb_therapist_areas ta ON s.area_id = ta.area_id AND s.channel_id = ta.channel_id AND s.therapist_id = ta.therapist_id
                    LEFT JOIN {$wpdb->prefix}tb_base_definitions c ON s.channel_id = c.id
                    LEFT JOIN {$wpdb->users} u ON s.client_id = u.ID
                    LEFT JOIN {$wpdb->usermeta} m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name'
                    LEFT JOIN {$wpdb->usermeta} m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name'
                    WHERE s.therapist_id = %d AND s.status = 'booked' AND s.is_active = 1
                ";

                $today_sessions = $wpdb->get_results( $wpdb->prepare( $query_base . " AND s.start_datetime BETWEEN %s AND %s ORDER BY s.start_datetime ASC", $therapist->id, $today_start, $today_end ) );
                $future_sessions = $wpdb->get_results( $wpdb->prepare( $query_base . " AND s.start_datetime > %s ORDER BY s.start_datetime ASC LIMIT 20", $therapist->id, $today_end ) );

                include TB_DIR . 'templates/frontend/views/view-overview.php';
            }
            else {
                echo '<div class="tb-empty-state"><p>این بخش در حال توسعه است.</p></div>';
            }
        } catch (Throwable $e) {
            ob_end_clean();
            wp_send_json_error("🔥 خطای PHP: " . $e->getMessage() . " | خط: " . $e->getLine());
        }

        $html = ob_get_clean();
        
        if (empty($html)) {
            wp_send_json_error("خطا: فایل ویو پیدا نشد یا خروجی خالی است.");
        }

        wp_send_json_success( array( 'html' => $html ) );
    }

    public static function get_front_areas() {
        check_ajax_referer( 'tb_front_nonce', 'security' );
        $therapist = self::get_current_therapist();
        if ( ! $therapist ) wp_send_json_error('دسترسی غیرمجاز');

        global $wpdb;
        
        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        $allow_online = isset($global_settings['allow_therapist_online_booking']) ? intval($global_settings['allow_therapist_online_booking']) : 1;

        $base_query = "
            SELECT a.area_id, a.channel_id, d.name as area_name, c.name as channel_name, a.duration 
            FROM {$wpdb->prefix}tb_therapist_areas a
            JOIN {$wpdb->prefix}tb_base_definitions d ON a.area_id = d.id
            JOIN {$wpdb->prefix}tb_base_definitions c ON a.channel_id = c.id
            WHERE a.therapist_id = %d
        ";

        $all_areas = $wpdb->get_results( $wpdb->prepare( $base_query, $therapist->id ) );

        $online_condition = "";
        if ( $allow_online === 0 ) {
            $online_condition = " AND c.channel_nature != 'online' ";
        }
        $allowed_areas = $wpdb->get_results( $wpdb->prepare( $base_query . $online_condition, $therapist->id ) );
        
        wp_send_json_success( array(
            'all_areas'     => $all_areas,
            'allowed_areas' => $allowed_areas
        ));
    }

public static function get_calendar_table() {
        check_ajax_referer( 'tb_front_nonce', 'security' );
        $therapist = self::get_current_therapist();
        if ( ! $therapist ) wp_send_json_error('دسترسی غیرمجاز');

$args = array(
            'therapist_id' => $therapist->id,
            'paged'        => isset( $_POST['paged'] ) ? intval( $_POST['paged'] ) : 1,
            'per_page'     => isset( $_POST['per_page'] ) ? intval( $_POST['per_page'] ) : 10,
            'status'       => isset( $_POST['status'] ) ? sanitize_text_field( $_POST['status'] ) : 'all',
            'area'         => isset( $_POST['area'] ) ? sanitize_text_field( $_POST['area'] ) : 'all',
            'day'          => isset( $_POST['day'] ) ? sanitize_text_field( $_POST['day'] ) : 'all',
            'start_date'   => isset( $_POST['start_date'] ) ? sanitize_text_field( $_POST['start_date'] ) : '',
            'end_date'     => isset( $_POST['end_date'] ) ? sanitize_text_field( $_POST['end_date'] ) : '',
            // 👈 دریافت نام و ID مراجع از درخواست ایجکس
            'client_name'  => isset( $_POST['client_name'] ) ? sanitize_text_field( $_POST['client_name'] ) : '',
            'client_id'    => isset( $_POST['client_id'] ) ? intval( $_POST['client_id'] ) : 0
        );
        
        $data = Therapist_Booking_Therapy_Calendar::get_sessions_list( $args );
        wp_send_json_success( $data );
    }

    public static function mark_session_status() {
        check_ajax_referer( 'tb_front_nonce', 'security' );
        $therapist = self::get_current_therapist();
        if ( ! $therapist ) wp_send_json_error('دسترسی غیرمجاز');

        global $wpdb;
        $session_id = intval( $_POST['session_id'] );
        $status = sanitize_text_field( $_POST['status'] ); 
        $table = $wpdb->prefix . 'tb_therapy_sessions';

        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d AND therapist_id = %d", $session_id, $therapist->id ) );
        if ( ! $session || $session->status !== 'booked' ) {
            wp_send_json_error( 'عملیات نامعتبر است.' );
        }

        if ( $status === 'no_show' ) {
            $_POST['security'] = wp_create_nonce('tb_admin_nonce'); 
            Therapist_Booking_Therapy_Calendar_Ajax::register_no_show(); 
        } elseif ( $status === 'completed' ) {
            $wpdb->update( $table, array( 'status' => 'completed' ), array( 'id' => $session_id ) );
            wp_send_json_success( 'پایان جلسه ثبت شد و مبلغ به موجودی قابل برداشت شما اضافه گردید.' );
        }
    }

    public static function get_pending_resolutions() {
        check_ajax_referer( 'tb_front_nonce', 'security' );
        $therapist = self::get_current_therapist();
        if ( ! $therapist ) wp_send_json_error('دسترسی غیرمجاز');

        global $wpdb;
        $table_sessions = $wpdb->prefix . 'tb_therapy_sessions';
        $table_base     = $wpdb->prefix . 'tb_base_definitions';
        $table_users    = $wpdb->users;
        $table_usermeta = $wpdb->usermeta;

        // 👈 حل قطعی باگ: استفاده از زمان محلی وردپرس (تهران) به جای NOW()
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
        ", $therapist->id, $current_time);

        $pending_sessions = $wpdb->get_results( $query );
        
        wp_send_json_success( $pending_sessions );
    }

    public static function resolve_session_status() {
        check_ajax_referer( 'tb_front_nonce', 'security' );
        $therapist = self::get_current_therapist();
        if ( ! $therapist ) wp_send_json_error('دسترسی غیرمجاز');

        global $wpdb;
        $session_id = intval( $_POST['session_id'] );
        $status     = sanitize_text_field( $_POST['status'] ); 
        
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE id = %d AND therapist_id = %d", $session_id, $therapist->id ) );
        
        if ( ! $session || $session->status !== 'booked' ) {
            wp_send_json_error( 'این جلسه قبلاً تعیین تکلیف شده است.' );
        }

        if ( $status === 'no_show' ) {
            $_POST['security'] = wp_create_nonce('tb_admin_nonce'); 
            Therapist_Booking_Therapy_Calendar_Ajax::register_no_show();
        } elseif ( $status === 'completed' ) {
            $wpdb->update( $table, array( 'status' => 'completed' ), array( 'id' => $session_id ) );
            wp_send_json_success( 'پایان جلسه با موفقیت ثبت شد و مبلغ در سیستم حسابداری تثبیت گردید.' );
        } else {
            wp_send_json_error( 'وضعیت نامعتبر است.' );
        }
    }
    
    // 👈 متد جدید: جستجوی ایجکس مراجعین اختصاصی یک درمانگر در داشبورد
    public static function search_therapist_clients() {
        check_ajax_referer( 'tb_front_nonce', 'security' );
        $therapist = self::get_current_therapist();
        if ( ! $therapist ) wp_send_json_error('دسترسی غیرمجاز');

        global $wpdb;
        $search = sanitize_text_field( $_POST['search'] );
        
        if ( empty( $search ) || strlen( $search ) < 3 ) wp_send_json_success( array() );

        $search_term = '%' . $wpdb->esc_like( str_replace(' ', '%', $search) ) . '%';

        // فقط کاربرانی را پیدا کن که حداقل یک جلسه با این درمانگر داشته‌اند
        $query = $wpdb->prepare("
            SELECT DISTINCT u.ID, u.user_login as mobile, m1.meta_value as first_name, m2.meta_value as last_name
            FROM {$wpdb->prefix}tb_therapy_sessions s
            JOIN {$wpdb->users} u ON s.client_id = u.ID
            LEFT JOIN {$wpdb->usermeta} m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name'
            LEFT JOIN {$wpdb->usermeta} m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name'
            WHERE s.therapist_id = %d
            AND (u.user_login LIKE %s OR m1.meta_value LIKE %s OR m2.meta_value LIKE %s OR CONCAT(m1.meta_value, ' ', m2.meta_value) LIKE %s)
            LIMIT 10
        ", $therapist->id, $search_term, $search_term, $search_term, $search_term);

        $users = $wpdb->get_results( $query );
        wp_send_json_success( $users );
    }
}
Therapist_Booking_Frontend_Dashboard::init();