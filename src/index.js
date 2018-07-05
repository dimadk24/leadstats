import CSV from 'comma-separated-values/csv';
import catta from 'catta';
import swal from 'sweetalert';
import flatpickr from 'flatpickr';
import {Russian} from 'flatpickr/dist/l10n/ru'

flatpickr.localize(Russian);

const api_url = 'https://api.vk.com/method/';
const api_version = 5.80;
let ad_cabinet_id = 0;
let file_content = '';
let data = [];
let request_time = 0;
let license_checked = false;
let legal;
const legal_user_ids = getLegalUserIds();
const connect_dev_link = 'https://vk.me/dimadk24';
let adAccounts = [];
let agencyClient;
let statsRange;
let calendarInput;

function getLegalUserIds() {
    const user_ids = [['1', '5', '9', '2', '0', '4', '0', '9', '8'],
        ['8', '3', '8', '1', '4', '3', '7', '5']];
    return user_ids.map(convertLegalUserId);
}

function convertLegalUserId(numbers_array) {
    let id = '';
    for (let number of numbers_array) {
        id += number;
    }
    return +id;
}

function getErrorText(error_code) {
    const errors = {
        1: 'Неизвестная для ВК ошибка. Попробуй позже',
        5: 'Авторизация не удалась, обнови токен доступа.\n' +
        'Как это сделать читай в ReadMe',
        6: 'Слишком много запросов в секунду',
        7: 'Нет прав для выполнения данного действия',
        9: 'Слишком много однотипных действий',
        10: 'Внутренняя ошибка ВК. Попробуй позже',
        14: 'Требуется ввод капчи, но ее обработка не сделана',
        15: 'Доступ к контенту запрещен',
        17: 'Требуется валидация пользователя',
        29: 'Достигнут количественный лимит ВК',
        600: 'Нет прав на выполнения этого действия с РК',
        601: 'Превышено количество запросов за день.\nПопробуй позже',
        603: 'Произошла ошибка при работе с РК'
    };
    const error_text = errors[error_code];
    return error_text ? error_text : 'Неизвестная ошибка';
}

function vk(options) {
    let data = options.data || {};
    data.access_token = access_token;
    data.version = api_version;
    return new Promise((resolve, reject) => {
        const now = Date.now();
        const difference = now - request_time;
        if (request_time && difference < 500) setTimeout(request, difference);
        else request();

        function request() {
            request_time = now;
            // noinspection JSUnresolvedFunction
            catta({
                type: 'jsonp', timeout: 2,
                url: api_url + options.method, data: data,
            })
                .then(res => {
                    if (res.response) {
                        resolve(res.response)
                    } else {
                        const error_code = res.error.error_code;
                        const error_message = res.error.error_msg;
                        const error_nice_text = getErrorText(error_code);
                        showErrorAlert({
                            title: 'Возникла ошибка при работе с ВК',
                            text: error_nice_text
                        });
                        console.error(res.error);
                        throw new Error(`#${error_code}: ${error_message}`);
                    }
                }, err => {
                    showErrorAlert({text: 'Сетевая ошибка.\nПроверь соединие с Интернетом'});
                    console.log(err);
                    reject(err);
                })
        }
    });
}

function getUserVkData() {
    return new Promise(resolve => vk({
        method: 'users.get'
    }).then(res => resolve(res[0])));
}

function showBuyAlert() {
    let text = document.createElement('div');
    text.innerHTML = '<p>Опробуй ее бесплатно перед покупкой!</p>' +
        '<p>Напиши <a href="https://vk.com/dimadk24">разработчику</a> и получи</p>' +
        '<p><span class="free-trial">Бесплатный тестовый доступ</span></p>';
    swal({
        icon: 'warning',
        title: 'Упс, эта программа платная',
        content: {
            element: text
        },
        button: {
            text: 'Получить',
            value: true,
            className: 'get-free-trial-button',
            closeModal: false
        }
    }).then(value => {
        if (value)
            window.location.href = connect_dev_link;
    });
}

function verifyLicense() {
    getUserVkData()
        .then(data => {
            const user_vk_id = data.uid || data.id;
            legal = legal_user_ids.includes(user_vk_id);
            if (!legal)
                showBuyAlert();
            license_checked = true;
        });
}

function initCalendars() {
    calendarInput = flatpickr('#calendar-input', {
        mode: 'range',
        dateFormat: 'j.m.Y'
    });
}

