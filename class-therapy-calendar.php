<?php
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class Therapist_Booking_Therapy_Calendar {

    public static function has_active_therapy_areas( $therapist_id ) {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapist_areas';
        $count = $wpdb->get_var( $wpdb->prepare( "SELECT COUNT(*) FROM $table WHERE therapist_id = %d", $therapist_id ) );
        return intval( $count ) > 0;
    }

    public static function get_therapist_settings( $therapist_id ) {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapist_settings';
        $settings = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM $table WHERE therapist_id = %d", $therapist_id ) );
        
        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        $default_buffer = isset( $global_settings['default_buffer_time'] ) ? intval( $global_settings['default_buffer_time'] ) : 15;

        if ( ! $settings ) {
            return (object) array(
                'buffer_time'  => $default_buffer,
                'google_token' => null,
                'google_email' => null
            );
        }

        $settings->buffer_time = $default_buffer;

        return $settings;
    }

    public static function check_internal_conflict( $therapist_id, $start_datetime, $end_datetime, $buffer = 0, $exclude_session_id = 0 ) {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        
        $query = $wpdb->prepare( "
            SELECT id FROM $table 
            WHERE therapist_id = %d 
            AND is_active = 1 
            AND status != 'deleted'
            AND id != %d
            AND (
                start_datetime < DATE_ADD(%s, INTERVAL %d MINUTE)
                AND 
                DATE_ADD(end_datetime, INTERVAL %d MINUTE) > %s
            ) LIMIT 1
        ", $therapist_id, $exclude_session_id, $end_datetime, $buffer, $buffer, $start_datetime );

        $conflict = $wpdb->get_var( $query );
        return $conflict ? true : false;
    }

    public static function find_next_available_time( $therapist_id, $date_str, $requested_start_ts, $duration, $buffer, $exclude_session_id = 0 ) {
        global $wpdb;
        $table = $wpdb->prefix . 'tb_therapy_sessions';
        
        $sessions = $wpdb->get_results( $wpdb->prepare("
            SELECT start_datetime, end_datetime FROM $table
            WHERE therapist_id = %d AND is_active = 1 AND status != 'deleted' AND id != %d
            AND DATE(start_datetime) = %s
            ORDER BY start_datetime ASC
        ", $therapist_id, $exclude_session_id, $date_str) );

        $proposed_start = $requested_start_ts;

        foreach ( $sessions as $s ) {
            $s_start = strtotime( $s->start_datetime );
            $s_end   = strtotime( $s->end_datetime );

            $proposed_end = $proposed_start + ($duration * 60);

            $b_start = $s_start - ($buffer * 60);
            $b_end   = $s_end + ($buffer * 60);

            if ( $proposed_start < $b_end && $proposed_end > $b_start ) {
                $proposed_start = $b_end;
            }
        }

        if ( date('Y-m-d', $proposed_start) != $date_str ) {
            return false; 
        }

        return date('H:i', $proposed_start);
    }

    public static function generate_batch_sessions( $therapist_id, $area_id, $channel_id, $start_date, $end_date, $week_days_data, $buffer, $current_tehran_timestamp ) {
        global $wpdb;

        date_default_timezone_set('Asia/Tehran');
        
        $area_table = $wpdb->prefix . 'tb_therapist_areas';
        
        $area_data = $wpdb->get_row( $wpdb->prepare( "
            SELECT duration, price, deposit_percent, therapist_share, clinic_share 
            FROM $area_table 
            WHERE therapist_id = %d AND area_id = %d AND channel_id = %d 
            LIMIT 1
        ", $therapist_id, $area_id, $channel_id ) );
        
        if ( ! $area_data ) {
            return array( 'success' => false, 'message' => 'حوزه درمانی نامعتبر است یا قیمت‌گذاری نشده است.' );
        }

        $settings = self::get_therapist_settings( $therapist_id );

        $start_timestamp = strtotime( $start_date . ' 00:00:00' );
        $end_timestamp   = strtotime( $end_date . ' 23:59:59' );

        if ( ! $start_timestamp || ! $end_timestamp ) {
            return array( 'success' => false, 'message' => 'فرمت تاریخ نامعتبر است.' );
        }

        if ( $start_timestamp > $end_timestamp ) {
            return array( 'success' => false, 'message' => 'تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.' );
        }

        $mapped_schedule = array();
        foreach ($week_days_data as $wd) {
            $mapped_schedule[ intval($wd['day']) ] = array(
                'start' => sanitize_text_field($wd['start']),
                'end'   => sanitize_text_field($wd['end'])
            );
        }
        
        $generated_count = 0;
        $conflict_count  = 0;
        $skipped_slots   = array();
        $sessions_table  = $wpdb->prefix . 'tb_therapy_sessions';

        for ( $current_day_ts = $start_timestamp; $current_day_ts <= $end_timestamp; $current_day_ts += 86400 ) {
            
            $php_day_of_week = (int) date( 'w', $current_day_ts );
            $mapped_day = ($php_day_of_week == 6) ? 6 : $php_day_of_week;

            if ( array_key_exists( $mapped_day, $mapped_schedule ) ) {
                
                $current_date_str = date( 'Y-m-d', $current_day_ts );
                
                $day_start_time = $mapped_schedule[$mapped_day]['start'];
                $day_end_time   = $mapped_schedule[$mapped_day]['end'];
                
                $session_start_ts = strtotime( $current_date_str . ' ' . $day_start_time );
                $day_end_limit_ts = strtotime( $current_date_str . ' ' . $day_end_time );

                if ( $session_start_ts >= $day_end_limit_ts ) {
                    continue; 
                }

                while ( ($session_start_ts + (intval($area_data->duration) * 60)) <= $day_end_limit_ts ) {
                    
                    if ( $session_start_ts < $current_tehran_timestamp ) {
                        $total_step_seconds = ( intval( $area_data->duration ) + $buffer ) * 60;
                        $session_start_ts += $total_step_seconds;
                        continue; 
                    }

                    $session_end_ts = $session_start_ts + ( intval( $area_data->duration ) * 60 );

                    $session_start = date( 'Y-m-d H:i:s', $session_start_ts );
                    $session_end   = date( 'Y-m-d H:i:s', $session_end_ts );

                    $has_internal_conflict = self::check_internal_conflict( $therapist_id, $session_start, $session_end, $buffer );
                    
                    $has_google_conflict = false;
                    if ( $settings->google_token ) {
                        $has_google_conflict = Therapist_Booking_Google_Sync::check_google_conflict( $therapist_id, $session_start, $session_end );
                    }

                    if ( ! $has_internal_conflict && ! $has_google_conflict ) {
                        $wpdb->insert( $sessions_table, array(
                            'therapist_id'     => $therapist_id,
                            'area_id'          => $area_id,
                            'channel_id'       => $channel_id,
                            'start_datetime'   => $session_start,
                            'end_datetime'     => $session_end,
                            'session_duration' => $area_data->duration,
                            'session_price'    => $area_data->price,
                            'session_deposit'  => $area_data->deposit_percent,
                            'session_share_t'  => $area_data->therapist_share,
                            'session_share_c'  => $area_data->clinic_share,
                            'status'           => 'available',
                            'is_active'        => 1
                        ));
                        $generated_count++;
                    } else {
                        $conflict_count++;
                        $skipped_slots[] = date('Y-m-d H:i', $session_start_ts);
                    }

                    $total_step_seconds = ( intval( $area_data->duration ) + $buffer ) * 60;
                    $session_start_ts += $total_step_seconds;
                }
            }
        }

        if ( $generated_count == 0 && $conflict_count == 0 ) {
            return array( 'success' => false, 'message' => 'هیچ تایمی تولید نشد! لطفاً بررسی کنید که روزهای انتخاب شده در بازه تاریخی وجود داشته باشند.' );
        }

        return array( 
            'success'       => true, 
            'generated'     => $generated_count, 
            'conflicts'     => $conflict_count,
            'skipped_slots' => $skipped_slots
        );
    }

public static function get_sessions_list( $args ) {
        global $wpdb;
        
        $therapist_id = $args['therapist_id'];
        $paged        = $args['paged'];
        $per_page     = $args['per_page'];
        $offset       = ( $paged - 1 ) * $per_page;
        
        $table_sessions = $wpdb->prefix . 'tb_therapy_sessions';
        $table_areas    = $wpdb->prefix . 'tb_base_definitions';
        $table_channels = $wpdb->prefix . 'tb_base_definitions';
        $table_t_areas  = $wpdb->prefix . 'tb_therapist_areas';
        $table_users    = $wpdb->users;
        $table_usermeta = $wpdb->usermeta;

        // 👈 حل قطعی باگ فیلتر وضعیت: تفکیک جلسات فعال (1) و حذف نرم شده (0)
        $where = $wpdb->prepare( "WHERE s.therapist_id = %d", $therapist_id );

        if ( $args['status'] === 'all' ) {
            // حالت پیش‌فرض: فقط جلسات فعال را نشان بده
            $where .= " AND s.is_active = 1";
        } elseif ( $args['status'] === 'deleted' || $args['status'] === 'cancelled' ) {
            // اگر فیلتر روی حذف‌شده یا لغوشده بود: برو سراغ جلسات غیرفعال
            $where .= $wpdb->prepare( " AND s.is_active = 0 AND s.status = %s", $args['status'] );
        } else {
            // برای سایر وضعیت‌ها (آزاد، رزرو، پایان‌یافته، غیبت): در بین جلسات فعال بگرد
            $where .= $wpdb->prepare( " AND s.is_active = 1 AND s.status = %s", $args['status'] );
        }

// 👈 حل قطعی باگ فیلتر حوزه درمانی: جدا کردن area_id و channel_id
        if ( $args['area'] !== 'all' ) {
            $combo_id = sanitize_text_field( $args['area'] );
            $parts    = explode('_', $combo_id);
            $area_id  = isset($parts[0]) ? intval($parts[0]) : 0;
            $chan_id  = isset($parts[1]) ? intval($parts[1]) : 0;

            if ( $area_id > 0 ) {
                $where .= $wpdb->prepare( " AND s.area_id = %d", $area_id );
            }
            if ( $chan_id > 0 ) {
                $where .= $wpdb->prepare( " AND s.channel_id = %d", $chan_id );
            }
        }

        if ( ! empty( $args['start_date'] ) ) {
            $where .= $wpdb->prepare( " AND s.start_datetime >= %s", $args['start_date'] . ' 00:00:00' );
        }
        if ( ! empty( $args['end_date'] ) ) {
            $where .= $wpdb->prepare( " AND s.start_datetime <= %s", $args['end_date'] . ' 23:59:59' );
        }

        if ( $args['day'] !== 'all' ) {
            $mysql_day = intval($args['day']) + 1;
            if ($mysql_day == 7) $mysql_day = 7; 
            elseif ($mysql_day == 1) $mysql_day = 1; 
            
            $where .= $wpdb->prepare( " AND DAYOFWEEK(s.start_datetime) = %d", $mysql_day );
        }

// 👈 حل قطعی باگ جستجوی مراجع: بررسی دقیق خالی نبودن متغیرها
        if ( ! empty( $args['client_id'] ) && intval( $args['client_id'] ) > 0 ) {
            // اگر ID مراجع از لیست کشویی انتخاب شده بود
            $where .= $wpdb->prepare( " AND s.client_id = %d", intval( $args['client_id'] ) );
        } elseif ( ! empty( $args['client_name'] ) ) {
            // اگر فقط متن تایپ شده بود (بدون انتخاب از لیست)
            $search_term = '%' . $wpdb->esc_like( $args['client_name'] ) . '%';
            $where .= $wpdb->prepare( " AND (m1.meta_value LIKE %s OR m2.meta_value LIKE %s OR CONCAT(m1.meta_value, ' ', m2.meta_value) LIKE %s)", $search_term, $search_term, $search_term );
        }
        
        $query = "
            SELECT s.*, a.name as area_name, c.name as channel_name, ta.duration, ta.price,
                   u.user_login as client_mobile,
                   m1.meta_value as client_first_name, m2.meta_value as client_last_name
            FROM $table_sessions s
            LEFT JOIN $table_areas a ON s.area_id = a.id
            LEFT JOIN $table_t_areas ta ON s.area_id = ta.area_id AND s.channel_id = ta.channel_id AND s.therapist_id = ta.therapist_id
            LEFT JOIN $table_channels c ON s.channel_id = c.id
            LEFT JOIN $table_users u ON s.client_id = u.ID
            LEFT JOIN $table_usermeta m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name'
            LEFT JOIN $table_usermeta m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name'
            $where
            ORDER BY s.start_datetime ASC
            LIMIT $offset, $per_page
        ";

        $items = $wpdb->get_results( $query );
        $total_items = $wpdb->get_var( "
            SELECT COUNT(s.id) 
            FROM $table_sessions s
            LEFT JOIN $table_users u ON s.client_id = u.ID
            LEFT JOIN $table_usermeta m1 ON u.ID = m1.user_id AND m1.meta_key = 'first_name'
            LEFT JOIN $table_usermeta m2 ON u.ID = m2.user_id AND m2.meta_key = 'last_name'
            $where
        " );
        $total_pages = ceil( $total_items / $per_page );

        return array(
            'items'       => $items,
            'total_pages' => $total_pages,
            'paged'       => $paged
        );
    }

    public static function send_sms( $phone, $pattern_id, $args ) {
        $global_settings = get_option( 'tb_therapy_calendar_settings', array() );
        $api_key = isset( $global_settings['sms_api_key'] ) ? $global_settings['sms_api_key'] : '';

        if ( empty( $api_key ) || empty( $pattern_id ) || empty( $phone ) ) {
            return false;
        }

        $persian = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
        $english = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
        $phone = str_replace($persian, $english, $phone);

        $url = 'https://console.melipayamak.com/api/send/shared/' . $api_key;
        
        $body = array(
            'bodyId' => intval( $pattern_id ),
            'to'     => $phone,
            'args'   => $args
        );

        $response = wp_remote_post( $url, array(
            'method'      => 'POST',
            'timeout'     => 15,
            'redirection' => 5,
            'httpversion' => '1.0',
            'blocking'    => true,
            'headers'     => array(
                'Content-Type' => 'application/json',
            ),
            'body'        => json_encode( $body ),
            'sslverify'   => false
        ));

        if ( is_wp_error( $response ) ) {
            return false;
        }

        $response_body = wp_remote_retrieve_body( $response );
        $result = json_decode( $response_body, true );

        return isset( $result['recId'] );
    }
}