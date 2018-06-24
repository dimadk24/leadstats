import CSV from 'comma-separated-values/csv';
import catta from 'catta';

const api_url = 'https://api.vk.com/method/';
const api_version = 5.80;
let ad_cabinet_id = 0;
let file_content = '';
let campaign_ids = [];
let campaigns = [];

function vk(options) {
    let data = options.data || {};
    data.access_token = access_token;
    data.version = api_version;
    // noinspection JSUnresolvedFunction
    return new Promise((resolve, reject) => catta({
        type: 'jsonp', timeout: 2,
        url: api_url + options.method, data: data,
    })
        .then(res => resolve(res.response))
        .catch(err => {
            console.log(err);
            reject(err);
        }));
}


function onLoad() {
    initSelect();
    initDropzone();
}

function addItemsToSelect(array, select) {
    for (let item of array) {
        if (item.account_status && ['admin', 'manager'].includes(item.access_role)) {
            select.append(`<option value="${item.account_id}">${item.account_name}</option>`);
        }
    }
}

function addLoadedData(array) {
    const select = $('select#ad-acc-select');
    if (array.length === 0) {
        select.append(`<option value="0">У тебя нет рекламных кабинетов :(</option>`);
    } else
        addItemsToSelect(array, select);
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

function mergeCampaignAndUtm(utm, campaign_name, campaign_id) {
    if (campaign_name.includes(utm)) {
        campaigns.push({'id': campaign_id, 'name': campaign_name, 'utm': utm});
    }
}

function removeShit(str) {
    return str.includes('&') ? str.split('&', 1)[0] : str;
}

function handleRecord(record) {
    const utm_1 = removeShit(record.utm_1);
    for (let campaign of campaign_ids) {
        mergeCampaignAndUtm(utm_1, campaign.name, campaign.id);
    }
}

function load_campaigns() {
    return new Promise((resolse, reject) => vk({
        method: 'ads.getCampaigns',
        data: {account_id: ad_cabinet_id, include_deleted: 0}
    }).then(campaign_array => {
        for (let campaign of campaign_array) {
            campaign_ids.push({id: campaign.id, name: campaign.name})
        }
        resolse(campaign_ids);
    }));
}

function mergeCampaigns(csv) {
    csv.forEach(handleRecord);
    console.log(campaigns);
}

function work() {
    if (ad_cabinet_id && file_content) {
        let csv = new CSV(remove_header(file_content), {header: true, cast: false});
        load_campaigns().then(campaign_ids => mergeCampaigns(csv.parse()));
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