function checkInputs() {
    let error;
    if (!ad_cabinet_id)
        error = 'Не выбран кабинет.\nВыбери его сверху';
    else if (!file_content)
        error = 'Не выбран файл от Анкет.\nПеретащи или выбери его';
    return error;
}

function getDatesRange() {
    const selectedDates = calendarInput.selectedDates;
    return selectedDates ? selectedDates : undefined;
}

function onStart() {
    statsRange = getDatesRange();
    const error = checkInputs();
    if (error)
        showErrorAlert({text: error});
    else {
        if (license_checked) {
            if (!legal)
                showBuyAlert();
        } else
            verifyLicense();
        if (legal)
            work();
    }
}

function onLoad() {
    verifyLicense();
    initSelect();
    initDropzone();
    initCalendars();
    $('button.start').on('click', onStart);
}

function convertCabinetsToOptions(array) {
    return array.map(item => {
        return {name: item.account_name, id: item.account_id}
    });
}

function addCabinetsToSelect(array, select) {
    let optionArray = convertCabinetsToOptions(array);
    if (optionArray.length === 0)
        optionArray.push({name: 'У тебя нет активных рекламных кабинетов :(', id: 0});
    addItemsToSelect(optionArray, select);
}

function addItemsToSelect(array, select) {
    const options = array.map(item => new Option(item.name, item.id, false, false));
    select.append(...options).trigger('change');
}

function filterCabinets(array) {
    array = array.filter(item =>
        item.account_status && ['admin', 'manager'].includes(item.access_role)
    );
    return array;
}

function setAdAccounts(array) {
    adAccounts = array.map(item => {
        return {id: item.account_id, type: item.account_type}
    });
}

function removePlaceholderOption() {
    $('option#placeholder').remove();
}

function addPlaceholderOption() {
    $('select#ad-acc-select').html(
        '<option id="placeholder" value="0">Загружаю клиентов кабинета</option>'
    );
}

function loadSelectData() {
    vk({method: 'ads.getAccounts'})
        .then(accounts => {
            removePlaceholderOption();
            accounts = filterCabinets(accounts);
            setAdAccounts(accounts);
            addCabinetsToSelect(accounts, $('select#ad-acc-select'));
        });
}

function cabinetIsAgency(cabinet_id) {
    const cabinet_obj = adAccounts.find(acc => acc.id === parseInt(cabinet_id));
    return cabinet_obj.type === 'agency'
}

function removeUselessAgencyClientStuff(item) {
    return {name: item.name, id: item.id}
}

function getAgencyClients(accountId) {
    return new Promise(
        resolve => vk({
            method: 'ads.getClients',
            data: {account_id: accountId}
        })
            .then(res => resolve(res.map(removeUselessAgencyClientStuff)))
    );
}

function onCabinetSelect(e, select) {
    ad_cabinet_id = e.params.data.id;
    if (cabinetIsAgency(ad_cabinet_id)) {
        select.html('');
        addPlaceholderOption();
        getAgencyClients(ad_cabinet_id)
            .then(clients => {
                select.off('select2:select');
                $('label[for="ad-acc-select"]').html('Выбери клиента агентского кабинета:');
                removePlaceholderOption();
                addItemsToSelect(clients, select);
                if (clients.length === 1)
                    agencyClient = clients[0].id;
                else
                    select.on('select2:select', e => agencyClient = e.params.data.id);
            });
    }
}

function initSelect() {
    const select = $('select#ad-acc-select');
    select.select2({placeholder: "Выбрать", language: "ru"});
    loadSelectData();
    select.on('select2:select', (e) => onCabinetSelect(e, select));
}

function removeShit(str) {
    return str.includes('&') ? str.split('&', 1)[0] : str;
}

function getAds(campaigns) {
    const data = {
        account_id: ad_cabinet_id,
        campaign_ids: JSON.stringify(campaigns),
        include_deleted: 0,
    };
    if (agencyClient)
        data.client_id = agencyClient;
    return vk({
        method: 'ads.getAds',
        data: data
    });
}

function convertRecord(obj) {
    let new_obj = {};
    new_obj.utm_1 = removeShit(obj.utm_1).replace(/^\D+/g, '');
    new_obj.utm_2 = removeShit(obj.utm_2);
    new_obj.str_utm = new_obj.utm_1 + new_obj.utm_2;
    new_obj.count = 1;
    return new_obj;
}

