<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Admin_UI {

    public static function init() {
        add_action( 'admin_menu', array( __CLASS__, 'add_admin_menus' ) );
        add_action( 'admin_enqueue_scripts', array( __CLASS__, 'enqueue_assets' ) );
    }

    public static function add_admin_menus() {
        add_menu_page(
            'مدیریت کلینیک',
            'مدیریت کلینیک',
            'manage_options',
            'tb-clinic-management',
            array( __CLASS__, 'render_integrated_system' ),
            'dashicons-building',
            29
        );

        add_submenu_page(
            'tb-clinic-management',
            'سیستم یکپارچه',
            'سیستم یکپارچه',
            'manage_options',
            'tb-clinic-management',
            array( __CLASS__, 'render_integrated_system' )
        );

        add_submenu_page(
            'tb-clinic-management',
            'تنظیمات فنی',
            'تنظیمات فنی',
            'manage_options',
            'tb-technical-settings',
            array( __CLASS__, 'render_technical_settings' )
        );

        add_submenu_page(
            'tb-clinic-management',
            'اطلاعات کلینیک',
            'اطلاعات کلینیک',
            'manage_options',
            'tb-clinic-info',
            array( __CLASS__, 'render_clinic_info' )
        );
    }

    public static function enqueue_assets( $hook ) {
        if ( strpos( $hook, 'tb-' ) === false ) {
            return;
        }

        // استفاده از time() برای دور زدن کش مرورگر موبایل
        $cache_buster = time();

        // لود کردن بوت‌استرپ
        wp_enqueue_style( 'tb-bootstrap-rtl', TB_URL . 'assets/css/bootstrap.rtl.css', array(), $cache_buster );
        
        // لود کردن کتابخانه‌های تقویم و ساعت از پوشه assets افزونه
        wp_enqueue_style( 'tb-persian-datepicker-css', TB_URL . 'assets/css/persian-datepicker.min.css', array(), $cache_buster );
        wp_enqueue_style( 'tb-clockpicker-css', TB_URL . 'assets/css/jquery-clockpicker.min.css', array(), $cache_buster );
        
        // لود کردن فایل‌های تفکیک‌شده CSS
        wp_enqueue_style( 'tb-core-style', TB_URL . 'assets/css/tb-core-style.css', array('tb-bootstrap-rtl'), $cache_buster );
        wp_enqueue_style( 'tb-base-definitions-style', TB_URL . 'assets/css/tb-base-definitions-style.css', array('tb-core-style'), $cache_buster );
        wp_enqueue_style( 'tb-therapists-style', TB_URL . 'assets/css/tb-therapists-style.css', array('tb-core-style'), $cache_buster );
        wp_enqueue_style( 'tb-therapy-calendar-style', TB_URL . 'assets/css/tb-therapy-calendar.css', array('tb-core-style'), $cache_buster );
        
        // 👈 استایل جدید تقویم دوره‌های آموزشی
        wp_enqueue_style( 'tb-course-calendar-style', TB_URL . 'assets/css/tb-course-calendar.css', array('tb-core-style'), $cache_buster );

        // لود کردن اسکریپت‌های کتابخانه‌ای از پوشه assets افزونه
        wp_enqueue_script( 'tb-persian-date-js', TB_URL . 'assets/js/persian-date.min.js', array('jquery'), $cache_buster, true );
        wp_enqueue_script( 'tb-persian-datepicker-js', TB_URL . 'assets/js/persian-datepicker.min.js', array('jquery', 'tb-persian-date-js'), $cache_buster, true );
        wp_enqueue_script( 'tb-clockpicker-js', TB_URL . 'assets/js/jquery-clockpicker.min.js', array('jquery'), $cache_buster, true );

        // لود کردن فایل‌های تفکیک‌شده جاوااسکریپت
        wp_enqueue_script( 'tb-core-script', TB_URL . 'assets/js/tb-core.js', array('jquery'), $cache_buster, true );
        wp_enqueue_script( 'tb-base-definitions-script', TB_URL . 'assets/js/tb-base-definitions.js', array('tb-core-script'), $cache_buster, true );
        wp_enqueue_script( 'tb-therapists-script', TB_URL . 'assets/js/tb-therapists.js', array('tb-core-script'), $cache_buster, true );
        wp_enqueue_script( 'tb-admin-therapy-calendar-script', TB_URL . 'assets/js/tb-admin-therapy-calendar.js', array('tb-core-script', 'tb-persian-datepicker-js', 'tb-clockpicker-js'), $cache_buster, true );
        wp_enqueue_script( 'tb-technical-settings-script', TB_URL . 'assets/js/tb-technical-settings.js', array('tb-core-script'), $cache_buster, true );
        
        // 👈 اسکریپت جدید تقویم دوره‌های آموزشی
        wp_enqueue_script( 'tb-admin-course-calendar-script', TB_URL . 'assets/js/tb-admin-course-calendar.js', array('tb-core-script', 'tb-persian-datepicker-js', 'tb-clockpicker-js'), $cache_buster, true );

        // ارسال متغیرهای سراسری به فایل Core
        wp_localize_script( 'tb-core-script', 'TB_Admin', array(
            'ajaxurl' => admin_url( 'admin-ajax.php' ),
            'nonce'   => wp_create_nonce( 'tb_admin_nonce' )
        ));
    }

    public static function render_integrated_system() {
        require_once TB_DIR . 'templates/admin-integrated-system.php';
    }

    public static function render_technical_settings() {
        $active_tab = 'settings';
        require_once TB_DIR . 'templates/admin-technical-settings.php';
    }

    public static function render_clinic_info() {
        $active_tab = 'info';
        require_once TB_DIR . 'templates/admin-technical-settings.php';
    }
}