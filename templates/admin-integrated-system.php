<?php if ( ! defined( 'ABSPATH' ) ) exit; ?>

<div class="tb-wrap" dir="rtl">
    <div class="tb-header-section">
        <h2 class="tb-page-title">سیستم یکپارچه مدیریت کلینیک</h2>
        <p class="tb-page-subtitle">مدیریت جامع تعاریف، پرسنل، قراردادها، تقویم و امور مالی</p>
    </div>

    <!-- تب‌های کپسولی اصلی -->
    <div class="tb-capsule-tabs-wrapper">
        <div class="tb-capsule-tabs">
            <button class="tb-tab-btn active" data-target="tab-base-info">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6a7.5 7.5 0 107.5 7.5h-7.5V6z" /><path stroke-linecap="round" stroke-linejoin="round" d="M13.5 10.5H21A7.5 7.5 0 0013.5 3v7.5z" /></svg>
                تعاریف پایه
            </button>
            <button class="tb-tab-btn" data-target="tab-therapists">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" /></svg>
                درمانگران و مدرسان
            </button>
            <button class="tb-tab-btn" data-target="tab-therapy-calendar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 2.25h.008v.008H12v-.008zM9.75 15h.008v.008H9.75V15zm0 2.25h.008v.008H9.75v-.008zM7.5 15h.008v.008H7.5V15zm0 2.25h.008v.008H7.5v-.008zm6.75-4.5h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V15zm0 2.25h.008v.008h-.008v-.008zm2.25-4.5h.008v.008H16.5v-.008zm0 2.25h.008v.008H16.5V15z" /></svg>
                تقویم روان‌درمانی
            </button>
            
            <!-- 👈 تب جدید: تقویم دوره‌های آموزشی -->
            <button class="tb-tab-btn" data-target="tab-course-calendar">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M4.26 10.147a60.436 60.436 0 00-.491 6.347A48.627 48.627 0 0112 20.904a48.627 48.627 0 018.232-4.41 60.46 60.46 0 00-.491-6.347m-15.482 0a50.57 50.57 0 00-2.658-.813A59.905 59.905 0 0112 3.493a59.902 59.902 0 0110.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.697 50.697 0 0112 13.489a50.702 50.702 0 017.74-3.342M6.75 15a.75.75 0 100-1.5.75.75 0 000 1.5zm0 0v-3.675A55.378 55.378 0 0112 8.443m-7.007 11.55A5.981 5.981 0 006.75 15.75v-1.5" /></svg>
                تقویم دوره‌های آموزشی
            </button>
            
            <button class="tb-tab-btn" data-target="tab-technical-settings">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.203-.107-.397.165-.71.505-.781.929l-.149.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.505-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.107-1.204l-.527-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" /><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                تنظیمات فنی
            </button>
        </div>
    </div>

    <div class="tb-tab-content-container">
        <!-- فراخوانی ماژول اطلاعات پایه (فاز ۲) -->
        <?php include TB_DIR . 'templates/integrated/base-info.php'; ?>
        
        <!-- فراخوانی ماژول درمانگران و مدرسان (فاز ۳) -->
        <?php include TB_DIR . 'templates/integrated/therapists.php'; ?>

        <!-- فراخوانی ماژول تقویم کاری جلسات روان‌درمانی (فاز ۴) -->
        <?php include TB_DIR . 'templates/integrated/admin-therapy-calendar.php'; ?>
        
        <!-- 👈 فراخوانی ماژول تقویم دوره‌های آموزشی (فاز جدید) -->
        <?php include TB_DIR . 'templates/integrated/admin-course-calendar.php'; ?>

        <!-- فراخوانی ماژول تنظیمات فنی -->
        <?php include TB_DIR . 'templates/integrated/admin-technical-settings.php'; ?>
    </div>
</div>

<!-- مودال‌های تایید و هشدار (مشترک برای تمام ماژول‌ها) -->
<div id="tb-confirm-modal" class="tb-modal-overlay">
    <div class="tb-confirm-box">
        <div class="tb-confirm-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
        <p id="tb-confirm-text" class="tb-confirm-text">آیا مطمئن هستید؟</p>
        <div class="tb-confirm-actions">
            <button id="tb-btn-confirm-no" class="tb-btn-cancel">انصراف</button>
            <button id="tb-btn-confirm-yes" class="tb-btn-danger">بله</button>
        </div>
    </div>
</div>

<div id="tb-alert-modal" class="tb-modal-overlay" style="z-index: 999999;">
    <div class="tb-confirm-box">
        <div class="tb-alert-icon"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg></div>
        <p id="tb-alert-text" class="tb-confirm-text">پیام خطا</p>
        <div class="tb-confirm-actions">
            <button id="tb-btn-alert-ok" class="tb-btn-cancel w-100">متوجه شدم</button>
        </div>
    </div>
</div>