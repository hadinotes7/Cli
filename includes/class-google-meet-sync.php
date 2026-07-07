<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

use Carbon\Carbon;

class Therapist_Booking_Google_Sync {

    public static function init() {
        add_action( 'wp_ajax_tb_google_oauth_callback', array( __CLASS__, 'handle_oauth_callback' ) );
        add_action( 'wp_ajax_tb_disconnect_google', array( __CLASS__, 'ajax_disconnect_account' ) );
    }

    private static function get_client() {
        if ( ! class_exists( 'Google_Client' ) ) {
            return false;
        }

        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        $client_id = isset($global_settings['google_client_id']) ? $global_settings['google_client_id'] : '';
        $client_secret = isset($global_settings['google_client_secret']) ? $global_settings['google_client_secret'] : '';

        if ( empty($client_id) || empty($client_secret) ) {
            return false; 
        }

        $client = new Google_Client();
        $client->setClientId( $client_id );
        $client->setClientSecret( $client_secret );
        
        $redirect_uri = admin_url( 'admin-ajax.php?action=tb_google_oauth_callback' );
        $client->setRedirectUri( $redirect_uri );
        
        $guzzleClient = new \GuzzleHttp\Client(['verify' => false]);
        $client->setHttpClient($guzzleClient);
        
        $client->addScope( Google_Service_Calendar::CALENDAR );
        $client->addScope( 'email' ); 
        $client->addScope( 'profile' );
        
        $client->setAccessType( 'offline' );
        $client->setPrompt( 'consent' );
        return $client;
    }

 public static function get_auth_url( $therapist_id ) {
        $client = self::get_client();
        if ( ! $client ) return '#'; 

        // 👈 تغییر مهم: گرفتن آدرس واقعی برگه‌ای که کاربر در آن قرار دارد
        $current_url = wp_get_referer();
        if ( ! $current_url ) {
            $current_url = home_url(); // اگر آدرس پیدا نشد، به صفحه اصلی برگردد
        }

        // پاک کردن پارامترهای قبلی برای جلوگیری از تکرار در URL
        $current_url = remove_query_arg( 'google_sync', $current_url );

        $state_data = array(
            't_id'       => $therapist_id,
            'return_url' => $current_url
        );

        $client->setState( base64_encode( json_encode( $state_data ) ) );
        return $client->createAuthUrl();
    }
    public static function handle_oauth_callback() {
        if ( ! isset( $_GET['code'] ) || ! isset( $_GET['state'] ) ) {
            wp_die( 'درخواست نامعتبر است. کُد گوگل دریافت نشد.' );
        }

        $state = json_decode( base64_decode( $_GET['state'] ), true );
        $therapist_id = isset( $state['t_id'] ) ? intval( $state['t_id'] ) : 0;
        
        $return_url = isset( $state['return_url'] ) ? esc_url_raw( $state['return_url'] ) : admin_url( 'admin.php?page=tb-clinic-management' );

        if ( ! $therapist_id ) wp_die( 'شناسه درمانگر یافت نشد.' );

        $client = self::get_client();
        
        try {
            $token = $client->fetchAccessTokenWithAuthCode( $_GET['code'] );

            if ( isset( $token['error'] ) ) {
                wp_die( 'خطا در دریافت توکن از گوگل: ' . $token['error'] . ' - ' . (isset($token['error_description']) ? $token['error_description'] : '') );
            }

            $client->setAccessToken( $token );

            $oauth2 = new Google_Service_Oauth2( $client );
            $user_info = $oauth2->userinfo->get();
            $email = $user_info->email;

            global $wpdb;
            $table = $wpdb->prefix . 'tb_therapist_settings';
            
            $existing = $wpdb->get_row( $wpdb->prepare( "SELECT id FROM $table WHERE therapist_id = %d", $therapist_id ) );
            
            $data = array(
                'google_token' => json_encode( $token ),
                'google_email' => $email
            );

            if ( $existing ) {
                $wpdb->update( $table, $data, array( 'id' => $existing->id ) );
            } else {
                $data['therapist_id'] = $therapist_id;
                $wpdb->insert( $table, $data );
            }

            self::regenerate_future_links( $therapist_id, $client );

            $return_url = add_query_arg( 'google_sync', 'success', $return_url );

            wp_redirect( $return_url );
            exit;

        } catch (Exception $e) {
            wp_die( 'یک خطای سیستمی رخ داد: <br><br>' . $e->getMessage() );
        }
    }

