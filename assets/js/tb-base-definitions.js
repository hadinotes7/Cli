jQuery(document).ready(function($) {
    
    let currentType = 'therapy_area';
    let currentPage = 1;

    TBCore.initCustomSelect($('#tb-per-page'));
    TBCore.renderCustomSelect($('#tb-per-page'));
    
    // راه‌اندازی Custom Select برای ماهیت کانال
    TBCore.initCustomSelect($('#tb_item_channel_nature'));
    TBCore.renderCustomSelect($('#tb_item_channel_nature'));

    $('#tb-per-page').on('change', function() {
        currentPage = 1;
        loadBaseItems();
    });

    $('.tb-inner-tab-btn').on('click', function(e) {
        e.preventDefault();
        if ($(this).hasClass('active')) return;

        $('.tb-inner-tab-btn').removeClass('active');
        $(this).addClass('active');

        currentType = $(this).data('type');
        const title = $(this).data('title');

        $('#tb-add-label').text(title);
        $('#tb-modal-dynamic-title').text(title);
        $('.tb-dynamic-label').text(title);

        // نمایش یا مخفی کردن فیلد ماهیت کانال
        if (currentType === 'channel') {
            $('#wrapper_channel_nature').show();
        } else {
            $('#wrapper_channel_nature').hide();
        }

        $('#tb-search-input').val('');
        $('#tb-search-clear').hide();
        currentPage = 1;
        loadBaseItems();
    });

    $('#tb-toggle-deleted').on('change', function() {
        currentPage = 1;
        loadBaseItems();
    });

    let searchTimeout;
    $('#tb-search-input').on('input', function() {
        clearTimeout(searchTimeout);
        const val = $(this).val();
        if (val !== '') $('#tb-search-clear').show();
        else $('#tb-search-clear').hide();

        searchTimeout = setTimeout(() => {
            currentPage = 1;
            loadBaseItems();
        }, 400);
    });

    $('#tb-search-clear').on('click', function() {
        $('#tb-search-input').val('');
        $(this).hide();
        currentPage = 1;
        loadBaseItems();
    });

    $(document).on('click', '#tb-pagination .tb-page-btn', function() {
        currentPage = $(this).data('page');
        loadBaseItems();
    });

    function loadBaseItems() {
        const showDeleted = $('#tb-toggle-deleted').is(':checked');
        const search = $('#tb-search-input').val();
        const perPage = $('#tb-per-page').val();
        const $tbody = $('#tb-base-table-body');
        const $pagination = $('#tb-pagination');
        
        $tbody.html('<tr class="tb-empty-row"><td colspan="4" class="text-center py-4"><span class="spinner-border spinner-border-sm text-primary"></span> در حال بارگذاری...</td></tr>');

        $.post(TB_Admin.ajaxurl, {
            action: 'tb_get_base_items',
            security: TB_Admin.nonce,
            type: currentType,
            show_deleted: showDeleted,
            search: search,
            per_page: perPage,
            paged: currentPage
        }, function(res) {
            if (res.success) {
                $tbody.empty();
                $pagination.empty();

                if (res.data.items.length === 0) {
                    $tbody.html('<tr class="tb-empty-row"><td colspan="4" class="text-center text-muted py-4">هیچ رکوردی یافت نشد.</td></tr>');
                    return;
                }

                res.data.items.forEach(item => {
                    const isDeleted = item.is_active == 0;
                    const textClass = isDeleted ? 'deleted-text' : '';
                    
                    let actionBtns = '';
                    if (isDeleted) {
                        actionBtns = `<button class="tb-action-btn tb-btn-restore" data-id="${item.id}" title="بازیابی">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>
                        </button>`;
                    } else {
                        actionBtns = `
                        <button class="tb-action-btn tb-btn-edit" data-id="${item.id}" data-name="${item.name}" data-desc="${item.description}" data-nature="${item.channel_nature || ''}" title="ویرایش">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" /></svg>
                        </button>
                        <button class="tb-action-btn tb-btn-delete-base" data-id="${item.id}" title="حذف">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="2" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" /></svg>
                        </button>`;
                    }

                    // نمایش ماهیت کانال در جدول (فقط برای تب کانال)
                    let natureBadge = '';
                    if (currentType === 'channel' && item.channel_nature) {
                        let natureText = item.channel_nature === 'online' ? 'آنلاین' : (item.channel_nature === 'inperson' ? 'حضوری' : 'تلفنی');
                        let natureColor = item.channel_nature === 'online' ? '#229AF0' : (item.channel_nature === 'inperson' ? '#4CAF50' : '#f59e0b');
                        natureBadge = `<br><span style="font-size:10px; background:${natureColor}20; color:${natureColor}; padding:2px 6px; border-radius:4px; margin-top:4px; display:inline-block;">ماهیت: ${natureText}</span>`;
                    }

                    $tbody.append(`
                        <tr>
                            <td style="text-align: center;" class="tb-col-code" dir="ltr">${TBCore.toPersianNum(item.code)}</td>
                            <td style="text-align: right;" class="tb-col-name ${textClass}">${item.name} ${natureBadge}</td>
                            <td style="text-align: right;" class="tb-col-desc ${textClass}">${item.description || '-'}</td>
                            <td><div class="tb-action-btns">${actionBtns}</div></td>
                        </tr>
                    `);
                });

                if (res.data.total_pages > 1) {
                    for (let i = 1; i <= res.data.total_pages; i++) {
                        const activeClass = i === res.data.paged ? 'active' : '';
                        $pagination.append(`<button class="tb-page-btn ${activeClass}" data-page="${i}">${TBCore.toPersianNum(i)}</button>`);
                    }
                }
            }
        });
    }

    $('#tb-btn-add-base').on('click', function() {
        $('#tb_item_id').val(0);
        $('#tb_item_name').val('');
        $('#tb_item_desc').val('');
        $('#tb_item_channel_nature').val('').trigger('change');
        TBCore.renderCustomSelect($('#tb_item_channel_nature'));
        $('.tb-inline-error').remove();
        $('#tb-base-modal').css('display', 'flex');
    });

    $(document).on('click', '.tb-btn-edit', function() {
        $('#tb_item_id').val($(this).data('id'));
        $('#tb_item_name').val($(this).data('name'));
        $('#tb_item_desc').val($(this).data('desc'));
        
        if (currentType === 'channel') {
            $('#tb_item_channel_nature').val($(this).data('nature')).trigger('change');
            TBCore.renderCustomSelect($('#tb_item_channel_nature'));
        }

        $('.tb-inline-error').remove();
        $('#tb-base-modal').css('display', 'flex');
    });

    $('#tb_item_name, #tb_item_channel_nature').on('input change', function() {
        $(this).closest('.position-relative').find('.tb-inline-error').slideUp(200, function(){ $(this).remove(); });
    });

    $('#tb-btn-save-item').on('click', function() {
        const id = $('#tb_item_id').val();
        const name = $('#tb_item_name').val().trim();
        const desc = $('#tb_item_desc').val().trim();
        const nature = currentType === 'channel' ? $('#tb_item_channel_nature').val() : '';
        const $btn = $(this);

        $('.tb-inline-error').remove();

        let hasError = false;
        if (name === '') { 
            TBCore.showInlineError($('#tb_item_name'), 'لطفاً نام را وارد کنید.');
            hasError = true;
        }
        if (currentType === 'channel' && nature === '') {
            TBCore.showInlineError($('#tb_item_channel_nature'), 'لطفاً ماهیت کانال را انتخاب کنید.');
            hasError = true;
        }

        if (hasError) return;

        $btn.prop('disabled', true).text('در حال ذخیره...');

        function sendSaveRequest(forceRestore = false) {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_save_base_item',
                security: TB_Admin.nonce,
                id: id,
                type: currentType,
                name: name,
                description: desc,
                channel_nature: nature,
                force_restore: forceRestore
            }, function(res) {
                $btn.prop('disabled', false).text('ذخیره اطلاعات');
                if (res.success) {
                    $('#tb-base-modal').fadeOut(200);
                    loadBaseItems();
                } else {
                    if (res.data.error_type === 'deleted_exists') {
                        TBCore.showConfirmModal(res.data.message, 'بله، بازیابی شود', 'tb-btn-success', function() {
                            sendSaveRequest(true);
                        });
                    } else {
                        TBCore.showAlertModal(res.data);
                    }
                }
            });
        }
        sendSaveRequest();
    });

    $(document).on('click', '.tb-btn-delete-base', function() {
        const id = $(this).data('id');
        TBCore.showConfirmModal('آیا از حذف این آیتم مطمئن هستید؟', 'بله، حذف شود', 'tb-btn-danger', function() {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_delete_base_item',
                security: TB_Admin.nonce,
                id: id
            }, function(res) {
                if (res.success) loadBaseItems();
            });
        });
    });

    $(document).on('click', '.tb-btn-restore', function() {
        const id = $(this).data('id');
        TBCore.showConfirmModal('آیا مایل به بازیابی این آیتم هستید؟', 'بله، بازیابی شود', 'tb-btn-success', function() {
            $.post(TB_Admin.ajaxurl, {
                action: 'tb_restore_base_item',
                security: TB_Admin.nonce,
                id: id
            }, function(res) {
                if (res.success) loadBaseItems();
            });
        });
    });

    // لود اولیه
    loadBaseItems();
});