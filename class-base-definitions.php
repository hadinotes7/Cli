<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Therapist_Booking_Base_Definitions {

    public static function init() {
        add_action( 'wp_ajax_tb_get_base_items', array( __CLASS__, 'get_items' ) );
        add_action( 'wp_ajax_tb_save_base_item', array( __CLASS__, 'save_item' ) );
        add_action( 'wp_ajax_tb_delete_base_item', array( __CLASS__, 'delete_item' ) );
        add_action( 'wp_ajax_tb_restore_base_item', array( __CLASS__, 'restore_item' ) );
    }

    public static function get_items() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $table = $wpdb->prefix . 'tb_base_definitions';
        
        $type = sanitize_text_field( $_POST['type'] );
        $show_deleted = isset( $_POST['show_deleted'] ) && $_POST['show_deleted'] == 'true' ? 0 : 1;
        $search = isset( $_POST['search'] ) ? sanitize_text_field( $_POST['search'] ) : '';
        $per_page = isset( $_POST['per_page'] ) ? intval( $_POST['per_page'] ) : 10;
        $paged = isset( $_POST['paged'] ) ? intval( $_POST['paged'] ) : 1;
        $offset = ( $paged - 1 ) * $per_page;

        $where = $wpdb->prepare( "WHERE type = %s AND is_active = %d", $type, $show_deleted );
        
        if ( ! empty( $search ) ) {
            $where .= $wpdb->prepare( " AND name LIKE %s", '%' . $wpdb->esc_like( $search ) . '%' );
        }

        $total_items = $wpdb->get_var( "SELECT COUNT(id) FROM $table $where" );
        $total_pages = ceil( $total_items / $per_page );

        $items = $wpdb->get_results( "SELECT * FROM $table $where ORDER BY id DESC LIMIT $offset, $per_page" );

        wp_send_json_success( array(
            'items'       => $items,
            'total_pages' => $total_pages,
            'paged'       => $paged
        ));
    }

    public static function save_item() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $table = $wpdb->prefix . 'tb_base_definitions';

        $id = isset( $_POST['id'] ) ? intval( $_POST['id'] ) : 0;
        $type = sanitize_text_field( $_POST['type'] );
        $name = sanitize_text_field( $_POST['name'] );
        $desc = sanitize_textarea_field( $_POST['description'] );
        $channel_nature = isset( $_POST['channel_nature'] ) ? sanitize_text_field( $_POST['channel_nature'] ) : null;
        $force_restore = isset( $_POST['force_restore'] ) && $_POST['force_restore'] == 'true';

        if ( empty( $name ) ) {
            wp_send_json_error( 'نام نمی‌تواند خالی باشد.' );
        }

        $existing = $wpdb->get_row( $wpdb->prepare(
            "SELECT * FROM $table WHERE type = %s AND name = %s", $type, $name
        ));

        if ( $existing && $existing->id != $id ) {
            if ( $existing->is_active == 0 ) {
                if ( $force_restore ) {
                    $wpdb->update( $table, array( 'description' => $desc, 'channel_nature' => $channel_nature, 'is_active' => 1 ), array( 'id' => $existing->id ) );
                    wp_send_json_success( array( 'message' => 'آیتم با موفقیت بازیابی و بروزرسانی شد.', 'action' => 'restored' ) );
                } else {
                    wp_send_json_error( array( 'error_type' => 'deleted_exists', 'message' => 'این آیتم قبلاً ثبت و غیرفعال شده است. آیا مایلید آن را بازیابی کنید؟' ) );
                }
            } else {
                wp_send_json_error( 'این نام قبلاً در سیستم ثبت شده است.' );
            }
        }

        if ( $id > 0 ) {
            $wpdb->update( $table, array( 'name' => $name, 'description' => $desc, 'channel_nature' => $channel_nature ), array( 'id' => $id ) );
            wp_send_json_success( array( 'message' => 'با موفقیت ویرایش شد.', 'action' => 'updated' ) );
        } else {
            $count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE type = %s", $type ) );
            
            $prefix = strtoupper( substr( $type, 0, 3 ) );
            if ( $type === 'edu_group' ) $prefix = 'GRP';

            $new_code = $prefix . '-' . str_pad( $count + 1, 4, '0', STR_PAD_LEFT );

            $wpdb->insert( $table, array(
                'type' => $type,
                'code' => $new_code,
                'name' => $name,
                'description' => $desc,
                'channel_nature' => $channel_nature,
                'is_active' => 1
            ));
            wp_send_json_success( array( 'message' => 'با موفقیت اضافه شد.', 'action' => 'inserted' ) );
        }
    }

    public static function delete_item() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $table = $wpdb->prefix . 'tb_base_definitions';
        $id = intval( $_POST['id'] );
        $wpdb->update( $table, array( 'is_active' => 0 ), array( 'id' => $id ) );
        wp_send_json_success( 'آیتم با موفقیت حذف شد.' );
    }

    public static function restore_item() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $table = $wpdb->prefix . 'tb_base_definitions';
        $id = intval( $_POST['id'] );
        $wpdb->update( $table, array( 'is_active' => 1 ), array( 'id' => $id ) );
        wp_send_json_success( 'آیتم با موفقیت بازیابی شد.' );
    }
}
Therapist_Booking_Base_Definitions::init();