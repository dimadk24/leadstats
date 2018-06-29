import CSV from 'comma-separated-values/csv';
import catta from 'catta';
import swal from 'sweetalert';

const api_url = 'https://api.vk.com/method/';
const api_version = 5.80;
let ad_cabinet_id = 0;
let file_content = '';
let data = [];
let request_time = 0;
let license_checked = false;
let legal;
const legal_user_id = getLegalUserId();
const connect_dev_link = 'https://vk.me/dimadk24';

function getLegalUserId() {
    const numbers = ['1', '5', '9', '2', '0', '4', '0', '9', '8'];
    let id = '';
    for (let number of numbers) {
        id += number;
    }
    return +id;
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
                .then(res => res.response ? resolve(res.response) : reject(res),
                    err => {
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
            legal = user_vk_id === legal_user_id;
            if (!legal)
                showBuyAlert();
            license_checked = true;
        });
}

function onLoad() {
    verifyLicense();
    initSelect();
    initDropzone();
}

function addCabinetsToSelect(array, select) {
    let new_options = [];
    if (array.length === 0)
        new_options.push(
            new Option('У тебя нет активных рекламных кабинетов :(', 0, false, false)
        );
    else
        new_options = array.map(
            item => new Option(item.account_name, item.account_id, false, false)
        );
    select.append(...new_options).trigger('change');
}

function addLoadedData(array) {
    array = array.filter(item =>
        item.account_status && ['admin', 'manager'].includes(item.access_role)
    );
    addCabinetsToSelect(array, $('select#ad-acc-select'));
}

function loadSelectData() {
    vk({method: 'ads.getAccounts'}).then(accounts => {
        $('option#placeholder').remove();
        addLoadedData(accounts);
    });
}

function initSelect() {
    const select = $('select#ad-acc-select');
    select.select2({placeholder: "Выбрать", language: "ru"});
    loadSelectData();
    select.on('select2:select', (e) => {
        ad_cabinet_id = e.params.data.id;
        work();
    });
}

function removeShit(str) {
    return str.includes('&') ? str.split('&', 1)[0] : str;
}

function getAds() {
    return vk({
        method: 'ads.getAds',
        data: {
            account_id: ad_cabinet_id,
            include_deleted: 0,
        }
    });
}

function convertRecord(obj) {
    let new_obj = {};
    new_obj.utm_1 = removeShit(obj.utm_1).replace(/^\D+/g, '');
    new_obj.utm_2 = obj.utm_2;
    new_obj.str_utm = new_obj.utm_1 + new_obj.utm_2;
    new_obj.count = 1;
    return new_obj;
}

function getAdsStats(ads) {
    return vk({
        method: 'ads.getStatistics',
        data: {
            account_id: ad_cabinet_id,
            ids_type: 'ad',
            ids: JSON.stringify(ads),
            period: 'overall',
            date_from: 0,
            date_to: 0,
        }
    });
}

function getAdIds() {
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

function addAdNamesToData(ads) {
    for (let record of data) {
        record.ads = [];
        for (let ad of ads) {
            if (ad.name.includes(record.str_utm))
                record.ads.push(parseInt(ad.id));
        }
    }
}

function addSpentsToData(vk_stats) {
    for (let record of data) {
        record.spent = 0.0;
        for (let ad_stats of vk_stats) {
            if (record.ads.includes(ad_stats.id))
                record.spent += parseFloat(ad_stats.stats[0].spent);
        }
    }
}

function removeAdsFromData() {
    for (let record of data) {
        record.ads = undefined;
    }
}

function addCplToData() {
    data = data.map(record => {
        record.cpl = +(record.spent / record.count).toFixed(2);
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

function work() {
    if (!license_checked)
        verifyLicense();
    if (ad_cabinet_id && file_content) {
        if (legal) {
            showLoader();
            parseCsv();
            getAds()
                .then(vk_ads => {
                    addAdNamesToData(vk_ads);
                    getAdsStats(getAdIds()).then(res => {
                        addSpentsToData(res);
                        removeAdsFromData();
                        addCplToData();
                        removeLoader().then(() => initTable());
                    }, err => console.error(err));
                }, err => console.error(err));
        } else
            showBuyAlert();
    }
}

function remove_header(text) {
    return text.split('\n\n')[1]
}

function readFile(file) {
    const reader = new FileReader();
    reader.onload = (e) => {
        file_content = e.target.result;
        work();
    };
    reader.readAsText(file, 'cp1251')
}

function check_file(file) {
    return !file.name.endsWith('.csv') ? 'Неверный файл!\nУ него расширение не .csv' : '';
}

function safe_check_file(file) {
    const error = check_file(file);
    if (error) {
        swal({
            title: 'Ошибка',
            text: error,
            icon: 'error'
        });
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