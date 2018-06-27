import CSV from 'comma-separated-values/csv';
import catta from 'catta';

const api_url = 'https://api.vk.com/method/';
const api_version = 5.80;
let ad_cabinet_id = 0;
let file_content = '';
let data = [];
let request_time = 0;

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
                .then(res => res.response ? resolve(res.response) : reject(res))
                .catch(err => {
                    console.log(err);
                    reject(err);
                })
        }
    });
}


function onLoad() {
    initSelect();
    initDropzone();
}

function addCabinetsToSelect(array, select) {
    if (array.length === 0)
        select.append('<option value="0">У тебя нет активных рекламных кабинетов :(</option>');
    else
        for (let item of array)
            select.append(`<option value="${item.account_id}">${item.account_name}</option>`);
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
    }, err => console.error(err));
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

const dropzone_hover_class = 'dropzone-hover';

function onDragEnter() {
    this.classList.add(dropzone_hover_class);
}

function onDragLeave() {
    this.classList.remove(dropzone_hover_class);
}

function dragOver(e) {
    e.stopPropagation();
    e.preventDefault();
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
    const content = $('div.content');
    // noinspection JSValidateTypes
    content.children().fadeOut(400, () => {
        content.empty();
        addLoader(content);
    });
}

function removeLoader() {
    const content = $('div.content');
    // noinspection JSValidateTypes
    content.children().fadeOut(600, () => content.empty());
}

function work() {
    if (ad_cabinet_id && file_content) {
        showLoader();
        parseCsv();
        getAds()
            .then(vk_ads => {
                addAdNamesToData(vk_ads);
                getAdsStats(getAdIds()).then(res => {
                    addSpentsToData(res);
                    removeAdsFromData();
                    addCplToData();
                    removeLoader();
                    console.log(data);
                });
            });
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

function check_files(files) {
    return !files.length ? 'Перетащи файл'
        : !files[0].name.endsWith('.csv') ? 'Неверный файл!\nУ него расширение не .csv'
            : '';
}

function safe_get_file(dataTransfer) {
    const files = dataTransfer.files;
    const error = check_files(files);
    if (error) {
        alert(error);
        throw new Error(error);
    }
    return files[0];
}

function changeStyles() {
    const dropzone = $('#dropzone');
    dropzone.removeClass('dropzone-hover');
    dropzone.addClass('dropzone-dropped');
}

function onDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    changeStyles();
    readFile(safe_get_file(e.dataTransfer));
}

function initDropzone() {
    const dropzone = document.getElementById("dropzone");
    dropzone.addEventListener("dragenter", onDragEnter);
    dropzone.addEventListener("dragleave", onDragLeave);
    dropzone.addEventListener("dragover", dragOver);
    dropzone.addEventListener("drop", onDrop);
}

$(document).ready(onLoad);
