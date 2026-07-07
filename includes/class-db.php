<?php
if ( ! defined( 'ABSPATH' ) ) exit;

class Therapist_Booking_DB {

    public static function create_tables() {
        global $wpdb;
        $charset_collate = $wpdb->get_charset_collate();
        require_once( ABSPATH . 'wp-admin/includes/upgrade.php' );

        $table_base = $wpdb->prefix . 'tb_base_definitions';
        $sql_base = "CREATE TABLE $table_base (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            type varchar(50) NOT NULL,
            code varchar(50) NOT NULL,
            name varchar(255) NOT NULL,
            description text,
            channel_nature varchar(50) DEFAULT NULL,
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta( $sql_base );

        $table_therapists = $wpdb->prefix . 'tb_therapists';
        $sql_therapists = "CREATE TABLE $table_therapists (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            user_id bigint(20) NOT NULL,
            avatar_url varchar(255),
            national_code varchar(20) NOT NULL,
            education varchar(100),
            phone2 varchar(20),
            home_phone varchar(20),
            work_phone varchar(20),
            home_address text,
            work_address text,
            experience text,
            bank_name varchar(100),
            account_number varchar(50),
            card_number varchar(25),
            shaba_number varchar(50),
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY user_id (user_id)
        ) $charset_collate;";
        dbDelta( $sql_therapists );

        $table_t_areas = $wpdb->prefix . 'tb_therapist_areas';
        $sql_t_areas = "CREATE TABLE $table_t_areas (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            therapist_id bigint(20) NOT NULL,
            area_id bigint(20) NOT NULL,
            channel_id bigint(20) NOT NULL,
            duration int(11) NOT NULL,
            price bigint(20) NOT NULL,
            deposit_percent int(11) NOT NULL,
            therapist_share int(11) NOT NULL,
            clinic_share int(11) NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta( $sql_t_areas );

        $table_t_courses = $wpdb->prefix . 'tb_therapist_courses';
        $sql_t_courses = "CREATE TABLE $table_t_courses (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            therapist_id bigint(20) NOT NULL,
            group_id bigint(20) NOT NULL,
            course_id bigint(20) NOT NULL,
            structure_id bigint(20) NOT NULL,
            channel_id bigint(20) NOT NULL,
            duration int(11) NOT NULL,
            price bigint(20) NOT NULL,
            deposit_percent int(11) NOT NULL,
            therapist_share int(11) NOT NULL,
            clinic_share int(11) NOT NULL,
            PRIMARY KEY  (id)
        ) $charset_collate;";
        dbDelta( $sql_t_courses );

        $table_t_settings = $wpdb->prefix . 'tb_therapist_settings';
        $sql_t_settings = "CREATE TABLE $table_t_settings (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            therapist_id bigint(20) NOT NULL,
            google_token text,
            google_email varchar(255),
            buffer_time int(11) DEFAULT 15,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY therapist_id (therapist_id)
        ) $charset_collate;";
        dbDelta( $sql_t_settings );

        $table_t_sessions = $wpdb->prefix . 'tb_therapy_sessions';
        $sql_t_sessions = "CREATE TABLE $table_t_sessions (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            therapist_id bigint(20) NOT NULL,
            area_id bigint(20) NOT NULL,
            channel_id bigint(20) DEFAULT 0,
            client_id bigint(20) DEFAULT NULL,
            start_datetime datetime NOT NULL,
            end_datetime datetime NOT NULL,
            session_duration int(11) DEFAULT NULL,
            session_price bigint(20) DEFAULT NULL,
            session_deposit int(11) DEFAULT NULL,
            session_share_t int(11) DEFAULT NULL,
            session_share_c int(11) DEFAULT NULL,
            status varchar(20) DEFAULT 'available',
            locked_until datetime DEFAULT NULL,
            meet_link varchar(255) DEFAULT NULL,
            google_event_id varchar(255) DEFAULT NULL,
            link_sent tinyint(1) DEFAULT 0,
            reminder_sent tinyint(1) DEFAULT 0,
            followup_sent tinyint(1) DEFAULT 0,
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            UNIQUE KEY unique_session (therapist_id, start_datetime),
            KEY therapist_id (therapist_id),
            KEY start_datetime (start_datetime)
        ) $charset_collate;";
        dbDelta( $sql_t_sessions );

        $table_c_batches = $wpdb->prefix . 'tb_course_batches';
        $sql_c_batches = "CREATE TABLE $table_c_batches (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            therapist_id bigint(20) NOT NULL,
            snapshot_group_name varchar(255) NOT NULL,
            snapshot_course_name varchar(255) NOT NULL,
            snapshot_structure_name varchar(255) NOT NULL,
            snapshot_duration int(11) NOT NULL,
            price_inperson bigint(20) DEFAULT 0,
            deposit_inperson int(11) DEFAULT 0,
            share_t_inperson int(11) DEFAULT 0,
            share_c_inperson int(11) DEFAULT 0,
            price_online bigint(20) DEFAULT 0,
            deposit_online int(11) DEFAULT 0,
            share_t_online int(11) DEFAULT 0,
            share_c_online int(11) DEFAULT 0,
            capacity_inperson int(11) DEFAULT 0,
            capacity_online int(11) DEFAULT 0,
            skyroom_room_id varchar(100) DEFAULT NULL,
            skyroom_room_url varchar(255) DEFAULT NULL,
            status varchar(50) DEFAULT 'registering',
            is_active tinyint(1) DEFAULT 1,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY therapist_id (therapist_id)
        ) $charset_collate;";
        dbDelta( $sql_c_batches );

        $table_c_sessions = $wpdb->prefix . 'tb_course_sessions';
        $sql_c_sessions = "CREATE TABLE $table_c_sessions (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            batch_id bigint(20) NOT NULL,
            session_number int(11) NOT NULL,
            start_datetime datetime NOT NULL,
            end_datetime datetime NOT NULL,
            status varchar(50) DEFAULT 'pending',
            is_active tinyint(1) DEFAULT 1,
            PRIMARY KEY  (id),
            KEY batch_id (batch_id)
        ) $charset_collate;";
        dbDelta( $sql_c_sessions );

        $table_c_enrollments = $wpdb->prefix . 'tb_course_enrollments';
        $sql_c_enrollments = "CREATE TABLE $table_c_enrollments (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            batch_id bigint(20) NOT NULL,
            client_id bigint(20) NOT NULL,
            channel_type varchar(50) NOT NULL,
            total_price bigint(20) NOT NULL,
            paid_amount bigint(20) DEFAULT 0,
            debt_amount bigint(20) DEFAULT 0,
            status varchar(50) DEFAULT 'active',
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY  (id),
            KEY batch_id (batch_id),
            KEY client_id (client_id)
        ) $charset_collate;";
        dbDelta( $sql_c_enrollments );

        $table_c_installments = $wpdb->prefix . 'tb_course_installments';
        $sql_c_installments = "CREATE TABLE $table_c_installments (
            id bigint(20) NOT NULL AUTO_INCREMENT,
            batch_id bigint(20) NOT NULL,
            client_id bigint(20) DEFAULT 0,
            title varchar(255) NOT NULL,
            percent float NOT NULL,
            amount bigint(20) DEFAULT 0,
            due_date date NOT NULL,
            is_paid tinyint(1) DEFAULT 0,
            paid_date datetime DEFAULT NULL,
            late_fee_applied tinyint(1) DEFAULT 0,
            PRIMARY KEY  (id),
            KEY batch_id (batch_id),
            KEY client_id (client_id)
        ) $charset_collate;";
        dbDelta( $sql_c_installments );
    }
}