function formatDate4VK(dateObj) {
    return flatpickr.formatDate(dateObj, "Y-m-d");
}

function convertDatesRange4VK(dateRange) {
    if (dateRange.length === 0)
        return [0, 0];
    else
        return dateRange.map(date => formatDate4VK(date));
}

function getAdsStats(ads) {
    const vkStatsRange = convertDatesRange4VK(statsRange);
    const period = statsRange.length ? 'day' : 'overall';
    const data = {
        account_id: ad_cabinet_id,
        ids_type: 'ad',
        ids: JSON.stringify(ads),
        period: period,
        date_from: vkStatsRange[0],
        date_to: vkStatsRange[1],
    };
    if (agencyClient)
        data.client_id = agencyClient;
    return vk({
        method: 'ads.getStatistics',
        data: data
    });
}

function getAdIds(data) {
    let ids = new Set();
    for (let record of data) {
        for (let ad of record.ads) {
            ids.add(ad)
        }
    }
    return [...ids];
}

function addToData(record) {
    record = convertRecord(record);
    const found_record = data.find(item => item.str_utm === record.str_utm);
    found_record ? found_record.count++ : data.push(record);
}

function parseCsv() {
    // noinspection JSUnresolvedFunction
    const csv = new CSV(remove_header(file_content), {header: true, cast: false}).parse();
    csv.forEach(addToData);
}

function addAdsToData(ads) {
    for (let record of data) {
        record.ads = [];
        if (record.utm_1 && record.utm_2) {
            for (let ad of ads) {
                if (record.campaigns.includes(ad.campaign_id) &&
                    ad.name.includes(record.str_utm)
                ) {
                    record.ads.push(parseInt(ad.id));
                }
            }
        }
    }
}

function addSpentsToData(vk_stats) {
    for (let record of data) {
        record.spent = 0.0;
        if (record.utm_1 && record.utm_2) {
            for (let ad_stats of vk_stats) {
                if (record.ads.includes(ad_stats.id)) {
                    let spent = 0.0;
                    if (ad_stats.stats.length)
                        for (let stat of ad_stats.stats) {
                            spent += parseFloat(stat.spent || 0);
                        }
                    record.spent += spent;
                }
            }
            record.spent = +record.spent.toFixed(2);
        }
    }
}

function removeAdsFromData(data) {
    for (let record of data) {
        record.ads = undefined;
    }
}

function addCplToData(data) {
    // noinspection JSUnusedAssignment
    data = data.map(record => {
        if (record.utm_1 && record.utm_2) {
            record.cpl = +(record.spent / record.count).toFixed(2);
        } else
            record.cpl = 0;
        return record
    });
}

function addLoader(elem) {
    let wrapper = $('<div class="loading"></div>');
    let loading = $('<div class="sk-circle"></div>');
    let inner_html = '';
    for (let i = 1; i <= 12; i++) {
        inner_html += '<div class="sk-circle' + i.toString() + ' sk-child"></div>'
    }
    loading.html(inner_html);
    wrapper.html(loading);
    elem.html(wrapper);
}

function showLoader() {
    const main = $('main');
    // noinspection JSValidateTypes
    main.children().fadeOut(400, () => {
        main.empty();
        addLoader(main);
    });
}

function removeLoader() {
    return new Promise((resolve) => {
        const main = $('main');
        // noinspection JSValidateTypes
        main.children().fadeOut(600, () => {
            main.empty();
            resolve();
        });
    })
}

function initTable() {
    const table = "<table id='data-table' class='display'><thead><tr>" +
        "<th>UTM 1</th><th>UTM 2</th><th>Количество лидов</th><th>Потрачено</th><th>CPL</th>" +
        "</tr></thead><tbody></tbody></table>";
    $('main').html(table);
    $('#data-table').DataTable({
        language: {
            "processing": "Подождите...",
            "search": "Поиск:",
            "lengthMenu": "Показать _MENU_ записей",
            "info": "Записи с _START_ до _END_ из _TOTAL_ записей",
            "infoEmpty": "Записи с 0 до 0 из 0 записей",
            "infoFiltered": "(отфильтровано из _MAX_ записей)",
            "infoPostFix": "",
            "loadingRecords": "Загрузка записей...",
            "zeroRecords": "Записи отсутствуют.",
            "emptyTable": "В таблице отсутствуют данные",
            "paginate": {
                "first": "Первая",
                "previous": "Предыдущая",
                "next": "Следующая",
                "last": "Последняя"
            },
            "aria": {
                "sortAscending": ": активировать для сортировки столбца по возрастанию",
                "sortDescending": ": активировать для сортировки столбца по убыванию"
            }
        },
        data: data,
        columnDefs: [
            {targets: '_all', className: 'dt-center'},
            {targets: [2, 3, 4], searchable: false}
        ],
        columns: [
            {data: 'utm_1'},
            {data: 'utm_2'},
            {data: 'count'},
            {data: 'spent'},
            {data: 'cpl'}
        ]
    });
}

