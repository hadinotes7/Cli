<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

use Carbon\Carbon;

class Therapist_Booking_Course_Calendar_Ajax {

    public static function init() {
        add_action( 'wp_ajax_tb_get_instructor_status', array( __CLASS__, 'get_instructor_status' ) );
        add_action( 'wp_ajax_tb_generate_course_preview', array( __CLASS__, 'generate_preview' ) );
        add_action( 'wp_ajax_tb_save_course_batch', array( __CLASS__, 'save_course_batch' ) );
        add_action( 'wp_ajax_tb_get_course_batches_list', array( __CLASS__, 'get_course_batches_list' ) );
        add_action( 'wp_ajax_tb_cancel_course_batch', array( __CLASS__, 'cancel_course_batch' ) );

        add_action( 'wp_ajax_tb_front_get_instructor_courses', array( __CLASS__, 'front_get_instructor_courses' ) );
        add_action( 'wp_ajax_tb_front_generate_skyroom_link', array( __CLASS__, 'front_generate_skyroom_link' ) );
    }

    private static function verify_nonce( $action = 'tb_admin_nonce' ) {
        if ( ! isset( $_POST['security'] ) || ! wp_verify_nonce( $_POST['security'], $action ) ) {
            wp_send_json_error( 'دسترسی غیرمجاز' );
            exit;
        }
    }

    // 👈 گروه‌بندی هوشمند دوره‌ها (Smart Grouping)
    public static function get_instructor_status() {
        self::verify_nonce();
        global $wpdb;
        $user_id = intval( $_POST['therapist_id'] );
        $therapist_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}tb_therapists WHERE user_id = %d", $user_id ) );

        if ( ! $therapist_id ) wp_send_json_error( 'این کاربر به عنوان مدرس در سیستم ثبت نشده است.' );

        $query = $wpdb->prepare("
            SELECT c.group_id, c.course_id, c.structure_id, c.channel_id,
                   d1.name as group_name, d2.name as course_name, d3.name as structure_name,
                   c.duration, c.price, c.deposit_percent, c.therapist_share, c.clinic_share, d4.channel_nature
            FROM {$wpdb->prefix}tb_therapist_courses c
            JOIN {$wpdb->prefix}tb_base_definitions d1 ON c.group_id = d1.id
            JOIN {$wpdb->prefix}tb_base_definitions d2 ON c.course_id = d2.id
            JOIN {$wpdb->prefix}tb_base_definitions d3 ON c.structure_id = d3.id
            JOIN {$wpdb->prefix}tb_base_definitions d4 ON c.channel_id = d4.id
            WHERE c.therapist_id = %d
        ", $therapist_id);

        $courses = $wpdb->get_results( $query );

        if ( empty( $courses ) ) wp_send_json_error( 'برای این شخص هیچ دوره آموزشی و تعرفه‌ای ثبت نشده است.' );

        // گروه‌بندی دوره‌ها بر اساس گروه، نام دوره و ساختار
        $grouped_courses = array();
        foreach ( $courses as $c ) {
            $combo_key = $c->group_id . '_' . $c->course_id . '_' . $c->structure_id;
            
            if ( ! isset( $grouped_courses[$combo_key] ) ) {
                $grouped_courses[$combo_key] = array(
                    'combo_id'       => $combo_key,
                    'group_id'       => $c->group_id,
                    'course_id'      => $c->course_id,
                    'structure_id'   => $c->structure_id,
                    'display_name'   => $c->group_name . ' | ' . $c->course_name . ' | ' . $c->structure_name,
                    'duration'       => $c->duration,
                    'has_inperson'   => false,
                    'has_online'     => false,
                    'inperson_data'  => null,
                    'online_data'    => null
                );
            }

            $channel_data = array(
                'price'   => $c->price,
                'deposit' => $c->deposit_percent,
                'share_t' => $c->therapist_share,
                'share_c' => $c->clinic_share
            );

            if ( $c->channel_nature === 'inperson' ) {
                $grouped_courses[$combo_key]['has_inperson'] = true;
                $grouped_courses[$combo_key]['inperson_data'] = $channel_data;
            } elseif ( $c->channel_nature === 'online' ) {
                $grouped_courses[$combo_key]['has_online'] = true;
                $grouped_courses[$combo_key]['online_data'] = $channel_data;
            }
        }

        wp_send_json_success( array_values( $grouped_courses ) );
    }

