<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Therapist_Booking_Therapists {

    public static function init() {
        add_action( 'wp_ajax_tb_search_users', array( __CLASS__, 'search_users' ) );
        add_action( 'wp_ajax_tb_get_active_base_items', array( __CLASS__, 'get_active_base_items' ) );
        add_action( 'wp_ajax_tb_save_therapist', array( __CLASS__, 'save_therapist' ) );
        add_action( 'wp_ajax_tb_get_therapists_list', array( __CLASS__, 'get_therapists_list' ) );
        add_action( 'wp_ajax_tb_get_therapist_data', array( __CLASS__, 'get_therapist_data' ) );
        add_action( 'wp_ajax_tb_toggle_therapist_status', array( __CLASS__, 'toggle_status' ) );
        add_action( 'wp_ajax_tb_restore_therapist', array( __CLASS__, 'restore_therapist' ) );
        add_action( 'wp_ajax_tb_check_area_usage', array( __CLASS__, 'check_area_usage' ) );
    }

    public static function search_users() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        $search = isset( $_POST['search'] ) ? sanitize_text_field( $_POST['search'] ) : '';
        
        if ( empty( $search ) || strlen( $search ) < 3 ) wp_send_json_success( array() );

        global $wpdb;
        
        $search_term = '%' . str_replace(' ', '%', $search) . '%';

        $users = $wpdb->get_results( $wpdb->prepare("
            SELECT DISTINCT u.ID, u.user_login 
            FROM {$wpdb->users} u 
            LEFT JOIN {$wpdb->usermeta} m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name'
            LEFT JOIN {$wpdb->usermeta} m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name'
            WHERE u.user_login LIKE %s 
            OR m1.meta_value LIKE %s 
            OR m2.meta_value LIKE %s 
            OR CONCAT(m1.meta_value, ' ', m2.meta_value) LIKE %s
            LIMIT 15
        ", $search_term, $search_term, $search_term, $search_term) );

        $results = array();
        foreach ( $users as $user ) {
            $first_name = get_user_meta( $user->ID, 'first_name', true );
            $last_name  = get_user_meta( $user->ID, 'last_name', true );
            $gender     = get_user_meta( $user->ID, 'therapist_gender', true );
            $dob        = get_user_meta( $user->ID, 'therapist_dob', true );
            
            $full_name = trim( $first_name . ' ' . $last_name );
            if ( empty( $full_name ) ) $full_name = 'کاربر بدون نام';

            $results[] = array(
                'id'     => $user->ID,
                'name'   => $full_name,
                'mobile' => $user->user_login,
                'gender' => $gender ? $gender : 'نامشخص',
                'dob'    => $dob ? $dob : 'نامشخص'
            );
        }
        wp_send_json_success( $results );
    }

    public static function get_active_base_items() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $table = $wpdb->prefix . 'tb_base_definitions';
        $types = array('therapy_area', 'channel', 'edu_group', 'edu_course', 'structure');
        $data = array();
        foreach ($types as $type) {
            $data[$type] = $wpdb->get_results( $wpdb->prepare( "SELECT id, name FROM $table WHERE type = %s AND is_active = 1 ORDER BY name ASC", $type ) );
        }
        wp_send_json_success( $data );
    }

    public static function check_area_usage() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        
        $user_id = intval( $_POST['therapist_id'] ); 
        $area_id = intval( $_POST['area_id'] );
        $channel_id = isset($_POST['channel_id']) ? intval($_POST['channel_id']) : 0;
        
        $therapist_id = $wpdb->get_var( $wpdb->prepare( "SELECT id FROM {$wpdb->prefix}tb_therapists WHERE user_id = %d", $user_id ) );

        if ( ! $therapist_id ) {
            wp_send_json_success();
        }

        $table_sessions = $wpdb->prefix . 'tb_therapy_sessions';
        
        // 👈 حل باگ: کوئری مستقیم و دقیق روی جدول جلسات (بدون JOIN اشتباه)
        $usage_count = $wpdb->get_var( $wpdb->prepare( "
            SELECT COUNT(id) 
            FROM $table_sessions 
            WHERE therapist_id = %d 
            AND area_id = %d 
            AND channel_id = %d
            AND is_active = 1 
            AND status NOT IN ('deleted', 'cancelled')
        ", $therapist_id, $area_id, $channel_id ) );

        if ( $usage_count > 0 ) {
            wp_send_json_error( array( 'count' => $usage_count ) );
        } else {
            wp_send_json_success();
        }
    }

    public static function save_therapist() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;

        $user_id = intval( $_POST['user_id'] );
        $national_code = sanitize_text_field( $_POST['national_code'] );
        if ( empty( $national_code ) ) wp_send_json_error( 'کد ملی الزامی است.' );

        $table_therapists = $wpdb->prefix . 'tb_therapists';
        $duplicate_nc = $wpdb->get_var( $wpdb->prepare(
            "SELECT id FROM $table_therapists WHERE national_code = %s AND user_id != %d",
            $national_code, $user_id
        ));
        if ( $duplicate_nc ) {
            wp_send_json_error( 'این کد ملی قبلاً برای شخص دیگری در سیستم ثبت شده است.' );
        }
        
        $avatar_url = '';
        if ( ! empty( $_POST['avatar_base64'] ) ) {
            $upload_dir = wp_upload_dir();
            $therapist_dir = $upload_dir['basedir'] . '/therapists';
            if ( ! file_exists( $therapist_dir ) ) wp_mkdir_p( $therapist_dir );

            $image_parts = explode( ";base64,", $_POST['avatar_base64'] );
            $image_base64 = base64_decode( $image_parts[1] );
            $filename = 'avatar_' . $user_id . '_' . time() . '.jpg';
            $file_path = $therapist_dir . '/' . $filename;
            
            file_put_contents( $file_path, $image_base64 );
            $avatar_url = $upload_dir['baseurl'] . '/therapists/' . $filename;
        } else {
            $avatar_url = isset($_POST['existing_avatar']) ? sanitize_text_field($_POST['existing_avatar']) : '';
        }

        $data = array(
            'user_id'       => $user_id,
            'avatar_url'    => $avatar_url,
            'national_code' => $national_code,
            'education'     => sanitize_text_field( $_POST['education'] ),
            'phone2'        => sanitize_text_field( $_POST['phone2'] ),
            'home_phone'    => sanitize_text_field( $_POST['home_phone'] ),
            'work_phone'    => sanitize_text_field( $_POST['work_phone'] ),
            'home_address'  => sanitize_textarea_field( $_POST['home_address'] ),
            'work_address'  => sanitize_textarea_field( $_POST['work_address'] ),
            'experience'    => sanitize_textarea_field( $_POST['experience'] ),
            'bank_name'     => sanitize_text_field( $_POST['bank_name'] ),
            'account_number'=> sanitize_text_field( $_POST['account_number'] ),
            'card_number'   => sanitize_text_field( $_POST['card_number'] ),
            'shaba_number'  => sanitize_text_field( $_POST['shaba_number'] ),
            'is_active'     => 1
        );

        $existing = $wpdb->get_row( $wpdb->prepare( "SELECT id FROM $table_therapists WHERE user_id = %d", $user_id ) );

        if ( $existing ) {
            $therapist_id = $existing->id;
            $wpdb->update( $table_therapists, $data, array( 'id' => $therapist_id ) );
        } else {
            $wpdb->insert( $table_therapists, $data );
            $therapist_id = $wpdb->insert_id;
        }

        $table_areas = $wpdb->prefix . 'tb_therapist_areas';
        $table_sessions = $wpdb->prefix . 'tb_therapy_sessions';
        
        $submitted_combinations = array(); 
        
        if ( ! empty( $_POST['therapy_areas'] ) ) {
            $areas = json_decode( stripslashes( $_POST['therapy_areas'] ), true );
            foreach ( $areas as $a ) {
                $combo_key = $a['area_id'] . '_' . $a['channel_id'];
                $submitted_combinations[] = $combo_key;
                
                $existing_area = $wpdb->get_row( $wpdb->prepare( "SELECT id FROM $table_areas WHERE therapist_id = %d AND area_id = %d AND channel_id = %d", $therapist_id, $a['area_id'], $a['channel_id'] ) );
                
                $area_data = array(
                    'therapist_id'    => $therapist_id, 
                    'area_id'         => $a['area_id'], 
                    'channel_id'      => $a['channel_id'],
                    'duration'        => $a['time'], 
                    'price'           => $a['amount'], 
                    'deposit_percent' => $a['deposit'],
                    'therapist_share' => $a['share_t'], 
                    'clinic_share'    => $a['share_c']
                );

                if ( $existing_area ) {
                    $wpdb->update( $table_areas, $area_data, array( 'id' => $existing_area->id ) );
                } else {
                    $wpdb->insert( $table_areas, $area_data );
                }
            }
        }

        $current_db_records = $wpdb->get_results( $wpdb->prepare( "SELECT id, area_id, channel_id FROM $table_areas WHERE therapist_id = %d", $therapist_id ) );
        
        foreach ( $current_db_records as $db_record ) {
            $db_combo_key = $db_record->area_id . '_' . $db_record->channel_id;
            
            if ( ! in_array( $db_combo_key, $submitted_combinations ) ) {
                // 👈 حل باگ: کوئری مستقیم و دقیق روی جدول جلسات (بدون JOIN اشتباه)
                $usage_count = $wpdb->get_var( $wpdb->prepare( "
                    SELECT COUNT(id) 
                    FROM $table_sessions 
                    WHERE therapist_id = %d 
                    AND area_id = %d 
                    AND channel_id = %d
                    AND is_active = 1 
                    AND status NOT IN ('deleted', 'cancelled')
                ", $therapist_id, $db_record->area_id, $db_record->channel_id ) );
                
                if ( $usage_count == 0 ) {
                    $wpdb->delete( $table_areas, array( 'id' => $db_record->id ) );
                }
            }
        }

        $table_courses = $wpdb->prefix . 'tb_therapist_courses';
        $wpdb->delete( $table_courses, array( 'therapist_id' => $therapist_id ) );
        if ( ! empty( $_POST['edu_courses'] ) ) {
            $courses = json_decode( stripslashes( $_POST['edu_courses'] ), true );
            foreach ( $courses as $c ) {
                $wpdb->insert( $table_courses, array(
                    'therapist_id' => $therapist_id, 'group_id' => $c['group_id'], 'course_id' => $c['course_id'],
                    'structure_id' => $c['structure_id'], 'channel_id' => $c['channel_id'],
                    'duration' => $c['time'], 'price' => $c['amount'], 'deposit_percent' => $c['deposit'],
                    'therapist_share' => $c['share_t'], 'clinic_share' => $c['share_c']
                ));
            }
        }

        wp_send_json_success( 'اطلاعات با موفقیت ثبت شد.' );
    }

    public static function get_therapists_list() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        
        $show_deleted = isset( $_POST['show_deleted'] ) && $_POST['show_deleted'] == 'true' ? 0 : 1;
        $search = isset( $_POST['search'] ) ? sanitize_text_field( $_POST['search'] ) : '';
        $per_page = isset( $_POST['per_page'] ) ? intval( $_POST['per_page'] ) : 10;
        $paged = isset( $_POST['paged'] ) ? intval( $_POST['paged'] ) : 1;
        $offset = ( $paged - 1 ) * $per_page;

        $table_t = $wpdb->prefix . 'tb_therapists';
        $table_u = $wpdb->users;
        $table_m = $wpdb->usermeta;

        $where = $wpdb->prepare( "WHERE t.is_active = %d", $show_deleted );
        if ( ! empty( $search ) ) {
            $search_term = '%' . str_replace(' ', '%', $search) . '%';
            $where .= $wpdb->prepare( " AND (u.user_login LIKE %s OR m1.meta_value LIKE %s OR m2.meta_value LIKE %s OR CONCAT(m1.meta_value, ' ', m2.meta_value) LIKE %s)", $search_term, $search_term, $search_term, $search_term );
        }

        $query = "SELECT t.*, u.user_login as mobile, m1.meta_value as first_name, m2.meta_value as last_name 
                  FROM $table_t t 
                  JOIN $table_u u ON t.user_id = u.ID 
                  LEFT JOIN $table_m m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name'
                  LEFT JOIN $table_m m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name'
                  $where ORDER BY t.id DESC LIMIT $offset, $per_page";

        $items = $wpdb->get_results( $query );
        $total_items = $wpdb->get_var( "SELECT COUNT(t.id) FROM $table_t t JOIN $table_u u ON t.user_id = u.ID LEFT JOIN $table_m m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name' LEFT JOIN $table_m m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name' $where" );
        $total_pages = ceil( $total_items / $per_page );

        foreach ($items as $item) {
            $item->areas_count = $wpdb->get_var( $wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}tb_therapist_areas WHERE therapist_id = %d", $item->id) );
            $item->courses_count = $wpdb->get_var( $wpdb->prepare("SELECT COUNT(*) FROM {$wpdb->prefix}tb_therapist_courses WHERE therapist_id = %d", $item->id) );
        }

        wp_send_json_success( array( 'items' => $items, 'total_pages' => $total_pages, 'paged' => $paged ) );
    }

    public static function get_therapist_data() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $user_id = intval( $_POST['user_id'] );

        $therapist = $wpdb->get_row( $wpdb->prepare( 
            "SELECT * FROM {$wpdb->prefix}tb_therapists WHERE user_id = %d", $user_id 
        ) );

        $areas   = array();
        $courses = array();

        if ( $therapist ) {
            $user = get_userdata( $user_id );
            $therapist->first_name = get_user_meta( $user_id, 'first_name', true );
            $therapist->last_name  = get_user_meta( $user_id, 'last_name', true );
            $therapist->mobile     = $user->user_login;
            $therapist->gender     = get_user_meta( $user_id, 'therapist_gender', true );
            $therapist->dob        = get_user_meta( $user_id, 'therapist_dob', true );

            $areas = $wpdb->get_results( $wpdb->prepare( "
                SELECT a.area_id, a.channel_id,
                       a.duration, a.price, a.deposit_percent, a.therapist_share, a.clinic_share,
                       d1.name as area_name, d2.name as channel_name 
                FROM {$wpdb->prefix}tb_therapist_areas a
                JOIN {$wpdb->prefix}tb_base_definitions d1 ON a.area_id = d1.id
                JOIN {$wpdb->prefix}tb_base_definitions d2 ON a.channel_id = d2.id
                WHERE a.therapist_id = %d", $therapist->id 
            ), ARRAY_A );

            $courses = $wpdb->get_results( $wpdb->prepare( "
                SELECT c.group_id, c.course_id, c.structure_id, c.channel_id,
                       c.duration, c.price, c.deposit_percent, c.therapist_share, c.clinic_share,
                       d1.name as group_name, d2.name as course_name, 
                       d3.name as structure_name, d4.name as channel_name 
                FROM {$wpdb->prefix}tb_therapist_courses c
                JOIN {$wpdb->prefix}tb_base_definitions d1 ON c.group_id = d1.id
                JOIN {$wpdb->prefix}tb_base_definitions d2 ON c.course_id = d2.id
                JOIN {$wpdb->prefix}tb_base_definitions d3 ON c.structure_id = d3.id
                JOIN {$wpdb->prefix}tb_base_definitions d4 ON c.channel_id = d4.id
                WHERE c.therapist_id = %d", $therapist->id 
            ), ARRAY_A );
        }

        wp_send_json_success( array(
            'therapist' => $therapist,
            'areas'     => $areas,
            'courses'   => $courses
        ));
    }

    public static function toggle_status() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $id = intval( $_POST['id'] );
        $status = intval( $_POST['status'] );
        $wpdb->update( $wpdb->prefix . 'tb_therapists', array( 'is_active' => $status ), array( 'id' => $id ) );
        wp_send_json_success();
    }

    public static function restore_therapist() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $id = intval( $_POST['id'] );
        $wpdb->update( $wpdb->prefix . 'tb_therapists', array( 'is_active' => 1 ), array( 'id' => $id ) );
        wp_send_json_success();
    }
}
Therapist_Booking_Therapists::init();