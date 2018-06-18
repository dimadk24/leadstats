import CSV from 'comma-separated-values/csv';

// https://oauth.vk.com/authorize?client_id=6604233&redirect_uri=https://oauth.vk.com/blank.html&display=page&scope=ads,offline&response_type=token&v=5.80
const access_token = '6394fa6452639c9cda1e7ba29814dd0d87eee20a70f90be286b8008fa1eaf789f42f0bea6a79c4fd692b5';
const api_url = 'https://api.vk.com/method/';
const api_version = 5.80;
let ad_cabinet_id = 0;
let file_content = '';

function vk(method, data, callback) {
    data.access_token = access_token;
    data.version = api_version;
    $.ajax(api_url + method, {
        method: 'POST',
        dataType: 'jsonp',
        data: data,
        success: data => callback(data.response)
    })
}


function onLoad() {
    initSelect();
    initDropzone();
}

function loadSelectData() {
    vk('ads.getAccounts', {}, function (accounts) {
        $('option#placeholder').remove();
        for (let account of accounts) {
            // noinspection JSUnresolvedVariable
            $('select#ad-acc-select')
                .append(`<option value="${account.account_id}">${account.account_name}</option>`);
        }
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

function work() {
    if (ad_cabinet_id && file_content) {
        let csv = new CSV(remove_header(file_content), {'header': true});
        console.log(csv.parse());
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
    reader.readAsText(file)
}

function safe_get_file(dataTransfer) {
    const files = dataTransfer.files;
    let error = '';
    if (!files.length) {
        error = 'Перетащи файл';
    }
    if (!files[0].name.endsWith('.csv')) {
        error = 'Неверный файл!\nУ него расширение не .csv';
    }
    if (error) {
        alert(error);
        throw new Error(error);
    }
    return files[0]
}

function onDrop(e) {
    e.stopPropagation();
    e.preventDefault();
    // noinspection JSUnresolvedVariable
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