    public static function generate_preview() {
        self::verify_nonce();
        $start_date = sanitize_text_field( $_POST['start_date'] ); 
        $total_sessions = intval( $_POST['total_sessions'] );
        $weekdays = isset($_POST['weekdays']) ? array_map('intval', $_POST['weekdays']) : array();
        $start_time = sanitize_text_field( $_POST['start_time'] );
        $end_time = sanitize_text_field( $_POST['end_time'] );

        if ( empty($start_date) || $total_sessions <= 0 || empty($weekdays) || empty($start_time) || empty($end_time) ) {
            wp_send_json_error( 'اطلاعات ورودی ناقص است.' );
        }

        try {
            $current_date = Carbon::parse( $start_date . ' ' . $start_time, 'Asia/Tehran' );
            $sessions = array();
            $count = 0;
            $max_iterations = 365; 
            $iterations = 0;

            while ( $count < $total_sessions && $iterations < $max_iterations ) {
                $day_of_week = $current_date->dayOfWeek;
                if ( in_array( $day_of_week, $weekdays ) ) {
                    $count++;
                    $sessions[] = array(
                        'session_number' => $count,
                        'date_gregorian' => $current_date->format('Y-m-d'),
                        'start_time'     => $start_time,
                        'end_time'       => $end_time
                    );
                }
                $current_date->addDay();
                $iterations++;
            }
            wp_send_json_success( $sessions );
        } catch (Exception $e) {
            wp_send_json_error( 'خطا در پردازش تاریخ: ' . $e->getMessage() );
        }
    }

    // 👈 ثبت نهایی با منطق Dual Snapshotting
    public static function save_course_batch() {
        self::verify_nonce();
        global $wpdb;

        $user_id = intval( $_POST['therapist_id'] );
        $therapist_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}tb_therapists WHERE user_id = %d", $user_id ) );

        if ( ! $therapist_id ) wp_send_json_error( 'خطای امنیتی: مدرس یافت نشد.' );

        $combo_id     = sanitize_text_field( $_POST['course_combo_id'] ); 
        $cap_inperson = intval( $_POST['cap_inperson'] );
        $cap_online   = intval( $_POST['cap_online'] );
        $sessions_data = isset($_POST['sessions_data']) ? json_decode(stripslashes($_POST['sessions_data']), true) : array();
        $installments_data = isset($_POST['installments_data']) ? json_decode(stripslashes($_POST['installments_data']), true) : array();

        if ( empty($sessions_data) ) wp_send_json_error( 'لیست جلسات نمی‌تواند خالی باشد.' );
        if ( $cap_inperson === 0 && $cap_online === 0 ) wp_send_json_error( 'حداقل یک ظرفیت (حضوری یا آنلاین) باید بیشتر از صفر باشد.' );

        $parts = explode('_', $combo_id);
        $group_id = isset($parts[0]) ? intval($parts[0]) : 0;
        $course_id = isset($parts[1]) ? intval($parts[1]) : 0;
        $structure_id = isset($parts[2]) ? intval($parts[2]) : 0;

        // استخراج اطلاعات پایه برای Snapshot
        $group_name = $wpdb->get_var($wpdb->prepare("SELECT name FROM {$wpdb->prefix}tb_base_definitions WHERE id = %d", $group_id));
        $course_name = $wpdb->get_var($wpdb->prepare("SELECT name FROM {$wpdb->prefix}tb_base_definitions WHERE id = %d", $course_id));
        $structure_name = $wpdb->get_var($wpdb->prepare("SELECT name FROM {$wpdb->prefix}tb_base_definitions WHERE id = %d", $structure_id));

        // استخراج قیمت‌های حضوری و آنلاین از دیتابیس
        $inperson_data = array('price'=>0, 'deposit'=>0, 'share_t'=>0, 'share_c'=>0, 'duration'=>0);
        $online_data   = array('price'=>0, 'deposit'=>0, 'share_t'=>0, 'share_c'=>0, 'duration'=>0);