function showErrorAlert(options) {
    options = options || {};
    options.title = options.title || 'Ошибка';
    options.icon = 'error';
    return swal(options);
}

function removeUselessCampaignStuff(campaign) {
    return {
        id: campaign.id,
        name: campaign.name
    }
}

function filterCampaigns(campaigns) {
    return campaigns.filter(
        campaign => ['normal', 'promoted_posts'].includes(campaign.type)
    );
}

function getCampaigns() {
    let data = {
        account_id: ad_cabinet_id,
        include_deleted: 0,
    };
    if (agencyClient)
        data.client_id = agencyClient;
    return new Promise(
        (resolve, reject) =>
            vk({
                method: 'ads.getCampaigns',
                data: data
            })
                .then(res => {
                    resolve(filterCampaigns(res).map(removeUselessCampaignStuff));
                })
    );
}

function addCampaignsToData(campaigns) {
    for (let record of data) {
        record.campaigns = [];
        if (record.utm_1 && record.utm_2) {
            for (let campaign of campaigns) {
                if (campaign.name.includes(record.utm_1))
                    record.campaigns.push(campaign.id);
            }
        }
    }
}

function getCampaignIds(data) {
    let ids = new Set();
    for (let record of data)
        for (let campaign of record.campaigns)
            ids.add(campaign);
    return [...ids];
}

function removeCampaigns(data) {
    // noinspection JSUnusedAssignment
    data = data.map(record => record.campaigns = undefined);
}

function work() {
    showLoader();
    parseCsv();
    getCampaigns()
        .then(campaigns => {
            addCampaignsToData(campaigns);
            return getAds(getCampaignIds(data));
        })
        .then(ads => {
            addAdsToData(ads);
            console.log(data);
            removeCampaigns(data);
            const adIds = getAdIds(data);
            if (!adIds.length) {
                showErrorAlert({
                    text: "Нет объявлений, подходящих под условия.\n" +
                    'Читай в ReadMe, как связываются объявления и лиды'
                })
                    .then(() => removeLoader());
                throw new Error('No ads');
            } else
                return getAdsStats(adIds);
        })
        .then(res => {
            addSpentsToData(res);
            removeAdsFromData(data);
            addCplToData(data);
            return removeLoader();
        })
        .then(() => initTable())
        .catch(err => console.error(err));
}

function remove_header(text) {
    return text.split('\n\n')[1]
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = e => file_content = e.target.result;
    reader.readAsText(file, 'cp1251')
}

function check_file(file) {
    return !file.name.endsWith('.csv') ? 'Неверный файл!\nУ него расширение не .csv' : '';
}

function safe_check_file(file) {
    const error = check_file(file);
    if (error) {
        showErrorAlert({text: error});
        throw new Error(error);
    }
    return file;
}

const dropzone_hover_class = 'hover';
const dropzone_dropped_class = 'dropped';

function removeDroppedClass($elem) {
    $elem.removeClass(dropzone_dropped_class);
}

function handleFileAndClasses($elem) {
    $elem.addClass(dropzone_dropped_class);
    let file;
    try {
        file = safe_check_file($('input.file-input')[0].files[0]);
    } catch (e) {
        removeDroppedClass($elem);
        throw e;
    }
    readFile(file);
}

function onFileInputChange() {
    const $elem = $('#dropzone');
    $elem.removeClass(dropzone_hover_class);
    if (!this.files[0]) {
        removeDroppedClass($elem);
    }
    else {
        handleFileAndClasses($elem);
    }
}

function initDropzone() {
    const dropzone = document.getElementById("dropzone");
    dropzone.addEventListener("dragenter", () => dropzone.classList.add(dropzone_hover_class));
    dropzone.addEventListener("dragleave", () => dropzone.classList.remove(dropzone_hover_class));
    $('input.file-input')[0].addEventListener("change", onFileInputChange);
}

$(document).ready(onLoad);