    public static function ajax_disconnect_account() {
        check_ajax_referer( 'tb_admin_nonce', 'security' );
        global $wpdb;
        $therapist_id = intval( $_POST['therapist_id'] );
        $has_access   = isset( $_POST['has_access'] ) && $_POST['has_access'] == 'true';

        $table = $wpdb->prefix . 'tb_therapist_settings';
        $settings = $wpdb->get_row( $wpdb->prepare( "SELECT google_token FROM $table WHERE therapist_id = %d", $therapist_id ) );

        if ( $settings && $settings->google_token ) {
            $client = self::get_client();
            $client->setAccessToken( json_decode( $settings->google_token, true ) );

            if ( $has_access ) {
                $service = new Google_Service_Calendar( $client );
                $sessions_table = $wpdb->prefix . 'tb_therapy_sessions';
                $future_sessions = $wpdb->get_results( $wpdb->prepare( "
                    SELECT id, google_event_id FROM $sessions_table 
                    WHERE therapist_id = %d AND status = 'booked' AND start_datetime > NOW() AND google_event_id IS NOT NULL
                ", $therapist_id ) );

                foreach ( $future_sessions as $session ) {
                    try {
                        $service->events->delete( 'primary', $session->google_event_id );
                    } catch ( Exception $e ) {
                        // نادیده گرفتن خطا
                    }
                }
            }

            $client->revokeToken();
        }

        $wpdb->update( $table, array( 'google_token' => null, 'google_email' => null ), array( 'therapist_id' => $therapist_id ) );

        wp_send_json_success( 'اتصال با موفقیت قطع شد. اکنون می‌توانید اکانت جدید را متصل کنید.' );
    }

    public static function check_google_conflict( $therapist_id, $start_datetime, $end_datetime ) {
        $settings = Therapist_Booking_Therapy_Calendar::get_therapist_settings( $therapist_id );
        if ( empty( $settings->google_token ) ) return false;

        $client = self::get_client();
        $client->setAccessToken( json_decode( $settings->google_token, true ) );

        if ( $client->isAccessTokenExpired() ) {
            $client->fetchAccessTokenWithRefreshToken( $client->getRefreshToken() );
            global $wpdb;
            $wpdb->update( $wpdb->prefix . 'tb_therapist_settings', array( 'google_token' => json_encode( $client->getAccessToken() ) ), array( 'therapist_id' => $therapist_id ) );
        }

        $service = new Google_Service_Calendar( $client );

        $timeMin = Carbon::parse( $start_datetime, 'Asia/Tehran' )->toRfc3339String();
        $timeMax = Carbon::parse( $end_datetime, 'Asia/Tehran' )->toRfc3339String();

        $optParams = array(
            'timeMin'      => $timeMin,
            'timeMax'      => $timeMax,
            'singleEvents' => true,
        );

        try {
            $events = $service->events->listEvents( 'primary', $optParams );
            if ( count( $events->getItems() ) > 0 ) {
                return true;
            }
        } catch ( Exception $e ) {
            return false;
        }

        return false;
    }

    public static function create_meet_event( $session_id ) {
        global $wpdb;
        $table_sessions = $wpdb->prefix . 'tb_therapy_sessions';
        $session = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table_sessions WHERE id = %d", $session_id ) );
        
        if ( ! $session ) return false;

        // 👈 سد امنیتی جدید: بررسی ماهیت کانال
        $channel_nature = $wpdb->get_var($wpdb->prepare("
            SELECT c.channel_nature 
            FROM {$wpdb->prefix}tb_therapist_areas ta
            JOIN {$wpdb->prefix}tb_base_definitions c ON ta.channel_id = c.id
            WHERE ta.therapist_id = %d AND ta.area_id = %d
        ", $session->therapist_id, $session->area_id));

        // اگر کانال آنلاین نیست، اصلاً به گوگل وصل نشو و لینک نساز
        if ( $channel_nature !== 'online' ) {
            return false; 
        }

        $settings = Therapist_Booking_Therapy_Calendar::get_therapist_settings( $session->therapist_id );
        if ( empty( $settings->google_token ) ) return false;

        $client = self::get_client();
        $client->setAccessToken( json_decode( $settings->google_token, true ) );

        if ( $client->isAccessTokenExpired() ) {
            $client->fetchAccessTokenWithRefreshToken( $client->getRefreshToken() );
            $wpdb->update( $wpdb->prefix . 'tb_therapist_settings', array( 'google_token' => json_encode( $client->getAccessToken() ) ), array( 'therapist_id' => $session->therapist_id ) );
        }

        $service = new Google_Service_Calendar( $client );

        $client_name = get_user_meta( $session->client_id, 'first_name', true ) . ' ' . get_user_meta( $session->client_id, 'last_name', true );
        
        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        $template = isset($global_settings['google_event_template']) ? $global_settings['google_event_template'] : 'مشاوره {نام_مراجع}';
        
        $summary = str_replace(
            array('{نام_مراجع}', '{شماره_مراجع}', '{نوع_خدمت}', '{کد_پیگیری}'),
            array($client_name, get_userdata($session->client_id)->user_login, 'روان‌درمانی', $session->id),
            $template
        );

        $event = new Google_Service_Calendar_Event(array(
            'summary' => $summary,
            'start' => array(
                'dateTime' => Carbon::parse( $session->start_datetime, 'Asia/Tehran' )->toRfc3339String(),
                'timeZone' => 'Asia/Tehran',
            ),
            'end' => array(
                'dateTime' => Carbon::parse( $session->end_datetime, 'Asia/Tehran' )->toRfc3339String(),
                'timeZone' => 'Asia/Tehran',
            ),
            'conferenceData' => array(
                'createRequest' => array(
                    'requestId' => uniqid( 'meet_' ),
                    'conferenceSolutionKey' => array( 'type' => 'hangoutsMeet' )
                )
            )
        ));

        try {
            $createdEvent = $service->events->insert( 'primary', $event, array( 'conferenceDataVersion' => 1 ) );
            $meet_link = $createdEvent->getHangoutLink();
            $event_id  = $createdEvent->getId();

            $wpdb->update( $table_sessions, array(
                'meet_link'       => $meet_link,
                'google_event_id' => $event_id
            ), array( 'id' => $session_id ) );

            return array( 'link' => $meet_link, 'event_id' => $event_id );

        } catch ( Exception $e ) {
            return false;
        }
    }

    public static function update_meet_event( $session_id, $new_start_datetime ) {
        return true;
    }

    public static function delete_meet_event( $session_id ) {
        return true;
    }

    private static function regenerate_future_links( $therapist_id, $client ) {
        global $wpdb;
        $sessions_table = $wpdb->prefix . 'tb_therapy_sessions';
        
        $future_sessions = $wpdb->get_results( $wpdb->prepare( "
            SELECT id FROM $sessions_table 
            WHERE therapist_id = %d AND status = 'booked' AND start_datetime > NOW()
        ", $therapist_id ) );

        $updated_count = 0;
        foreach ( $future_sessions as $session ) {
            $result = self::create_meet_event( $session->id );
            if ( $result ) {
                $updated_count++;
            }
        }

        return $updated_count;
    }
}