        $courses = $wpdb->get_results( $wpdb->prepare("
            SELECT c.*, d4.channel_nature
            FROM {$wpdb->prefix}tb_therapist_courses c
            JOIN {$wpdb->prefix}tb_base_definitions d4 ON c.channel_id = d4.id
            WHERE c.therapist_id = %d AND c.group_id = %d AND c.course_id = %d AND c.structure_id = %d
        ", $therapist_id, $group_id, $course_id, $structure_id) );

        $duration = 0;
        foreach ($courses as $c) {
            $duration = $c->duration; // زمان کل دوره
            if ($c->channel_nature === 'inperson') {
                $inperson_data = array('price'=>$c->price, 'deposit'=>$c->deposit_percent, 'share_t'=>$c->therapist_share, 'share_c'=>$c->clinic_share);
            } elseif ($c->channel_nature === 'online') {
                $online_data = array('price'=>$c->price, 'deposit'=>$c->deposit_percent, 'share_t'=>$c->therapist_share, 'share_c'=>$c->clinic_share);
            }
        }

        // اعتبارسنجی امنیتی: اگر ظرفیت حضوری داده ولی قیمت حضوری ندارد!
        if ($cap_inperson > 0 && $inperson_data['price'] == 0) wp_send_json_error('برای این دوره تعرفه حضوری ثبت نشده است.');
        if ($cap_online > 0 && $online_data['price'] == 0) wp_send_json_error('برای این دوره تعرفه آنلاین ثبت نشده است.');

        $skyroom_room_id = null;
        if ( $cap_online > 0 ) {
            $room_name = 'course-' . time() . '-' . rand(100, 999);
            $room_title = $course_name . ' (' . get_user_meta($user_id, 'last_name', true) . ')';
            
            $skyroom_res = Therapist_Booking_Skyroom_API::create_room( $room_name, $room_title, $cap_online );
            if ( is_wp_error( $skyroom_res ) ) {
                wp_send_json_error( 'خطا در ساخت اتاق اسکای‌روم: ' . $skyroom_res->get_error_message() );
            }
            $skyroom_room_id = $skyroom_res; 
        }

        $wpdb->query('START TRANSACTION');

        try {
            $wpdb->insert( $wpdb->prefix . 'tb_course_batches', array(
                'therapist_id'            => $therapist_id,
                'snapshot_group_name'     => $group_name,
                'snapshot_course_name'    => $course_name,
                'snapshot_structure_name' => $structure_name,
                'snapshot_duration'       => $duration,
                
                'price_inperson'          => $inperson_data['price'],
                'deposit_inperson'        => $inperson_data['deposit'],
                'share_t_inperson'        => $inperson_data['share_t'],
                'share_c_inperson'        => $inperson_data['share_c'],
                
                'price_online'            => $online_data['price'],
                'deposit_online'          => $online_data['deposit'],
                'share_t_online'          => $online_data['share_t'],
                'share_c_online'          => $online_data['share_c'],
                
                'capacity_inperson'       => $cap_inperson,
                'capacity_online'         => $cap_online,
                'skyroom_room_id'         => $skyroom_room_id,
                'status'                  => 'registering'
            ));
            $batch_id = $wpdb->insert_id;

            foreach ( $sessions_data as $session ) {
                $start_dt = $session['date'] . ' ' . $session['start'] . ':00';
                $end_dt   = $session['date'] . ' ' . $session['end'] . ':00';
                
                $wpdb->insert( $wpdb->prefix . 'tb_course_sessions', array(
                    'batch_id'       => $batch_id,
                    'session_number' => $session['number'],
                    'start_datetime' => $start_dt,
                    'end_datetime'   => $end_dt,
                    'status'         => 'pending'
                ));
            }

            if ( ! empty( $installments_data ) ) {
                foreach ( $installments_data as $inst ) {
                    $wpdb->insert( $wpdb->prefix . 'tb_course_installments', array(
                        'batch_id'  => $batch_id,
                        'client_id' => 0, 
                        'title'     => sanitize_text_field( $inst['title'] ),
                        'percent'   => floatval( $inst['percent'] ),
                        'due_date'  => sanitize_text_field( $inst['date'] )
                    ));
                }
            }

            $wpdb->query('COMMIT');
            wp_send_json_success( 'دوره آموزشی با موفقیت ثبت و اتاق اسکای‌روم ایجاد شد.' );

        } catch (Exception $e) {
            $wpdb->query('ROLLBACK');
            wp_send_json_error( 'خطای دیتابیس: ' . $e->getMessage() );
        }
    }

    public static function get_course_batches_list() {
        self::verify_nonce();
        global $wpdb;
        
        $user_id = intval( $_POST['therapist_id'] );
        $therapist_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}tb_therapists WHERE user_id = %d", $user_id ) );

        if ( ! $therapist_id ) wp_send_json_error( 'مدرس یافت نشد.' );

        $paged    = isset( $_POST['paged'] ) ? intval( $_POST['paged'] ) : 1;
        $per_page = isset( $_POST['per_page'] ) ? intval( $_POST['per_page'] ) : 10;
        $offset   = ( $paged - 1 ) * $per_page;

        $table_batches = $wpdb->prefix . 'tb_course_batches';
        $table_sessions = $wpdb->prefix . 'tb_course_sessions';
        $table_enrollments = $wpdb->prefix . 'tb_course_enrollments';
        $table_installments = $wpdb->prefix . 'tb_course_installments';

        $query = $wpdb->prepare("
            SELECT b.*, 
                   (SELECT MIN(start_datetime) FROM $table_sessions WHERE batch_id = b.id) as start_date,
                   (SELECT MAX(end_datetime) FROM $table_sessions WHERE batch_id = b.id) as end_date,
                   (SELECT COUNT(id) FROM $table_sessions WHERE batch_id = b.id) as total_sessions,
                   (SELECT COUNT(id) FROM $table_enrollments WHERE batch_id = b.id AND channel_type = 'inperson' AND status = 'active') as enrolled_inperson,
                   (SELECT COUNT(id) FROM $table_enrollments WHERE batch_id = b.id AND channel_type = 'online' AND status = 'active') as enrolled_online,
                   (SELECT COUNT(id) FROM $table_installments WHERE batch_id = b.id AND client_id = 0) as has_installments
            FROM $table_batches b
            WHERE b.therapist_id = %d AND b.is_active = 1
            ORDER BY b.id DESC
            LIMIT %d, %d
        ", $therapist_id, $offset, $per_page);

        $items = $wpdb->get_results( $query );
        $total_items = $wpdb->get_var( $wpdb->prepare("SELECT COUNT(id) FROM $table_batches WHERE therapist_id = %d AND is_active = 1", $therapist_id) );
        $total_pages = ceil( $total_items / $per_page );

        wp_send_json_success( array(
            'items'       => $items,
            'total_pages' => $total_pages,
            'paged'       => $paged
        ));
    }

    public static function cancel_course_batch() {
        self::verify_nonce();
        global $wpdb;
        $batch_id = intval( $_POST['batch_id'] );

        $wpdb->update( $wpdb->prefix . 'tb_course_batches', array( 'status' => 'cancelled', 'is_active' => 0 ), array( 'id' => $batch_id ) );
        $wpdb->update( $wpdb->prefix . 'tb_course_sessions', array( 'status' => 'cancelled', 'is_active' => 0 ), array( 'batch_id' => $batch_id ) );

        wp_send_json_success( 'دوره با موفقیت لغو شد.' );
    }

    // =================================================================
    // توابع فرانت‌اند (داشبورد مدرس)
    // =================================================================

    public static function front_get_instructor_courses() {
        self::verify_nonce('tb_front_nonce');
        global $wpdb;
        
        $user_id = get_current_user_id();
        $therapist_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}tb_therapists WHERE user_id = %d", $user_id ) );

        if ( ! $therapist_id ) wp_send_json_error( 'دسترسی غیرمجاز' );

        $table_batches = $wpdb->prefix . 'tb_course_batches';
        $table_sessions = $wpdb->prefix . 'tb_course_sessions';

        $batches = $wpdb->get_results( $wpdb->prepare("
            SELECT * FROM $table_batches 
            WHERE therapist_id = %d AND is_active = 1 AND status != 'cancelled'
            ORDER BY id DESC
        ", $therapist_id) );

        foreach ( $batches as $batch ) {
            $batch->sessions = $wpdb->get_results( $wpdb->prepare("
                SELECT * FROM $table_sessions 
                WHERE batch_id = %d AND is_active = 1
                ORDER BY session_number ASC
            ", $batch->id) );
        }

        wp_send_json_success( $batches );
    }

    public static function front_generate_skyroom_link() {
        self::verify_nonce('tb_front_nonce');
        global $wpdb;

        $user_id = get_current_user_id();
        $batch_id = intval( $_POST['batch_id'] );

        $batch = $wpdb->get_row( $wpdb->prepare("SELECT skyroom_room_id FROM {$wpdb->prefix}tb_course_batches WHERE id = %d", $batch_id) );

        if ( ! $batch || empty($batch->skyroom_room_id) ) {
            wp_send_json_error( 'اتاق اسکای‌روم برای این دوره یافت نشد.' );
        }

        $nickname = get_user_meta($user_id, 'first_name', true) . ' ' . get_user_meta($user_id, 'last_name', true);
        if (empty(trim($nickname))) $nickname = 'مدرس دوره';

        $url = Therapist_Booking_Skyroom_API::get_login_url( $batch->skyroom_room_id, $user_id, $nickname, 3 );

        if ( is_wp_error( $url ) ) {
            wp_send_json_error( 'خطا در دریافت لینک از اسکای‌روم: ' . $url->get_error_message() );
        }

        wp_send_json_success( array( 'url' => $url ) );
    }
}
Therapist_Booking_Course_Calendar_Ajax::init();